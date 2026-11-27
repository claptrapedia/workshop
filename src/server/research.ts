import { createHash } from 'node:crypto'

import type { ItemSource, ResearchView, SourceScope, SourceSignal, SourceSite, WeaponDraft } from '../shared/types.ts'
import { completeAgent, getAgent } from './agent.ts'
import { getDb } from './db.ts'
import { captureText, openUrl, storePageCapture, type SourceReaders } from './sources.ts'

export type AgentReply = (purpose: 'search' | 'draft', prompt: string) => Promise<{ model: string; reply: string }>

export function researchView(candidateId: string): ResearchView {
  const weapon = hellfire(candidateId)
  const scopes = weaponScopes(weapon.id)
  const rows = readSources()
  const sources = rows.filter((row) => row.candidateId === weapon.id)
  const shared = rows.filter((row) => row.scope && matches(row.scope, scopes) && row.candidateId !== weapon.id)
  return {
    candidateId: weapon.id,
    name: weapon.name,
    sources,
    shared,
    scopes,
    draft: showDraft(readDraft(weapon.id)),
    canWrite: sources.some((row) => !row.rejected && row.via === 'fetch'),
  }
}

export async function findPages(candidateId: string, replyWith?: AgentReply): Promise<ResearchView> {
  const weapon = hellfire(candidateId)
  const { reply } = await ask(
    'search',
    [
      'Find the direct pages for one Borderlands 1 weapon.',
      `Name: ${weapon.name}`,
      'It is a Maliwan SMG.',
      'Return JSON only, with no markdown:',
      '{"wiki":"https://borderlands.fandom.com/wiki/Page","lootlemon":"https://www.lootlemon.com/weapon/slug"}',
      'The wiki URL must be on borderlands.fandom.com. The LootLemon URL must be a weapon page on www.lootlemon.com.',
      'Use null when you cannot find a direct page. Do not invent a URL. Do not return a search page or a category page.',
    ].join('\n'),
    replyWith,
  )
  const urls = pagesIn(reply)
  if (!urls.length) throw new Error(`The agent did not find a direct page.\n\n${clip(reply)}`)
  const scopes = weaponScopes(weapon.id)
  const existing = readSources()
  for (const item of urls) {
    const prior = existing.find((row) => row.url === item.url)
    if (prior?.rejected && prior.candidateId === weapon.id) continue
    if (prior?.scope && matches(prior.scope, scopes)) continue
    if (prior && !prior.rejected) continue
    writeSource(blankSource(weapon.id, item.site, item.url))
  }
  return researchView(weapon.id)
}

export function addSource(candidateId: string, rawUrl: string): ResearchView {
  const weapon = hellfire(candidateId)
  const accepted = acceptUrl('wiki', rawUrl) ?? acceptUrl('lootlemon', rawUrl)
  if (!accepted) throw new Error('Use a Borderlands Wiki page or a LootLemon weapon page.')
  const existing = readSources()
  const prior = existing.find((row) => row.url === accepted.url)
  if (prior?.rejected && prior.candidateId === weapon.id) throw new Error('That URL stays rejected.')
  if (prior?.scope && matches(prior.scope, weaponScopes(weapon.id))) throw new Error('That URL is already shared.')
  if (prior && !prior.rejected) throw new Error('That URL is already saved.')
  writeSource(blankSource(weapon.id, accepted.site, accepted.url))
  return researchView(weapon.id)
}

export function rejectSource(sourceId: string): ResearchView {
  const source = mustSource(sourceId)
  const owner = source.candidateId ?? hellfireId()
  if (!owner) throw new Error('Hellfire is not in the working set.')
  if (source.candidateId) hellfire(source.candidateId)
  writeSource({ ...source, rejected: true })
  return researchView(owner)
}

export function restoreSource(sourceId: string): ResearchView {
  const source = mustSource(sourceId)
  if (!source.rejected) throw new Error('That URL is not rejected.')
  const owner = source.candidateId ?? hellfireId()
  if (!owner) throw new Error('Hellfire is not in the working set.')
  if (source.candidateId) hellfire(source.candidateId)
  writeSource({ ...source, rejected: false })
  return researchView(owner)
}

export function removeShared(sourceId: string): ResearchView {
  const source = mustSource(sourceId)
  if (source.candidateId) throw new Error('Reject an item URL. Remove is for a shared page.')
  const owner = hellfireId()
  if (!owner) throw new Error('Hellfire is not in the working set.')
  getDb().prepare('DELETE FROM sources WHERE id = ?').run(sourceId)
  return researchView(owner)
}

export function shareSource(sourceId: string, kind: unknown, value: unknown): ResearchView {
  const source = mustSource(sourceId)
  if (!source.candidateId) throw new Error('That URL is already shared.')
  const weapon = hellfire(source.candidateId)
  const scope = weaponScopes(weapon.id).find((item) => item.kind === kind && item.value === value)
  if (!scope) throw new Error('Choose a scope this weapon matches.')
  writeSource({ ...source, candidateId: null, scope, rejected: false })
  return researchView(weapon.id)
}

export async function fetchItemSource(sourceId: string, readers: SourceReaders = {}): Promise<ResearchView> {
  const source = mustSource(sourceId)
  const owner = source.candidateId ?? hellfireId()
  if (!owner) throw new Error('Hellfire is not in the working set.')
  try {
    const stored = await storePageCapture(source.id, source.site, source.url, readers)
    writeSource({
      ...source,
      fact: stored.fact,
      via: 'fetch',
      capturedAt: new Date().toISOString(),
      signal: stored.signal,
      error: null,
    })
  } catch (error) {
    writeSource({ ...source, error: error instanceof Error ? error.message : String(error) })
  }
  return researchView(owner)
}

export async function openItemSource(sourceId: string): Promise<void> {
  const source = mustSource(sourceId)
  await openUrl(source.url)
}

export async function writeDraft(candidateId: string, replyWith?: AgentReply): Promise<ResearchView> {
  const view = researchView(candidateId)
  if (view.draft?.approved) throw new Error('This draft is approved. A new proposal will not replace it.')
  if (!view.canWrite) throw new Error('Fetch Hellfire’s own page before writing the draft.')
  const records = recordText(view.candidateId)
  const evidence = [
    ...view.sources.filter((row) => !row.rejected && row.via),
    ...view.shared.filter((row) => !row.rejected && row.via),
  ]
  const { model, reply } = await ask(
    'draft',
    [
      'Write the catalogue draft for the Borderlands 1 weapon Hellfire.',
      'Use British spelling. Write sentences that belong to this catalogue.',
      'Do not copy a sentence from the sources. Do not quote the wiki or LootLemon.',
      'Leave a field empty when the evidence does not support it.',
      'Return JSON only, with no markdown:',
      '{"summary":"","description":"","manufacturer":"","element":"","rarity":"","damage":""}',
      'summary is one sentence. description is two or three sentences.',
      '',
      'Game records:',
      records,
      '',
      ...evidence.flatMap((row) => [
        `Source ${row.url}${row.scope ? ` shared as ${row.scope.kind} ${row.scope.value}` : ''}`,
        clip(captureText(row.id)),
        '',
      ]),
    ].join('\n'),
    replyWith,
  )
  const body = jsonObject(reply) as Record<string, unknown>
  const draft: WeaponDraft = {
    candidateId: view.candidateId,
    name: view.name,
    summary: text(body.summary),
    description: text(body.description),
    manufacturer: text(body.manufacturer),
    element: text(body.element),
    rarity: text(body.rarity),
    damage: text(body.damage),
    approved: false,
    model,
  }
  if (!draft.summary && !draft.description) throw new Error('The agent returned an empty draft.')
  storeDraft(draft)
  return researchView(view.candidateId)
}

export function saveDraft(candidateId: string, patch: Partial<WeaponDraft>): ResearchView {
  const weapon = hellfire(candidateId)
  const current = readDraft(weapon.id)
  const next: StoredDraft = {
    candidateId: weapon.id,
    name: weapon.name,
    summary: text(patch.summary ?? current?.summary),
    description: text(patch.description ?? current?.description),
    manufacturer: text(patch.manufacturer ?? current?.manufacturer),
    element: text(patch.element ?? current?.element),
    rarity: text(patch.rarity ?? current?.rarity),
    damage: text(patch.damage ?? current?.damage),
    approved: current?.approved ?? false,
    model: current?.model ?? null,
    held: current?.approved ? current.held : undefined,
  }
  storeDraft(next)
  return researchView(weapon.id)
}

export function approveDraft(candidateId: string): ResearchView {
  const weapon = hellfire(candidateId)
  const current = readDraft(weapon.id)
  if (!current) throw new Error('There is no draft to approve.')
  storeDraft({ ...current, approved: true, held: fields(current) })
  return researchView(weapon.id)
}

export function unapproveDraft(candidateId: string): ResearchView {
  const weapon = hellfire(candidateId)
  const current = readDraft(weapon.id)
  if (!current?.approved) throw new Error('That draft is not approved.')
  const held = current.held ?? fields(current)
  storeDraft({ ...current, ...held, approved: false, held: undefined })
  return researchView(weapon.id)
}

async function ask(
  purpose: 'search' | 'draft',
  prompt: string,
  replyWith?: AgentReply,
): Promise<{ model: string; reply: string }> {
  if (replyWith) return replyWith(purpose, prompt)
  return completeAgent(getAgent(), prompt, purpose)
}

function hellfire(candidateId: string): { id: string; name: string } {
  const row = getDb()
    .prepare(
      `SELECT c.id AS id, c.name AS name, c.path AS path
       FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE c.id = ? AND IFNULL(cor.removed, 0) = 0`,
    )
    .get(candidateId) as { id: string; name: string; path: string } | undefined
  if (!row || !row.path.toLowerCase().includes('titlem_maliwan1_hellfire')) {
    throw new Error('Find pages is only on Hellfire in this pass.')
  }
  return row
}

function hellfireId(): string | null {
  const row = getDb()
    .prepare(
      `SELECT c.id AS id FROM candidates c
       LEFT JOIN corrections cor ON cor.candidate_id = c.id
       WHERE lower(c.path) LIKE '%titlem_maliwan1_hellfire' AND IFNULL(cor.removed, 0) = 0`,
    )
    .get() as { id: string } | undefined
  return row?.id ?? null
}

function weaponScopes(id: string): SourceScope[] {
  const row = getDb()
    .prepare(
      `SELECT c.item_type AS itemType, c.subtype AS subtype,
              r.type_set AS typeSet, r.item_type AS overrideType, r.subtype AS overrideSubtype
       FROM candidates c
       LEFT JOIN corrections r ON r.candidate_id = c.id
       WHERE c.id = ?`,
    )
    .get(id) as
    | {
        itemType: string | null
        subtype: string | null
        typeSet: number | bigint | null
        overrideType: string | null
        overrideSubtype: string | null
      }
    | undefined
  const corrected = Number(row?.typeSet ?? 0) === 1
  const itemType = (corrected ? row?.overrideType : row?.itemType) || 'weapon'
  const subtype = corrected ? row?.overrideSubtype : row?.subtype
  const scopes: SourceScope[] = [
    { kind: 'game', value: 'borderlands' },
    { kind: 'item-type', value: itemType },
  ]
  if (subtype) scopes.push({ kind: 'subtype', value: subtype })
  scopes.push({ kind: 'manufacturer', value: 'maliwan' }, { kind: 'element', value: 'incendiary' })
  return scopes
}

function matches(scope: SourceScope, scopes: SourceScope[]): boolean {
  return scopes.some((item) => item.kind === scope.kind && item.value === scope.value)
}

function pagesIn(reply: string): { site: SourceSite; url: string }[] {
  let body: { wiki?: unknown; lootlemon?: unknown } = {}
  try {
    body = jsonObject(reply) as { wiki?: unknown; lootlemon?: unknown }
  } catch {
    body = {}
  }
  const chosen = [acceptUrl('wiki', body.wiki), acceptUrl('lootlemon', body.lootlemon)].filter(
    (item): item is { site: SourceSite; url: string } => Boolean(item),
  )
  if (chosen.length) return chosen
  const found: { site: SourceSite; url: string }[] = []
  for (const match of reply.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) {
    const raw = match[0].replace(/[.,]$/, '')
    for (const site of ['wiki', 'lootlemon'] as const) {
      const accepted = acceptUrl(site, raw)
      if (accepted && !found.some((item) => item.site === accepted.site)) found.push(accepted)
    }
  }
  return found
}

function acceptUrl(site: SourceSite, value: unknown): { site: SourceSite; url: string } | null {
  if (typeof value !== 'string' || !value.trim()) return null
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (site === 'wiki' && url.hostname === 'borderlands.fandom.com' && url.pathname.startsWith('/wiki/') && url.pathname.length > 6) {
    return { site, url: url.toString() }
  }
  if (
    site === 'lootlemon' &&
    (url.hostname === 'www.lootlemon.com' || url.hostname === 'lootlemon.com') &&
    url.pathname.startsWith('/weapon/') &&
    url.pathname.length > 8
  ) {
    return { site, url: url.toString() }
  }
  return null
}

function blankSource(candidateId: string, site: SourceSite, url: string): ItemSource {
  return {
    id: `src-${createHash('sha256').update(url).digest('hex').slice(0, 16)}`,
    candidateId,
    site,
    url,
    rejected: false,
    scope: null,
    fact: null,
    via: null,
    capturedAt: null,
    signal: null as SourceSignal | null,
    error: null,
  }
}

function readSources(): ItemSource[] {
  const rows = getDb().prepare(`SELECT id, body FROM sources WHERE id LIKE 'src-%'`).all() as { id: string; body: string }[]
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.body) as ItemSource]
    } catch {
      return []
    }
  })
}

function mustSource(id: string): ItemSource {
  const source = readSources().find((row) => row.id === id)
  if (!source) throw new Error('Unknown source.')
  return source
}

function writeSource(source: ItemSource): void {
  getDb()
    .prepare(
      `INSERT INTO sources (id, body) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
    )
    .run(source.id, JSON.stringify(source))
}

type HeldFields = {
  summary: string
  description: string
  manufacturer: string
  element: string
  rarity: string
  damage: string
  model: string | null
}

type StoredDraft = WeaponDraft & { held?: HeldFields }

function fields(draft: WeaponDraft): HeldFields {
  return {
    summary: draft.summary,
    description: draft.description,
    manufacturer: draft.manufacturer,
    element: draft.element,
    rarity: draft.rarity,
    damage: draft.damage,
    model: draft.model,
  }
}

function showDraft(draft: StoredDraft | null): WeaponDraft | null {
  if (!draft) return null
  const { held: _held, ...shown } = draft
  return shown
}

function readDraft(candidateId: string): StoredDraft | null {
  const row = getDb().prepare('SELECT body FROM drafts WHERE id = ?').get(candidateId) as { body: string } | undefined
  if (!row) return null
  try {
    return JSON.parse(row.body) as StoredDraft
  } catch {
    return null
  }
}

function storeDraft(draft: StoredDraft): void {
  getDb()
    .prepare(
      `INSERT INTO drafts (id, body) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
    )
    .run(draft.candidateId, JSON.stringify(draft))
}

function recordText(candidateId: string): string {
  const rows = getDb()
    .prepare('SELECT record_type, body FROM records WHERE candidate_id = ? ORDER BY sort')
    .all(candidateId) as { record_type: string; body: string | null }[]
  return clip(rows.map((row) => `${row.record_type}\n${row.body ?? ''}`).join('\n'))
}

function clip(value: string): string {
  return value.length > 6000 ? `${value.slice(0, 6000)}\n…` : value
}

function jsonObject(value: string): unknown {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The agent did not return JSON.')
  try {
    return JSON.parse(value.slice(start, end + 1)) as unknown
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'The agent did not return JSON.')
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
