import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { zipSync, strToU8 } from 'fflate'

const home = mkdtempSync(path.join(tmpdir(), 'workshop-test-'))
process.env.WORKSHOP_HOME = home

const ZIP = '/Users/keogh/Sites/claptrapedia/extractions/borderlands1e/extract-20261110-124546-348467.zip'

const { classify, familyLabel } = await import('./classify.ts')
const { decideDrops } = await import('./dedupe.ts')
const { importExtract, storeIsReady } = await import('./extract.ts')
const { candidateDetail, listCandidates, removeCandidate, restoreCandidate, summarize } = await import('./library.ts')
const { getDb } = await import('./db.ts')
const { dataDir, imgDir } = await import('./paths.ts')
const { acceptsReset, confirmSnapshot, exportSnapshot, resetStore, stageSnapshot } = await import('./snapshot.ts')
const { agentLaunch, askAgent, getAgent, setAgent } = await import('./agent.ts')

type Member = {
  id: string
  nameKey: string
  className: string
  path: string
  origin: string
  groupKind: string
  hasObject: boolean
}

const enemy = (id: string, path: string, extra: Partial<Member> = {}): Member => ({
  id,
  nameKey: 'bone head',
  className: 'AIPawnBalanceDefinition',
  path,
  origin: '',
  groupKind: 'enemy',
  hasObject: true,
  ...extra,
})

test('classification follows the package and the title', () => {
  assert.equal(dataDir, path.join(home, '.data'))
  assert.deepEqual(
    classify({
      className: 'WeaponNamePartDefinition',
      path: 'gd_weap_patrol_smg.Title.TitleM_Maliwan1_HellFire',
      category: 'equipment_name',
      name: 'HellFire',
    }),
    { groupKind: 'weapon', itemType: 'weapon', subtype: 'smg', characterId: null },
  )
  assert.equal(
    classify({
      className: 'WeaponNamePartDefinition',
      path: 'gd_weap_machine_pistol.Title.Title_Something',
      category: 'equipment_name',
      name: 'Repeater',
    }).subtype,
    'repeater-pistol',
  )
  assert.equal(
    classify({
      className: 'WeaponNamePartDefinition',
      path: 'gd_weap_support_machinegun.Title.TitleU_SupportMG_Example',
      category: 'equipment_name',
      name: 'Rifle',
    }).subtype,
    'combat-rifle',
  )
  assert.equal(
    classify({
      className: 'WeaponNamePartDefinition',
      path: 'gd_weap_grenade_launcher.Title.TitleM_Atlas1_Leviathan',
      category: 'equipment_name',
      name: 'Leviathan',
    }).subtype,
    'rocket-launcher',
  )
  assert.equal(
    classify({
      className: 'WeaponNamePartDefinition',
      path: 'dlc3_gd_weap_uniqueparts.TitleP.TitleP_Atlas_Aries',
      category: 'equipment_name',
      name: 'Aries',
    }).subtype,
    null,
  )
  assert.equal(
    classify({
      className: 'ItemNamePartDefinition',
      path: 'gd_shields.Title.Title_Hyperion1_Rose',
      category: 'equipment_name',
      name: 'Rose',
    }).groupKind,
    'shield',
  )
  assert.equal(
    classify({
      className: 'ItemNamePartDefinition',
      path: 'gd_tunercuffs.Title.Title_Sticky',
      category: 'equipment_name',
      name: 'Sticky',
    }).subtype,
    'sticky',
  )
  assert.equal(
    classify({
      className: 'ItemDefinition',
      path: 'gd_ElementalUpgrade.Brick.Corrosive_Level_1',
      category: 'item',
      name: 'Elemental Artifact',
    }).characterId,
    'brick',
  )
  assert.equal(
    classify({
      className: 'PlayerClassDefinition',
      path: 'gd_lilith.Character.CharacterClass_Lilith',
      category: 'character_class',
      name: '',
    }).characterId,
    'lilith',
  )
  assert.equal(
    familyLabel('gd_Balance_Enemies_Humans.Bandits.Named.Pawn_Balance_Bonehead', 'enemy'),
    'Bandits',
  )
})

test('duplicate pass drops a nameless object and a dlc copy, and keeps two real guns', () => {
  const bone = decideDrops([
    enemy('base', 'gd_balance.bandits.named.pawn_balance_bonehead'),
    enemy('loc', 'gd_balance.bandits.pawn_balance_boss_captain1', { hasObject: false }),
    enemy('dome', 'dlc2_gd_balance.bandits.named.dlc2_pawn_balance_bonehead', { origin: 'dlc2' }),
  ])
  assert.deepEqual(
    bone.map((drop) => drop.id).sort(),
    ['dome', 'loc'],
  )
  const guns = decideDrops([
    enemy('crux', 'gd_weap_assault_shotgun.title.titlem_sands1_crux', {
      nameKey: 'crux',
      className: 'WeaponNamePartDefinition',
      groupKind: 'weapon',
    }),
    enemy('plague', 'gd_weap_assault_shotgun.title.titlem_maliwan1_plague', {
      nameKey: 'crux',
      className: 'WeaponNamePartDefinition',
      groupKind: 'weapon',
    }),
  ])
  assert.equal(guns.length, 0)
  const onlyLoc = decideDrops([
    enemy('a', 'gd.crabs.pawn_balance_king', { hasObject: false, nameKey: 'king crab' }),
    enemy('b', 'gd.crabs.pawn_balance_king_2', { hasObject: false, nameKey: 'king crab' }),
  ])
  assert.equal(onlyLoc.length, 0)
  const eridian = decideDrops([
    enemy('base', 'gd_weap_alien_rifle.title.title_fireball', {
      nameKey: 'fireball',
      className: 'WeaponNamePartDefinition',
      groupKind: 'weapon',
    }),
    enemy('knoxx', 'dlc3_gd_weap.title.dlc3_title_fireball', {
      nameKey: 'fireball',
      className: 'WeaponNamePartDefinition',
      groupKind: 'weapon',
      origin: 'dlc3',
    }),
  ])
  assert.deepEqual(
    eridian.map((drop) => drop.id),
    ['knoxx'],
  )
})

test('the capture import builds the working set', { timeout: 180_000 }, () => {
  assert.ok(existsSync(ZIP), `Missing capture zip at ${ZIP}`)
  const summary = importExtract(ZIP)
  assert.equal(summary.candidates, 1010)
  assert.equal(summary.weapons, 164)
  assert.equal(summary.smgs, 14)
  assert.equal(summary.enemies, 254)
  assert.equal(summary.artifacts, 16)
  assert.equal(summary.shields, 42)
  assert.equal(summary.grenadeMods, 11)
  assert.equal(summary.classMods, 19)
  assert.equal(summary.missions, 226)
  assert.equal(summary.locations, 77)
  assert.equal(summary.maps, 69)
  assert.equal(count(`c.group_kind = 'enemy' AND lower(c.family_label) = 'bandits'`), 27)
  assert.equal(count(`trim(c.name) = ''`), 0)
  assert.equal(nameWhere(`c.path LIKE '%titlem_maliwan1_plague'`), 'The Plague')
  assert.equal(nameWhere(`c.path LIKE '%titlem_hyperion1_executioner'`), 'Executioner')
  assert.equal(nameWhere(`c.path LIKE '%title_damage1_driver'`), 'Driver')
  assert.equal(nameWhere(`c.path LIKE '%adrenaline_lilith'`), 'Adrenaline - Lilith')
  assert.equal(nameWhere(`c.path LIKE '%titlem_sands1_crux'`), 'Crux')
  assert.equal(count(`c.path LIKE '%pawn_balance_bonehead' AND c.path NOT LIKE '%dlc2%'`), 1)
  assert.equal(removedWhere(`c.path LIKE '%dlc2_pawn_balance_bonehead'`), 1)
  assert.equal(removedWhere(`c.path LIKE '%pawn_balance_boss_captain1'`), 1)
  assert.equal(characterWhere(`c.path LIKE '%title_comdeckbrick'`), 'brick')
  const hellfire = listCandidates({ group: 'weapon/smg', q: 'hellfire', missing: false, removed: false })
  assert.equal(hellfire.total, 1)
  const brick = listCandidates({ group: 'artifact/brick', q: '', missing: false, removed: false })
  assert.equal(brick.total, 4)
  assert.ok(brick.rows.every((row) => !/level\s+\d/i.test(row.name)))
  const cobras = listCandidates({ group: 'weapon', q: 'cobra', missing: false, removed: false })
  assert.equal(cobras.total, 2)
  assert.ok(cobras.rows.every((row) => row.duplicateCount === 1))
  const detail = candidateDetail(idWhere(`c.path LIKE '%titlem_sands1_crux'`))
  assert.ok(detail)
  assert.equal(detail.duplicates.length, 0)
})

test('a removal and a restore both survive another upload of the same zip', { timeout: 300_000 }, () => {
  const crux = idWhere(`c.path LIKE '%titlem_sands1_crux'`)
  removeCandidate(crux)
  importExtract(ZIP)
  assert.equal(removedWhere(`c.path LIKE '%titlem_sands1_crux'`), 1)
  restoreCandidate(crux)
  const dome = idWhere(`c.path LIKE '%dlc2_pawn_balance_bonehead'`, false)
  restoreCandidate(dome)
  importExtract(ZIP)
  assert.equal(removedWhere(`c.path LIKE '%titlem_sands1_crux'`), 0)
  assert.equal(removedWhere(`c.path LIKE '%dlc2_pawn_balance_bonehead'`), 0)
  assert.equal(summarize().candidates, 1011)
})

test('a snapshot that fails its check leaves the store, and confirm replaces it', () => {
  const before = count('1 = 1')
  const junk = path.join(home, 'not-a-snapshot.zip')
  writeFileSync(junk, zipSync({ 'readme.txt': strToU8('no') }))
  assert.throws(() => stageSnapshot(junk), /snapshot|workshop|zip/i)
  assert.equal(count('1 = 1'), before)

  const zip = exportSnapshot()
  const crux = idWhere(`c.path LIKE '%titlem_sands1_crux'`)
  getDb().prepare(`UPDATE candidates SET name = 'Nope' WHERE id = ?`).run(crux)
  const staged = stageSnapshot(zip)
  confirmSnapshot(staged.token)
  assert.equal(nameWhere(`c.path LIKE '%titlem_sands1_crux'`), 'Crux')
})

test('reset ignores anything except CONFIRM and then deletes only the workshop store', () => {
  assert.equal(acceptsReset('confirm'), false)
  assert.equal(acceptsReset('CONFIRM'), true)
  assert.equal(storeIsReady(), true)
  const card = path.join(imgDir, 'borderlands/weapons/hellfire.png')
  assert.equal(existsSync(card), true)
  resetStore()
  assert.equal(existsSync(path.join(dataDir, 'extract/manifest.json')), false)
  assert.equal(storeIsReady(), false)
  assert.equal(existsSync(card), true)
})

test('the header agent defaults to Claude Code and is remembered', () => {
  assert.equal(getAgent(), 'claude')
  assert.equal(setAgent('codex'), 'codex')
  assert.equal(getAgent(), 'codex')
  assert.equal(setAgent('claude'), 'claude')
  assert.throws(() => setAgent('gpt'), /Claude Code or Codex/)
})

test('each CLI is asked for its medium model and that model only', () => {
  const claude = agentLaunch('claude', 'claude-sonnet-5-5')
  assert.equal(claude.command, 'claude')
  assert.equal(flag(claude.args, '--model'), 'claude-sonnet-5-5')
  assert.equal(flag(claude.args, '--effort'), 'medium')
  assert.equal(flag(claude.args, '--output-format'), 'json')
  assert.equal(claude.args.at(-1), 'Reply with exactly this sentence and nothing else: workshop agent ok')

  const fallback = agentLaunch('claude', 'sonnet')
  assert.equal(flag(fallback.args, '--model'), 'sonnet')
  assert.equal(flag(fallback.args, '--effort'), 'medium')

  const codex = agentLaunch('codex', 'gpt-6.2-sol')
  assert.equal(codex.command, 'codex')
  assert.equal(codex.args[0], 'exec')
  assert.equal(flag(codex.args, '-m'), 'gpt-6.2-sol')
  assert.ok(codex.args.includes('model_reasoning_effort="medium"'))
  assert.equal(codex.args.at(-1), 'Reply with exactly this sentence and nothing else: workshop agent ok')
})

test('a Claude reply records the model that ran', async () => {
  const seen: string[] = []
  const result = await askAgent('claude', async (agent, model) => {
    seen.push(`${agent}:${model}`)
    return JSON.stringify({
      is_error: false,
      result: '  workshop agent ok  ',
      modelUsage: { 'claude-sonnet-5-5': { canonicalModel: 'claude-sonnet-5-5' } },
    })
  })
  assert.deepEqual(seen, ['claude:claude-sonnet-5-5'])
  assert.deepEqual(result, { model: 'claude-sonnet-5-5', reply: 'workshop agent ok' })
})

test('a rejected Claude model retries Sonnet on Claude and does not call Codex', async () => {
  const seen: string[] = []
  const result = await askAgent('claude', async (agent, model) => {
    seen.push(`${agent}:${model}`)
    if (model !== 'sonnet') throw new Error('Unknown model: claude-sonnet-5-5')
    return JSON.stringify({ is_error: false, result: 'workshop agent ok', model: 'claude-sonnet-5-5' })
  })
  assert.deepEqual(seen, ['claude:claude-sonnet-5-5', 'claude:sonnet'])
  assert.deepEqual(result, { model: 'claude-sonnet-5-5', reply: 'workshop agent ok' })

  await assert.rejects(
    askAgent('claude', async () => {
      throw new Error('rate limit')
    }),
    /rate limit/,
  )
  await assert.rejects(
    askAgent('claude', async () => JSON.stringify({ is_error: true, result: 'Claude returned an error.' })),
    /Claude returned an error/,
  )
})

test('a Codex reply records the model, and a Codex failure stays on Codex', async () => {
  const result = await askAgent(
    'codex',
    async () =>
      [
        'not json',
        JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'workshop agent ok' } }),
        JSON.stringify({ type: 'turn.completed' }),
      ].join('\n'),
  )
  assert.deepEqual(result, { model: 'gpt-6.2-sol', reply: 'workshop agent ok' })

  let calls = 0
  await assert.rejects(
    askAgent('codex', async (_agent, model) => {
      calls += 1
      throw new Error(`unknown model ${model}`)
    }),
    /unknown model gpt-6.2-sol/,
  )
  assert.equal(calls, 1)
  await assert.rejects(
    askAgent('codex', async () => JSON.stringify({ type: 'error', message: 'Codex refused the prompt.' })),
    /Codex refused the prompt/,
  )
})

function flag(args: string[], name: string): string | undefined {
  return args[args.indexOf(name) + 1]
}

function count(where: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE IFNULL(cor.removed, 0) = 0 AND ${where}`,
    )
    .get() as { n: number }
  return Number(row.n)
}

function idWhere(where: string, working = true): string {
  const row = getDb()
    .prepare(
      `SELECT c.id AS id FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE ${working ? 'IFNULL(cor.removed, 0) = 0 AND ' : ''}${where}`,
    )
    .get() as { id: string }
  return row.id
}

function nameWhere(where: string): string {
  const row = getDb()
    .prepare(
      `SELECT c.name AS name FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE IFNULL(cor.removed, 0) = 0 AND ${where}`,
    )
    .get() as { name: string }
  return row.name
}

function characterWhere(where: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT c.character_id AS characterId FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE IFNULL(cor.removed, 0) = 0 AND ${where}`,
    )
    .get() as { characterId: string | null }
  return row.characterId
}

function removedWhere(where: string): number {
  const row = getDb()
    .prepare(
      `SELECT IFNULL(cor.removed, 0) AS removed FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE ${where}`,
    )
    .get() as { removed: number }
  return Number(row.removed)
}
