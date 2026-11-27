import { getDb } from './db.ts'

const DROP_REASON: Record<string, string> = {
  item: 'Mission pickup or item shell. The catalogue row is the weapon, shield, mod, or artifact.',
  equipment_name: 'Prefix or leftover title. Not its own item.',
  equipment_part: 'A part on an item, not an item.',
  equipment_balance: 'Stat balance for an item, not an item.',
  loot_pool: 'A drop table, not a catalogue row.',
  population_source: 'A spawn entry, not an enemy.',
  interactive_object: 'A crate, vendor, or switch, not a catalogue row.',
  weapon_type: 'Internal weapon type. The weapon row is the item.',
  challenge: 'Not a catalogue record.',
  contact: 'Echo caller id. Not a character.',
  npc: 'Mission placement of a person. Not a character.',
  vehicle: 'A vehicle mesh or spawn station. Not a catalogue row.',
  region: 'A game-stage region, not a location.',
  named_definition: 'A barrel or a menu definition. Not a catalogue row.',
  location_list: 'A list of fast-travel stations, not a place.',
  map_list: 'A list of maps. The map rows are the maps.',
}

const PLAYERS: Record<string, string> = {
  roland: 'Roland',
  lilith: 'Lilith',
  mordecai: 'Mordecai',
  brick: 'Brick',
}

type CullRow = {
  id: string
  groupKind: string
  className: string
  path: string
  name: string
  nameKey: string
  family: string | null
}

const NAME_FIXES: { path: string; name: string; key: string }[] = [
  { path: '%titlem_maliwan1_plague', name: 'The Plague', key: 'the plague' },
  { path: '%titlem_hyperion1_executioner', name: 'Executioner', key: 'executioner' },
  { path: '%title_damage1_driver', name: 'Driver', key: 'driver' },
  { path: '%adrenaline_brick', name: 'Adrenaline - Brick', key: 'adrenaline - brick' },
  { path: '%adrenaline_lilith', name: 'Adrenaline - Lilith', key: 'adrenaline - lilith' },
  { path: '%pawn_balance_cldriver', name: 'Lance Driver', key: 'lance driver' },
]

const COPY_ONTO: { copy: RegExp; keeper: RegExp }[] = [
  { copy: /pawn_balance_clinfantry$/, keeper: /pawn_balance_infantry$/ },
  { copy: /pawn_balance_clinfantrybadass$/, keeper: /pawn_balance_infantry_badass$/ },
  { copy: /pawn_balance_cldefender$/, keeper: /pawn_balance_lance_defender$/ },
  { copy: /pawn_balance_cldefenderbadass$/, keeper: /pawn_balance_lance_defender_badass$/ },
  { copy: /pawn_balance_clengineer$/, keeper: /pawn_balance_lance_engineer$/ },
  { copy: /pawn_balance_clengineerbadass$/, keeper: /pawn_balance_lance_engineer_badass$/ },
  { copy: /pawn_balance_clroyalguard$/, keeper: /pawn_balance_royalguard$/ },
  { copy: /frindlyguard$/, keeper: /hyperionguard$/ },
  { copy: /hyperionfriendly$/, keeper: /hyperionsoldier$/ },
  { copy: /friendlytech$/, keeper: /hyperiontech$/ },
  { copy: /gatling_friendly$/, keeper: /pawn_balance_turret_gatling$/ },
  { copy: /scythid_poison$/, keeper: /scythid_corrosive$/ },
  { copy: /bloodwingmanualreturn$/, keeper: /bloodwingactualreturn$/ },
]

export function applyCull(): number {
  const db = getDb()
  const rename = db.prepare(
    `UPDATE candidates SET group_kind = 'character', name = ?, name_key = ?, character_id = ?
     WHERE path LIKE ?`,
  )
  db.exec('BEGIN')
  try {
    for (const [id, name] of Object.entries(PLAYERS)) {
      rename.run(name, id, id, `%characterclass_${id}`)
    }
    db.prepare(
      `UPDATE candidates SET name = replace(name, '&amp;', '&'), name_key = replace(name_key, '&amp;', '&')
       WHERE name LIKE '%&amp;%'`,
    ).run()
    const fixName = db.prepare('UPDATE candidates SET name = ?, name_key = ? WHERE path LIKE ?')
    for (const fix of NAME_FIXES) fixName.run(fix.name, fix.key, fix.path)
    for (const id of ['brick', 'lilith', 'mordecai', 'roland']) {
      db.prepare(`UPDATE candidates SET character_id = ? WHERE path LIKE ?`).run(id, `%title_comdeck${id}`)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const rows = db
    .prepare(
      `SELECT c.id, c.group_kind AS groupKind, c.class_name AS className, c.path, c.name,
              c.name_key AS nameKey, c.family_label AS family
       FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE IFNULL(cor.removed, 0) = 0`,
    )
    .all() as CullRow[]

  const remove = db.prepare(
    `INSERT INTO corrections (candidate_id, removed, dedupe_reason) VALUES (?, 1, ?)
     ON CONFLICT(candidate_id) DO NOTHING`,
  )
  let changed = 0
  db.exec('BEGIN')
  try {
    for (const row of rows) {
      const reason = cullReason(row)
      if (!reason) continue
      const result = remove.run(row.id, reason)
      if (Number(result.changes) > 0) changed += 1
    }
    changed += foldCopies(db)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  if (changed) console.log(`Removed ${changed} rows that are not catalogue records`)
  return changed
}

function foldCopies(db: ReturnType<typeof getDb>): number {
  const working = db
    .prepare(
      `SELECT c.id, c.name, c.path FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE IFNULL(cor.removed, 0) = 0`,
    )
    .all() as { id: string; name: string; path: string }[]
  const remove = db.prepare(
    `INSERT INTO corrections (candidate_id, removed, dedupe_reason) VALUES (?, 1, ?)
     ON CONFLICT(candidate_id) DO NOTHING`,
  )
  const recordIds = db.prepare('SELECT record_id FROM records WHERE candidate_id = ?')
  const records = db.prepare(
    'SELECT record_type, record_id, file, body FROM records WHERE candidate_id = ? ORDER BY sort',
  )
  const nextSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS sort FROM records WHERE candidate_id = ?')
  const insertRecord = db.prepare(
    `INSERT INTO records (candidate_id, sort, record_type, record_id, file, body) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  let changed = 0
  for (const rule of COPY_ONTO) {
    const copy = working.find((row) => rule.copy.test(row.path))
    const keeper = working.find((row) => rule.keeper.test(row.path))
    if (!copy || !keeper || copy.id === keeper.id) continue
    if (copy.name.trim().toLowerCase() !== keeper.name.trim().toLowerCase()) continue
    const result = remove.run(copy.id, `Same thing as ${keeper.name}. The copy sits on that row.`)
    if (Number(result.changes) === 0) continue
    const have = new Set((recordIds.all(keeper.id) as { record_id: string }[]).map((record) => record.record_id))
    let sort = Number((nextSort.get(keeper.id) as { sort: number }).sort)
    for (const record of records.all(copy.id) as {
      record_type: string
      record_id: string
      file: string | null
      body: string | null
    }[]) {
      if (have.has(record.record_id)) continue
      sort += 1
      insertRecord.run(keeper.id, sort, record.record_type, record.record_id, record.file, record.body)
      have.add(record.record_id)
    }
    changed += 1
  }
  return changed
}

function cullReason(row: CullRow): string | null {
  const dropped = DROP_REASON[row.groupKind]
  if (dropped) return dropped
  if (
    row.groupKind === 'character' &&
    (row.className === 'WillowAIPawn' || row.className === 'WillowAICranePawn')
  ) {
    return 'Enemy mesh. The enemy row already has the name.'
  }
  if (row.groupKind === 'character_class') return 'Not a playable character.'
  if (row.groupKind === 'skill' && !playerSkill(row.path)) {
    return 'Not a player skill. Status effects, vehicles, and older skill files.'
  }
  if (row.groupKind === 'manufacturer' && /cash_manufacturer|\.stock$|startingweapon/.test(row.path)) {
    return 'Not a manufacturer.'
  }
  if (row.groupKind === 'location' && (row.path === 'engine.watervolume' || row.nameKey === 'under water')) {
    return 'Not a place.'
  }
  if (!row.name.trim()) return 'No display name. The crawler would have nothing to search.'
  if (row.nameKey === 'dlc5testmap' || row.path === 'missiontest') return 'Test map. Not in the game.'
  if (row.family && (/^SkagMount[1-5]$/.test(row.family) || row.family === 'PopOpDen' || row.family === 'BalanceDefs')) {
    return 'Mount or mission spawn. The named enemy is the catalogue row.'
  }
  if (row.family === 'population' && row.path.includes('rakkhive')) {
    return 'Spawn copy of that rakk. The rakk row is the enemy.'
  }
  if (row.groupKind === 'skill' && procSkill(row.name)) return 'A proc on the skill, not the skill.'
  return null
}

function procSkill(name: string): boolean {
  return /_| - activ/i.test(name) || / - health gain| - spawn cash/i.test(name)
}

function playerSkill(path: string): boolean {
  const pkg = path.split('.')[0] ?? ''
  return /^gd_skills2_(roland|lilith|mordecai|brick)$/.test(pkg) && !path.includes(':')
}
