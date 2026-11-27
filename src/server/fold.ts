import { getDb } from './db.ts'

const LEVEL =
  /^gd_elementalupgrade\.(roland|lilith|mordecai|brick)\.(corrosive|explosive|incendiary|shock)_level_(\d+)$/

type Row = { id: string; path: string; name: string }

type RecordRow = {
  record_type: string
  record_id: string
  file: string | null
  body: string | null
}

export function applyArtifactFold(): number {
  const db = getDb()
  const rows = db
    .prepare(`SELECT id, path, name FROM candidates WHERE group_kind = 'artifact'`)
    .all() as Row[]
  const groups = new Map<string, { level: number; row: Row }[]>()
  for (const row of rows) {
    const match = LEVEL.exec(row.path)
    if (!match) continue
    const key = `${match[1]}\0${match[2]}`
    const list = groups.get(key) ?? []
    list.push({ level: Number(match[3]), row })
    groups.set(key, list)
  }

  const correction = db.prepare('SELECT removed FROM corrections WHERE candidate_id = ?')
  const recordIds = db.prepare('SELECT record_id FROM records WHERE candidate_id = ?')
  const records = db.prepare(
    'SELECT record_type, record_id, file, body FROM records WHERE candidate_id = ? ORDER BY sort',
  )
  const nextSort = db.prepare(
    'SELECT COALESCE(MAX(sort), -1) AS sort FROM records WHERE candidate_id = ?',
  )
  const insertRecord = db.prepare(
    `INSERT INTO records (candidate_id, sort, record_type, record_id, file, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const remove = db.prepare(
    `INSERT INTO corrections (candidate_id, removed, dedupe_reason)
     VALUES (?, 1, ?)
     ON CONFLICT(candidate_id) DO NOTHING`,
  )
  const rename = db.prepare('UPDATE candidates SET name = ?, name_key = ? WHERE id = ?')

  let folded = 0
  db.exec('BEGIN')
  try {
    for (const list of groups.values()) {
      list.sort((a, b) => a.level - b.level)
      const keeper = list[0]
      if (!keeper) continue
      const plain = keeper.row.name.replace(/ \d+$/, '')
      rename.run(plain, plain.trim().toLowerCase().replace(/\s+/g, ' '), keeper.row.id)
      const have = new Set(
        (recordIds.all(keeper.row.id) as { record_id: string }[]).map((record) => record.record_id),
      )
      let sort = Number((nextSort.get(keeper.row.id) as { sort: number }).sort)
      for (const member of list.slice(1)) {
        const prior = correction.get(member.row.id) as { removed: number } | undefined
        if (prior && Number(prior.removed) === 0) continue
        const reason = `Level ${member.level} of ${plain}. The levels sit on that one row.`
        const result = remove.run(member.row.id, reason)
        const inserted = Number(result.changes) > 0
        if (!inserted && !(prior && Number(prior.removed) === 1)) continue
        if (inserted) folded += 1
        for (const record of records.all(member.row.id) as RecordRow[]) {
          if (have.has(record.record_id)) continue
          sort += 1
          insertRecord.run(
            keeper.row.id,
            sort,
            record.record_type,
            record.record_id,
            record.file,
            record.body,
          )
          have.add(record.record_id)
        }
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  if (folded) console.log(`Folded ${folded} artifact levels onto the level 1 row`)
  return folded
}

type Working = {
  id: string
  name: string
  nameKey: string
  className: string
  path: string
  groupKind: string
}

const LEVEL_NAME = /^(.*?)(?:\s*-\s*level\s+(\d+)|:\s*round\s+(\d+))$/i

export function applyIdentityFold(): number {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.name_key AS nameKey, c.class_name AS className, c.path, c.group_kind AS groupKind
       FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE c.name_key != '' AND IFNULL(cor.removed, 0) = 0`,
    )
    .all() as Working[]

  const jobs: { keeper: Working; rest: Working[]; reason: (row: Working) => string; rename?: string }[] = []
  jobs.push(...enemyJobs(rows), ...levelJobs(rows), ...deleteJobs(rows), ...skillJobs(rows))

  const correction = db.prepare('SELECT removed FROM corrections WHERE candidate_id = ?')
  const recordIds = db.prepare('SELECT record_id FROM records WHERE candidate_id = ?')
  const records = db.prepare(
    'SELECT record_type, record_id, file, body FROM records WHERE candidate_id = ? ORDER BY sort',
  )
  const nextSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS sort FROM records WHERE candidate_id = ?')
  const insertRecord = db.prepare(
    `INSERT INTO records (candidate_id, sort, record_type, record_id, file, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const remove = db.prepare(
    `INSERT INTO corrections (candidate_id, removed, dedupe_reason)
     VALUES (?, 1, ?)
     ON CONFLICT(candidate_id) DO NOTHING`,
  )
  const rename = db.prepare('UPDATE candidates SET name = ?, name_key = ? WHERE id = ?')

  let folded = 0
  db.exec('BEGIN')
  try {
    for (const job of jobs) {
      if (job.rename) {
        rename.run(job.rename, job.rename.trim().toLowerCase().replace(/\s+/g, ' '), job.keeper.id)
      }
      const have = new Set(
        (recordIds.all(job.keeper.id) as { record_id: string }[]).map((record) => record.record_id),
      )
      let sort = Number((nextSort.get(job.keeper.id) as { sort: number }).sort)
      for (const member of job.rest) {
        const prior = correction.get(member.id) as { removed: number } | undefined
        if (prior && Number(prior.removed) === 0) continue
        const result = remove.run(member.id, job.reason(member))
        const inserted = Number(result.changes) > 0
        if (!inserted && !(prior && Number(prior.removed) === 1)) continue
        if (inserted) folded += 1
        for (const record of records.all(member.id) as RecordRow[]) {
          if (have.has(record.record_id)) continue
          sort += 1
          insertRecord.run(job.keeper.id, sort, record.record_type, record.record_id, record.file, record.body)
          have.add(record.record_id)
        }
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  if (folded) console.log(`Folded ${folded} copies onto the one row`)
  return folded
}

export function applyFolds(): void {
  applyArtifactFold()
  applyIdentityFold()
}

function enemyJobs(rows: Working[]): { keeper: Working; rest: Working[]; reason: (row: Working) => string }[] {
  const groups = new Map<string, Working[]>()
  for (const row of rows) {
    if (row.groupKind !== 'enemy') continue
    const key = `${row.nameKey}\0${row.path.split('.')[0]}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const jobs = []
  for (const members of groups.values()) {
    if (members.length < 2) continue
    const cluster = enemyCluster(members)
    if (!cluster || cluster.rest.length === 0) continue
    const label = cluster.keeper.name
    jobs.push({
      keeper: cluster.keeper,
      rest: cluster.rest,
      reason: () => `Another copy of ${label}. The copies sit on that one row.`,
    })
  }
  return jobs
}

function enemyCluster(members: Working[]): { keeper: Working; rest: Working[] } | null {
  const byStem = new Map(members.map((member) => [stem(member.path), member]))
  const reached = new Map<string, Working[]>()
  for (const member of members) {
    for (const core of cores(stem(member.path))) {
      const list = reached.get(core) ?? []
      list.push(member)
      reached.set(core, list)
    }
  }
  let core = ''
  for (const [name, list] of reached) {
    if (new Set(list.map((member) => member.id)).size !== members.length) continue
    if (name.length < 12) continue
    if (name.length > core.length) core = name
  }
  if (core) {
    const keeper = byStem.get(core) ?? pickNumbered(members)
    return { keeper, rest: members.filter((member) => member.id !== keeper.id) }
  }
  const stems = [...byStem.keys()]
  let prefix = stems[0] ?? ''
  for (const value of stems.slice(1)) {
    while (prefix && !value.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  if (prefix.length >= 22 && stems.every((value) => value !== prefix)) {
    const keeper = pickNumbered(members)
    return { keeper, rest: members.filter((member) => member.id !== keeper.id) }
  }
  let best: { keeper: Working; rest: Working[] } | null = null
  for (const [base, keeper] of byStem) {
    const rest = members.filter((member) => member.id !== keeper.id && variantSuffix(base, stem(member.path)))
    if (!rest.length) continue
    if (!best || rest.length > best.rest.length) best = { keeper, rest }
  }
  return best
}

function variantSuffix(base: string, other: string): boolean {
  if (!other.startsWith(base) || other.length === base.length || base.length < 16) return false
  const rest = other.slice(base.length)
  return /^(?:_?\d.*|turret|_depricated|_deprecated)$/.test(rest)
}

function levelJobs(
  rows: Working[],
): { keeper: Working; rest: Working[]; reason: (row: Working) => string; rename?: string }[] {
  const groups = new Map<string, { level: number; row: Working }[]>()
  for (const row of rows) {
    const match = LEVEL_NAME.exec(row.name.trim())
    if (!match) continue
    const level = Number(match[2] ?? match[3])
    const key = `${row.groupKind}\0${match[1].trim().toLowerCase()}`
    const list = groups.get(key) ?? []
    list.push({ level, row })
    groups.set(key, list)
  }
  const jobs: { keeper: Working; rest: Working[]; reason: (row: Working) => string; rename?: string }[] = []
  for (const list of groups.values()) {
    if (list.length < 2) continue
    list.sort((a, b) => a.level - b.level)
    const keeper = list[0]
    if (!keeper) continue
    let plain = keeper.row.name.replace(LEVEL_NAME, '$1').trim()
    if (!plain || plain === '-') plain = keeper.row.path.includes('storagedeckupgrade') ? 'Storage Deck Upgrade' : keeper.row.name
    jobs.push({
      keeper: keeper.row,
      rest: list.slice(1).map((item) => item.row),
      rename: plain,
      reason: (row) => `Level of ${plain}. The levels sit on that one row. (${row.name})`,
    })
  }
  return jobs
}

function deleteJobs(rows: Working[]): { keeper: Working; rest: Working[]; reason: (row: Working) => string }[] {
  const groups = new Map<string, Working[]>()
  for (const row of rows) {
    const key = `${row.nameKey}\0${row.className}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const jobs = []
  for (const members of groups.values()) {
    const junk = members.filter((member) => member.path.toLowerCase().includes('delete'))
    const keepers = members.filter((member) => !member.path.toLowerCase().includes('delete'))
    const keeper = keepers[0]
    if (!junk.length || !keeper || keepers.length === 0) continue
    jobs.push({
      keeper,
      rest: junk,
      reason: () => `Deleted file. Kept ${keeper.name}.`,
    })
  }
  return jobs
}

function skillJobs(rows: Working[]): { keeper: Working; rest: Working[]; reason: (row: Working) => string }[] {
  const groups = new Map<string, Working[]>()
  for (const row of rows) {
    if (row.groupKind !== 'skill') continue
    const pkg = row.path.split('.')[0] ?? ''
    const match = /^(gd_skills2_|gd_skills_)(.+)$/.exec(pkg)
    if (!match) continue
    const key = `${row.nameKey}\0${match[2]}\0${stem(row.path)}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const jobs = []
  for (const members of groups.values()) {
    const newer = members.find((member) => member.path.startsWith('gd_skills2_'))
    const older = members.filter((member) => member.path.startsWith('gd_skills_') && !member.path.startsWith('gd_skills2_'))
    if (!newer || !older.length) continue
    jobs.push({
      keeper: newer,
      rest: older,
      reason: () => `Older copy of ${newer.name}. Kept the current skill.`,
    })
  }
  return jobs
}

function stem(path: string): string {
  const dot = path.split('.').pop() ?? path
  return (dot.split(':').pop() ?? dot).toLowerCase()
}

function cores(value: string): string[] {
  const found = [value]
  let current = value
  const trail = /(_\d+|\d+|_[a-z])$/
  while (trail.test(current)) {
    current = current.replace(trail, '')
    found.push(current)
  }
  if (current.length > 1 && /[a-z]$/.test(current)) found.push(current.slice(0, -1))
  return found
}

function pickNumbered(members: Working[]): Working {
  return [...members].sort((a, b) => {
    const an = Number(/\d+$/.exec(stem(a.path))?.[0] ?? 0)
    const bn = Number(/\d+$/.exec(stem(b.path))?.[0] ?? 0)
    return an - bn || stem(a.path).length - stem(b.path).length
  })[0] as Working
}
