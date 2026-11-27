import fs from 'node:fs'
import path from 'node:path'

import { getDb } from './db.ts'
import { autoImage, imageFiles, imageUrl } from './images.ts'
import { extractDir } from './paths.ts'
import type {
  CandidateDetail,
  CandidateList,
  CandidateRow,
  DuplicatePointer,
  GroupNode,
  RawRecord,
  Summary,
} from '../shared/types.ts'
import {
  CHARACTERS,
  GROUP_ORDER,
  characterLabel,
  groupLabel,
  itemTypeLabel,
  originLabel,
  subtypeLabel,
  subtypesFor,
} from '../shared/vocab.ts'

type Stored = {
  id: string
  path: string
  path_original: string
  name: string
  name_key: string
  class_name: string
  extract_category: string
  group_kind: string
  item_type: string | null
  subtype: string | null
  character_id: string | null
  family_label: string | null
  origin_hint: string
  removed: number | null
  type_set: number | null
  override_type: string | null
  override_subtype: string | null
  character_set: number | null
  override_character: string | null
  image_set: number | null
  override_image: string | null
  dedupe_reason: string | null
}

type View = {
  stored: Stored
  removed: boolean
  itemType: string | null
  subtype: string | null
  characterId: string | null
  parentKey: string
  groupKey: string
  childLabel: string | null
  imagePath: string | null
}

const LIST_CAP = 400

export function summarize(): Summary {
  const views = loadViews().filter((view) => !view.removed)
  const count = (key: string) => views.filter((view) => view.parentKey === key).length
  return {
    candidates: views.length,
    weapons: count('weapon'),
    smgs: views.filter((view) => view.itemType === 'weapon' && view.subtype === 'smg').length,
    enemies: count('enemy'),
    locations: count('location'),
    missions: count('mission'),
    shields: count('shield'),
    grenadeMods: count('grenade-mod'),
    classMods: count('class-mod'),
    artifacts: count('artifact'),
    maps: count('map'),
  }
}

export function groups(removed: boolean): GroupNode[] {
  const views = loadViews().filter((view) => view.removed === removed)
  const parents = new Map<string, Map<string, { label: string; held: number }>>()
  for (const view of views) {
    const children = parents.get(view.parentKey) ?? new Map()
    if (view.groupKey !== view.parentKey) {
      const child = children.get(view.groupKey) ?? { label: view.childLabel ?? view.groupKey, held: 0 }
      child.held += 1
      children.set(view.groupKey, child)
    }
    parents.set(view.parentKey, children)
  }
  const keys = [...parents.keys()].sort(byGroup)
  return keys.map((key) => {
    const children = [...(parents.get(key)?.entries() ?? [])]
      .map(([childKey, child]) => ({
        key: childKey,
        label: child.label,
        held: child.held,
        done: 0,
        attention: 0,
        children: [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const held = views.filter((view) => view.parentKey === key).length
    return { key, label: groupLabel(key), held, done: 0, attention: 0, children }
  })
}

export function listCandidates(query: {
  group: string
  q: string
  missing: boolean
  removed: boolean
}): CandidateList {
  const needle = query.q.trim().toLowerCase()
  const pool = loadViews().filter((view) => view.removed === query.removed)
  const dupes = duplicateCounts(pool)
  let views = pool
  if (query.group) {
    views = views.filter((view) => view.groupKey === query.group || view.parentKey === query.group)
  }
  if (needle) views = views.filter((view) => view.stored.name_key.includes(needle))
  if (query.missing) views = views.filter((view) => gear(view.itemType) && !view.imagePath)
  views.sort((a, b) => (a.stored.name || a.stored.path).localeCompare(b.stored.name || b.stored.path))
  const rows = views.slice(0, LIST_CAP).map((view) => toRow(view, dupes.get(view.stored.id) ?? 0))
  return { total: views.length, shown: rows.length, rows }
}

export function candidateDetail(id: string): CandidateDetail | null {
  const view = loadViews().find((item) => item.stored.id === id)
  if (!view) return null
  const pool = loadViews().filter((item) => item.removed === view.removed)
  const dupes = duplicateIds(pool, view)
  const count = getDb()
    .prepare('SELECT COUNT(*) AS n FROM records WHERE candidate_id = ?')
    .get(id) as { n: number }
  const typeSet = view.stored.type_set === 1
  return {
    ...toRow(view, dupes.length),
    candidateId: view.stored.id,
    className: view.stored.class_name,
    originHint: view.stored.origin_hint,
    extractCategory: view.stored.extract_category,
    extractedLabel: extractedLabel(view.stored),
    bucket: {
      typeSet,
      itemType: typeSet ? view.stored.override_type : null,
      subtype: typeSet ? view.stored.override_subtype : null,
      characterSet: view.stored.character_set === 1,
      characterId: view.stored.character_set === 1 ? view.stored.override_character : null,
    },
    image: {
      mode: view.stored.image_set === 1 ? (view.stored.override_image ? 'file' : 'none') : 'auto',
      path: view.imagePath,
    },
    duplicates: dupes,
    recordCount: count.n,
  }
}

export function loadRecords(id: string): RawRecord[] | null {
  const exists = getDb().prepare('SELECT id FROM candidates WHERE id = ?').get(id)
  if (!exists) return null
  const rows = getDb()
    .prepare(
      `SELECT record_type, record_id, file, body
       FROM records WHERE candidate_id = ? ORDER BY sort`,
    )
    .all(id) as { record_type: string; record_id: string; file: string | null; body: string | null }[]
  const cache = new Map<string, Loose[]>()
  return rows.map((row) => {
    if (row.body) return JSON.parse(row.body) as RawRecord
    if (!row.file) return { record_type: row.record_type, id: row.record_id, missing: true }
    const list = readChunk(row.file, cache)
    return (
      list.find((record) => record.id === row.record_id) ?? {
        record_type: row.record_type,
        id: row.record_id,
        missing: true,
      }
    )
  })
}

export function removeCandidate(id: string): void {
  ensure(id)
  getDb().prepare('UPDATE corrections SET removed = 1 WHERE candidate_id = ?').run(id)
}

export function restoreCandidate(id: string): void {
  ensure(id)
  getDb()
    .prepare('UPDATE corrections SET removed = 0, dedupe_reason = NULL WHERE candidate_id = ?')
    .run(id)
}

export function saveBucket(
  id: string,
  input: { reset: boolean; itemType: string | null; subtype: string | null; characterId: string | null },
): void {
  ensure(id)
  if (input.reset) {
    getDb()
      .prepare(
        `UPDATE corrections
         SET type_set = 0, item_type = NULL, subtype = NULL, character_set = 0, character_id = NULL
         WHERE candidate_id = ?`,
      )
      .run(id)
    return
  }
  const itemType = input.itemType ?? ''
  if (!['weapon', 'shield', 'grenade-mod', 'class-mod', 'artifact'].includes(itemType)) {
    throw new Error('Choose an item type.')
  }
  const allowed = new Set(subtypesFor(itemType).map(([subtype]) => subtype))
  const subtype = input.subtype
  if (subtype && !allowed.has(subtype)) throw new Error('That subtype is not on this item type.')
  const needsCharacter = itemType === 'class-mod' || itemType === 'artifact'
  const characterId = needsCharacter ? input.characterId : null
  if (characterId && !CHARACTERS.some(([character]) => character === characterId)) {
    throw new Error('That character is not one of Roland, Lilith, Mordecai or Brick.')
  }
  getDb()
    .prepare(
      `UPDATE corrections
       SET type_set = 1, item_type = ?, subtype = ?, character_set = ?, character_id = ?
       WHERE candidate_id = ?`,
    )
    .run(itemType, subtype, needsCharacter ? 1 : 0, characterId, id)
}

export function saveImage(id: string, input: { mode: 'auto' | 'none' | 'file'; path?: string }): void {
  ensure(id)
  if (input.mode === 'auto') {
    getDb()
      .prepare('UPDATE corrections SET image_set = 0, image_path = NULL WHERE candidate_id = ?')
      .run(id)
    return
  }
  if (input.mode === 'none') {
    getDb()
      .prepare('UPDATE corrections SET image_set = 1, image_path = NULL WHERE candidate_id = ?')
      .run(id)
    return
  }
  const rel = input.path ?? ''
  if (!imageFiles().has(rel)) throw new Error('That image is not in src/data/img.')
  getDb()
    .prepare('UPDATE corrections SET image_set = 1, image_path = ? WHERE candidate_id = ?')
    .run(rel, id)
}

function loadViews(): View[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.path, c.path_original, c.name, c.name_key, c.class_name, c.extract_category,
              c.group_kind, c.item_type, c.subtype, c.character_id, c.family_label, c.origin_hint,
              r.removed, r.type_set, r.item_type AS override_type, r.subtype AS override_subtype,
              r.character_set, r.character_id AS override_character, r.image_set, r.image_path AS override_image,
              r.dedupe_reason
       FROM candidates c
       LEFT JOIN corrections r ON r.candidate_id = c.id`,
    )
    .all() as Stored[]
  return rows.map(toView)
}

function toView(row: Stored): View {
  const typeSet = row.type_set === 1
  const itemType = typeSet ? row.override_type : row.item_type
  const subtype = typeSet ? row.override_subtype : row.subtype
  const characterId = row.character_set === 1 ? row.override_character : row.character_id
  const groupKind = typeSet && itemType ? itemType : row.group_kind
  let parentKey = groupKind
  let groupKey = groupKind
  let childLabel: string | null = null
  if (groupKind === 'weapon' || groupKind === 'shield' || groupKind === 'grenade-mod') {
    groupKey = `${groupKind}/${subtype || 'unset'}`
    childLabel = subtypeLabel(subtype) ?? 'No subtype'
  } else if (groupKind === 'class-mod' || groupKind === 'artifact') {
    groupKey = `${groupKind}/${characterId || 'unset'}`
    childLabel = characterLabel(characterId) ?? 'No character'
  } else if (groupKind === 'enemy') {
    groupKey = `enemy/${row.family_label || 'unset'}`
    childLabel = row.family_label || 'No family'
  }
  const imagePath =
    row.image_set === 1
      ? row.override_image
      : autoImage(itemType, row.name, { characterId, path: row.path })
  return {
    stored: row,
    removed: row.removed === 1,
    itemType,
    subtype,
    characterId,
    parentKey,
    groupKey,
    childLabel,
    imagePath,
  }
}

function toRow(view: View, duplicateCount: number): CandidateRow {
  const parent = groupLabel(view.parentKey)
  return {
    id: view.stored.id,
    name: view.stored.name,
    path: view.stored.path_original,
    className: view.stored.class_name,
    originLabel: originLabel(view.stored.origin_hint),
    groupKey: view.groupKey,
    groupLabel: view.childLabel ? `${parent} · ${view.childLabel}` : parent,
    subtypeLabel: subtypeLabel(view.subtype),
    characterLabel: characterLabel(view.characterId),
    imageUrl: imageUrl(view.imagePath),
    duplicateCount,
    removed: view.removed,
    dedupeReason: view.stored.dedupe_reason,
    named: view.parentKey === 'enemy' && /\.named\./i.test(view.stored.path_original),
  }
}

function extractedLabel(row: Stored): string {
  const parent = groupLabel(row.group_kind)
  if (row.item_type === 'weapon' || row.item_type === 'shield' || row.item_type === 'grenade-mod') {
    return `${itemTypeLabel(row.item_type)} · ${subtypeLabel(row.subtype) ?? 'No subtype'}`
  }
  if (row.item_type === 'class-mod' || row.item_type === 'artifact') {
    return `${itemTypeLabel(row.item_type)} · ${characterLabel(row.character_id) ?? 'No character'}`
  }
  return parent
}

function duplicateCounts(views: View[]): Map<string, number> {
  const groups = new Map<string, View[]>()
  for (const view of views) {
    if (!view.stored.name_key) continue
    const key = `${view.stored.name_key}\0${view.stored.class_name}`
    const list = groups.get(key) ?? []
    list.push(view)
    groups.set(key, list)
  }
  const counts = new Map<string, number>()
  for (const list of groups.values()) {
    if (list.length < 2) continue
    for (const view of list) counts.set(view.stored.id, list.length - 1)
  }
  return counts
}

function duplicateIds(pool: View[], view: View): DuplicatePointer[] {
  if (!view.stored.name_key) return []
  return pool
    .filter(
      (other) =>
        other.stored.id !== view.stored.id &&
        other.stored.name_key === view.stored.name_key &&
        other.stored.class_name === view.stored.class_name,
    )
    .map((other) => ({
      id: other.stored.id,
      name: other.stored.name || other.stored.path_original,
      path: other.stored.path_original,
      groupKey: other.groupKey,
      groupLabel: other.childLabel ? `${groupLabel(other.parentKey)} · ${other.childLabel}` : groupLabel(other.parentKey),
    }))
}

function ensure(id: string): void {
  const row = getDb().prepare('SELECT id FROM candidates WHERE id = ?').get(id)
  if (!row) throw new Error('That candidate is not in the store.')
  getDb()
    .prepare('INSERT INTO corrections (candidate_id) VALUES (?) ON CONFLICT(candidate_id) DO NOTHING')
    .run(id)
}

function byGroup(a: string, b: string): number {
  const ai = GROUP_ORDER.indexOf(a)
  const bi = GROUP_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return groupLabel(a).localeCompare(groupLabel(b))
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}

function gear(itemType: string | null): boolean {
  return (
    itemType === 'weapon' ||
    itemType === 'shield' ||
    itemType === 'grenade-mod' ||
    itemType === 'class-mod' ||
    itemType === 'artifact'
  )
}

type Loose = Record<string, unknown>

function readChunk(file: string, cache: Map<string, Loose[]>): Loose[] {
  const cached = cache.get(file)
  if (cached) return cached
  const full = path.resolve(extractDir, file)
  const root = path.resolve(extractDir)
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Refusing to read ${file}.`)
  }
  const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as unknown
  const list = Array.isArray(parsed) ? (parsed.filter((item) => item && typeof item === 'object') as Loose[]) : []
  cache.set(file, list)
  return list
}
