import fs from 'node:fs'
import path from 'node:path'
import { unzipSync } from 'fflate'

import { classNameOf, classify, familyLabel } from './classify.ts'
import { applyDedupe } from './dedupe.ts'
import { applyFolds } from './fold.ts'
import { closeDb, getDb, metaSet } from './db.ts'
import { dataDir, extractDir } from './paths.ts'
import type { Summary } from '../shared/types.ts'
import { summarize } from './library.ts'

const EXPECTED = {
  formatVersion: 1,
  extractorVersion: '0.3.2',
  status: 'complete',
  createdPrefix: '2026-11-10',
}

type Loose = Record<string, unknown>

type Identity = {
  id: string
  status: string
  names: { name: string; field: string }[]
  className: string
  category: string
  pathOriginal: string
  origin: string
  file: string
  body: string
}

type Mention = {
  category: string
  sourceIdentity: string
  sourceAsset: string
  sourceRecord: string
  internalName: string
  file: string
  id: string
  body: string
}

type Ref = {
  path: string
  file: string
  id: string
  recordType: string
}

type BuiltRecord = {
  sort: number
  recordType: string
  recordId: string
  file: string | null
  body: string | null
}

let busy = false

export function importBusy(): boolean {
  return busy
}

export function importExtract(zipPath: string): Summary {
  if (busy) throw new Error('The workshop is already reading a zip.')
  busy = true
  const incoming = path.join(dataDir, 'extract-incoming')
  try {
    const entries = readZip(zipPath)
    const manifestKey = findManifest(entries)
    if (!manifestKey) throw new Error('The zip has no manifest.json.')
    const manifest = parseManifest(entries.get(manifestKey) ?? new Uint8Array())
    const problems = manifestProblems(manifest)
    if (problems.length) throw new Error(problems.join('\n'))

    fs.rmSync(incoming, { recursive: true, force: true })
    writeExtract(incoming, entries, manifestKey)
    const built = buildCandidates(incoming)
    writeCandidates(built)
    applyDedupe()
    applyFolds()
    metaSet('ready', '1')
    metaSet('extractor', EXPECTED.extractorVersion)
    metaSet('created', String(manifest.created_utc ?? ''))
    metaSet('capture_status', EXPECTED.status)

    fs.rmSync(extractDir, { recursive: true, force: true })
    fs.renameSync(incoming, extractDir)
    console.log(`Imported ${built.length} candidates`)
    return summarize()
  } catch (error) {
    fs.rmSync(incoming, { recursive: true, force: true })
    throw error
  } finally {
    busy = false
  }
}

function readZip(zipPath: string): Map<string, Uint8Array> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(fs.readFileSync(zipPath)))
  } catch {
    throw new Error('The file is not a zip archive.')
  }
  let total = 0
  const out = new Map<string, Uint8Array>()
  for (const [name, data] of Object.entries(entries)) {
    const rel = name.replaceAll('\\', '/')
    if (rel.startsWith('/') || rel.split('/').includes('..')) {
      throw new Error(`The zip entry "${name}" is not a safe path.`)
    }
    total += data.length
    if (total > 500 * 1024 * 1024) throw new Error('The zip unpacks to more than 500MB.')
    out.set(rel, data)
  }
  return out
}

function findManifest(entries: Map<string, Uint8Array>): string | null {
  const keys = [...entries.keys()].filter(
    (key) => key.endsWith('manifest.json') && !key.includes('__MACOSX'),
  )
  keys.sort((a, b) => a.length - b.length)
  return keys[0] ?? null
}

function parseManifest(bytes: Uint8Array): Loose {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8')) as Loose
  } catch {
    throw new Error('manifest.json is not JSON.')
  }
}

function manifestProblems(manifest: Loose): string[] {
  const problems: string[] = []
  if (manifest.format_version !== EXPECTED.formatVersion) {
    problems.push(
      `format_version is ${String(manifest.format_version)}. This capture is format_version ${EXPECTED.formatVersion}.`,
    )
  }
  if (manifest.extractor_version !== EXPECTED.extractorVersion) {
    problems.push(
      `extractor_version is ${String(manifest.extractor_version)}. This capture is extractor ${EXPECTED.extractorVersion}.`,
    )
  }
  if (manifest.status !== EXPECTED.status) {
    problems.push(`status is ${String(manifest.status)}. This capture is status ${EXPECTED.status}.`)
  }
  const created = typeof manifest.created_utc === 'string' ? manifest.created_utc : ''
  if (!created.startsWith(EXPECTED.createdPrefix)) {
    problems.push(
      `created_utc is ${created || 'missing'}. This capture was created on ${EXPECTED.createdPrefix}.`,
    )
  }
  return problems
}

function writeExtract(dir: string, entries: Map<string, Uint8Array>, manifestKey: string): void {
  const prefix = path.posix.dirname(manifestKey)
  for (const [name, data] of entries) {
    if (name.endsWith('/') || name.includes('__MACOSX') || name.endsWith('.DS_Store')) continue
    const rel = prefix === '.' ? name : name.startsWith(`${prefix}/`) ? name.slice(prefix.length + 1) : null
    if (!rel) continue
    writeUnder(dir, rel, data)
  }
}

function writeUnder(root: string, rel: string, data: Uint8Array): void {
  const dest = path.resolve(root, rel)
  const base = path.resolve(root)
  if (dest !== base && !dest.startsWith(base + path.sep)) {
    throw new Error(`Refusing to write ${rel}.`)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, data)
}

function buildCandidates(root: string): { id: string; values: unknown[]; records: BuiltRecord[] }[] {
  const dataDirPath = path.join(root, 'data')
  if (!fs.existsSync(dataDirPath)) throw new Error('The zip has no data directory.')
  const files = fs
    .readdirSync(dataDirPath)
    .filter((file) => file.startsWith('records-') && file.endsWith('.json'))
    .sort()

  const byPath = new Map<string, Identity[]>()
  const mentions: Mention[] = []
  const refs: Ref[] = []

  for (const file of files) {
    const rel = `data/${file}`
    let records: unknown
    try {
      records = JSON.parse(fs.readFileSync(path.join(dataDirPath, file), 'utf8')) as unknown
    } catch {
      throw new Error(`${rel} is not JSON.`)
    }
    if (!Array.isArray(records)) throw new Error(`${rel} is not a list of records.`)
    for (const record of records) {
      if (!record || typeof record !== 'object') continue
      const row = record as Loose
      const recordType = str(row.record_type)
      if (recordType === 'catalogue_identity') {
        const status = str(row.identity_status)
        if (status === 'asset_evidence' || status === 'localisation_candidate') {
          const key = pathKey(row)
          const list = byPath.get(key) ?? []
          list.push(toIdentity(row, rel))
          byPath.set(key, list)
        } else if (status === 'field_candidate' || status === 'localisation_field_candidate') {
          mentions.push(toMention(row, rel))
        }
      } else if (
        recordType === 'object' ||
        recordType === 'archetype_binding' ||
        recordType === 'world_binding'
      ) {
        const objectPath = str(row.path).toLowerCase()
        if (objectPath) {
          refs.push({
            path: objectPath,
            file: rel,
            id: str(row.id),
            recordType,
          })
        }
      }
    }
  }

  const idToPath = new Map<string, string>()
  const built: { id: string; values: unknown[]; records: BuiltRecord[] }[] = []
  const pathToIndex = new Map<string, number>()

  for (const [key, identities] of byPath) {
    const candidate = makeCandidate(key, identities)
    pathToIndex.set(key, built.length)
    for (const identity of identities) idToPath.set(identity.id, key)
    built.push(candidate)
  }

  for (const ref of refs) {
    const index = pathToIndex.get(ref.path)
    if (index === undefined) continue
    const records = built[index]?.records
    if (!records) continue
    records.push({
      sort: records.length,
      recordType: ref.recordType,
      recordId: ref.id,
      file: ref.file,
      body: null,
    })
  }

  const maps = new Map<string, { name: string; records: BuiltRecord[] }>()
  let unresolved = 0
  for (const mention of mentions) {
    if (mention.category === 'map') {
      const key = mention.internalName.toLowerCase()
      if (!key) continue
      const map = maps.get(key) ?? { name: mention.internalName, records: [] }
      map.records.push(mentionRecord(map.records.length, mention))
      maps.set(key, map)
      continue
    }
    const source = resolveSource(mention, idToPath, pathToIndex)
    if (!source) {
      unresolved += 1
      continue
    }
    const index = pathToIndex.get(source)
    if (index === undefined) {
      unresolved += 1
      continue
    }
    const records = built[index]?.records
    if (!records) continue
    records.push(mentionRecord(records.length, mention))
  }
  if (unresolved) console.log(`${unresolved} mentions had no source candidate`)

  for (const [key, map] of maps) {
    built.push({
      id: `map:${key}`,
      values: [
        `map:${key}`,
        key,
        map.name,
        map.name,
        key,
        '',
        'map',
        'map',
        null,
        null,
        null,
        null,
        '',
      ],
      records: map.records,
    })
  }

  return built
}

function makeCandidate(key: string, identities: Identity[]): {
  id: string
  values: unknown[]
  records: BuiltRecord[]
} {
  const asset = identities.find((identity) => identity.status === 'asset_evidence')
  const loc = identities.find((identity) => identity.status === 'localisation_candidate')
  const primary = asset ?? loc ?? identities[0]
  if (!primary) throw new Error(`No identity for ${key}`)
  const id = chooseId(identities)
  const prefer = preferField(primary.className, asset?.className ?? loc?.className ?? '')
  const name = displayName(loc ? [loc, ...identities] : identities, prefer)
  const pathOriginal = asset?.pathOriginal || loc?.pathOriginal || primary.pathOriginal || key
  const className = asset?.className || loc?.className || primary.className
  const category = asset?.category || loc?.category || primary.category || 'unknown'
  const origin = asset?.origin || loc?.origin || ''
  const bucket = classify({ className, path: key, category, name })
  const records: BuiltRecord[] = identities.map((identity, index) => ({
    sort: index,
    recordType: 'catalogue_identity',
    recordId: identity.id,
    file: identity.file,
    body: identity.body,
  }))
  return {
    id,
    values: [
      id,
      key,
      pathOriginal,
      name,
      name.trim().toLowerCase().replace(/\s+/g, ' '),
      className,
      category,
      bucket.groupKind,
      bucket.itemType,
      bucket.subtype,
      bucket.characterId,
      familyLabel(pathOriginal, bucket.groupKind),
      origin,
    ],
    records,
  }
}

function preferField(className: string, other: string): string | null {
  const kind = className || other
  if (kind === 'AIPawnBalanceDefinition') return 'DisplayName'
  if (kind === 'MissionDefinition') return 'MissionName'
  return null
}

function displayName(identities: Identity[], field: string | null): string {
  if (field) {
    for (const identity of identities) {
      const hit = identity.names.find((entry) => entry.field === field)
      if (hit) return hit.name
    }
  }
  for (const identity of identities) {
    if (identity.names[0]) return identity.names[0].name
  }
  return ''
}

function chooseId(identities: Identity[]): string {
  const assets = identities.filter((identity) => identity.status === 'asset_evidence')
  const object = assets.find((identity) => identity.id.startsWith('identity:object:'))
  if (object) return object.id
  const pool = assets.length ? assets : identities
  return pool.map((identity) => identity.id).sort()[0] ?? identities[0]?.id ?? ''
}

function pathKey(row: Loose): string {
  const value = str(row.asset_path) || str(row.asset_path_hint)
  if (value) return value.toLowerCase()
  return `missing-path:${str(row.id)}`
}

function toIdentity(row: Loose, file: string): Identity {
  const pathOriginal = str(row.asset_path) || str(row.asset_path_hint)
  return {
    id: str(row.id),
    status: str(row.identity_status),
    names: namesOf(row),
    className: classNameOf(row.class) || classNameOf(row.class_hint),
    category: str(row.category),
    pathOriginal,
    origin: str(row.origin_hint),
    file,
    body: JSON.stringify(row),
  }
}

function toMention(row: Loose, file: string): Mention {
  return {
    category: str(row.category),
    sourceIdentity: str(row.source_identity),
    sourceAsset: str(row.source_asset_path),
    sourceRecord: str(row.source_record),
    internalName: str(row.internal_name) || str(row.source_value),
    file,
    id: str(row.id),
    body: JSON.stringify(row),
  }
}

function mentionRecord(sort: number, mention: Mention): BuiltRecord {
  return {
    sort,
    recordType: 'catalogue_identity',
    recordId: mention.id,
    file: mention.file,
    body: mention.body,
  }
}

function resolveSource(
  mention: Mention,
  idToPath: Map<string, string>,
  paths: Map<string, number>,
): string | null {
  if (mention.sourceIdentity && idToPath.has(mention.sourceIdentity)) {
    return idToPath.get(mention.sourceIdentity) ?? null
  }
  const asset = mention.sourceAsset.toLowerCase()
  if (asset && paths.has(asset)) return asset
  if (mention.sourceRecord.startsWith('object:')) {
    const objectPath = mention.sourceRecord.slice('object:'.length).toLowerCase()
    if (paths.has(objectPath)) return objectPath
  }
  return null
}

function namesOf(row: Loose): { name: string; field: string }[] {
  if (!Array.isArray(row.names)) return []
  return row.names.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const entry = item as Loose
    const name = str(entry.name)
    if (!name) return []
    return [{ name, field: str(entry.field) }]
  })
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function writeCandidates(built: { id: string; values: unknown[]; records: BuiltRecord[] }[]): void {
  const db = getDb()
  const insertCandidate = db.prepare(
    `INSERT INTO candidates (
      id, path, path_original, name, name_key, class_name, extract_category,
      group_kind, item_type, subtype, character_id, family_label, origin_hint
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertRecord = db.prepare(
    `INSERT INTO records (candidate_id, sort, record_type, record_id, file, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM candidates')
    db.exec('DELETE FROM records')
    for (const candidate of built) {
      insertCandidate.run(...(candidate.values as (string | number | null | bigint)[]))
      for (const record of candidate.records) {
        insertRecord.run(
          candidate.id,
          record.sort,
          record.recordType,
          record.recordId,
          record.file,
          record.body,
        )
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    closeDb()
    throw error
  }
}

export function storeIsReady(): boolean {
  if (!fs.existsSync(path.join(extractDir, 'manifest.json'))) return false
  try {
    const row = getDb().prepare(`SELECT value FROM meta WHERE key = 'ready'`).get() as
      | { value: string }
      | undefined
    return row?.value === '1'
  } catch {
    return false
  }
}
