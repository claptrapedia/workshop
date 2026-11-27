import { getDb } from './db.ts'

const NO_OBJECT = 'No game object. Kept the row with this name that has one.'
const DLC_COPY = 'DLC copy of the base-game row. Kept that one.'

type Member = {
  id: string
  nameKey: string
  className: string
  path: string
  origin: string
  groupKind: string
  hasObject: boolean
}

export function applyDedupe(): number {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.id, c.name_key AS nameKey, c.class_name AS className, c.path, c.origin_hint AS origin,
              c.group_kind AS groupKind,
              EXISTS (
                SELECT 1 FROM records r
                WHERE r.candidate_id = c.id AND r.record_type = 'object'
              ) AS hasObject
       FROM candidates c`,
    )
    .all() as (Omit<Member, 'hasObject'> & { hasObject: number })[]
  const members = rows.map((row) => ({ ...row, hasObject: Number(row.hasObject) === 1 }))
  const drops = decideDrops(members)
  const insert = db.prepare(
    `INSERT INTO corrections (candidate_id, removed, dedupe_reason)
     VALUES (?, 1, ?)
     ON CONFLICT(candidate_id) DO NOTHING`,
  )
  let removed = 0
  db.exec('BEGIN')
  try {
    for (const drop of drops) {
      const result = insert.run(drop.id, drop.reason)
      removed += Number(result.changes)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  if (removed) console.log(`Moved ${removed} duplicate rows to Removed`)
  return removed
}

export function decideDrops(members: Member[]): { id: string; reason: string }[] {
  const groups = new Map<string, Member[]>()
  for (const member of members) {
    if (!member.nameKey.trim()) continue
    const key = `${member.nameKey}\0${member.className}`
    const list = groups.get(key) ?? []
    list.push(member)
    groups.set(key, list)
  }
  const drops: { id: string; reason: string }[] = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const withObject = group.filter((member) => member.hasObject)
    if (!withObject.length) continue
    const baseCores = new Set(
      withObject.filter((member) => !member.origin).map((member) => core(stem(member.path))),
    )
    const baseTokens = new Set(
      withObject
        .filter((member) => !member.origin && member.groupKind === 'weapon')
        .map((member) => weaponToken(stem(member.path))),
    )
    for (const member of group) {
      if (!member.hasObject) {
        drops.push({ id: member.id, reason: NO_OBJECT })
        continue
      }
      if (!member.origin) continue
      const piece = stem(member.path)
      if (baseCores.has(core(piece))) {
        drops.push({ id: member.id, reason: DLC_COPY })
        continue
      }
      if (member.groupKind === 'weapon' && baseTokens.has(weaponToken(piece))) {
        drops.push({ id: member.id, reason: DLC_COPY })
      }
    }
  }
  return drops
}

function stem(path: string): string {
  const dot = path.split('.').pop() ?? path
  return (dot.split(':').pop() ?? dot).toLowerCase()
}

function core(value: string): string {
  return value.replace(/^dlc\d_/, '').replace(/dlc\d_/g, '')
}

function weaponToken(value: string): string {
  return value.replace(/^dlc\d_/, '').replace(/^title[ump]?_+/, '').replace(/_+$/, '')
}
