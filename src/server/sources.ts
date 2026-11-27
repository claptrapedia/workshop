import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'

import type { SourceProof, SourceSignal, SourceSite } from '../shared/types.ts'
import { getDb } from './db.ts'

const WIKI_PAGE = 'Hellfire_(Borderlands)'
const WIKI_URL = 'https://borderlands.fandom.com/wiki/Hellfire_(Borderlands)'
const LOOTLEMON_URL = 'https://www.lootlemon.com/weapon/hellfire-bl1'

const PROOFS: { id: string; site: SourceSite; name: string; url: string; page?: string }[] = [
  { id: 'proof-wiki-hellfire', site: 'wiki', name: 'Hellfire', url: WIKI_URL, page: WIKI_PAGE },
  { id: 'proof-lootlemon-hellfire', site: 'lootlemon', name: 'Hellfire', url: LOOTLEMON_URL },
]

const emptySignal = (): SourceSignal => ({
  revisionId: null,
  revisedAt: null,
  etag: null,
  lastModified: null,
  factHash: null,
})

export function listSources(): SourceProof[] {
  return PROOFS.map((proof) => readSource(proof.id) ?? blank(proof))
}

export function captureText(id: string): string {
  const row = getDb().prepare('SELECT body FROM captures WHERE id = ?').get(id) as { body: string } | undefined
  if (!row) {
    if (!PROOFS.some((item) => item.id === id) && !id.startsWith('src-')) throw new Error('Unknown source.')
    throw new Error('No capture stored.')
  }
  const body = JSON.parse(row.body) as { text?: unknown }
  if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('No capture stored.')
  return body.text
}

export function openUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('open', [url], (error) => {
      if (error) reject(new Error(error.message))
      else resolve()
    })
  })
}

export async function openSource(id: string): Promise<void> {
  const proof = known(id)
  await openUrl(proof.url)
}

export async function storePageCapture(
  id: string,
  site: SourceSite,
  url: string,
  readers: SourceReaders = {},
): Promise<{ fact: string; signal: SourceSignal }> {
  if (site === 'wiki') {
    const read = readers.wiki ?? wikiJson
    const page = wikiPageName(url)
    const parsed = await read(wikiParseUrl(page))
    const queried = await read(wikiRevisionUrl(page))
    const text = wikitextOf(parsed)
    const revision = revisionOf(queried)
    let fact = page.replaceAll('_', ' ')
    try {
      fact = wikiFact(text)
    } catch {
      fact = page.replaceAll('_', ' ')
    }
    const signal: SourceSignal = { ...emptySignal(), revisionId: revision.revid, revisedAt: revision.timestamp }
    saveCapture(id, text)
    saveSignal(id, signal)
    return { fact, signal }
  }
  const loaded = readers.page ? await readers.page(url) : await renderLootlemon(url)
  const stored = lootlemonCapture(loaded)
  saveCapture(id, stored.text)
  saveSignal(id, stored.signal)
  return { fact: stored.fact, signal: stored.signal }
}

export type SourceReaders = {
  wiki?: (url: string) => Promise<unknown>
  page?: (url: string) => Promise<{ text: string; etag: string | null; lastModified: string | null }>
}

export async function fetchSource(id: string, readers: SourceReaders = {}): Promise<SourceProof> {
  const proof = known(id)
  const current = readSource(id) ?? blank(proof)
  try {
    const next =
      proof.site === 'wiki' ? await fetchWiki(proof, readers.wiki ?? wikiJson) : await fetchLootlemon(proof, readers.page)
    writeSource(next)
    return next
  } catch (error) {
    const failed = { ...current, error: error instanceof Error ? error.message : String(error) }
    writeSource(failed)
    return failed
  }
}

export function wikiFact(wikitext: string): string {
  const field = (name: string) => {
    const match = wikitext.match(new RegExp(`^\\|\\s*${name}\\s*=\\s*(.*)$`, 'im'))
    return match?.[1]?.replace(/\[\[|\]\]/g, '').trim() ?? ''
  }
  const name = [field('manufacturer'), field('element'), field('type')].filter(Boolean).join(' ')
  const low = field('damage_low')
  const high = field('damage_high')
  const damage = low && high ? `, damage ${low}–${high}` : ''
  const fact = `${name}${damage}`.trim()
  if (!fact) throw new Error('The wiki parse had no weapon fact.')
  return fact
}

export function lootlemonFacts(text: string): { names: string[]; explosion: string | null } {
  const names: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (/^(?:Body|Barrel|Mag|Stock|Sight|Maliwan)(?:_\d+| None)?$|^Twisted$|^Thumper$/.test(line)) names.push(line)
  }
  const explosion = text.match(/deals (\d+%) Damage/i)?.[1] ?? null
  return { names: [...new Set(names)], explosion }
}

export function lootlemonFact(text: string): string {
  const { names, explosion } = lootlemonFacts(text)
  if (!names.length && !explosion) throw new Error('The rendered page had no part names or card numbers.')
  const shown = [
    names.find((name) => name.startsWith('Body_')),
    names.find((name) => name === 'Twisted'),
    names.find((name) => name === 'Thumper'),
    names.find((name) => name.startsWith('Maliwan_')),
  ].filter((name): name is string => Boolean(name))
  const bits = []
  if (/\bMaliwan\b/.test(text) && /\bSMG\b/.test(text)) bits.push('Maliwan SMG')
  if (shown.length) bits.push(shown.join(', '))
  else if (names.length) bits.push(names.slice(0, 4).join(', '))
  if (explosion) bits.push(`fire explosion ${explosion}`)
  return bits.join(' · ')
}

async function fetchWiki(
  proof: (typeof PROOFS)[number],
  read: (url: string) => Promise<unknown>,
): Promise<SourceProof> {
  const page = proof.page ?? WIKI_PAGE
  const parsed = await read(wikiParseUrl(page))
  const queried = await read(wikiRevisionUrl(page))
  const wikitext = wikitextOf(parsed)
  const revision = revisionOf(queried)
  const fact = wikiFact(wikitext)
  const signal: SourceSignal = { ...emptySignal(), revisionId: revision.revid, revisedAt: revision.timestamp }
  saveCapture(proof.id, wikitext)
  saveSignal(proof.id, signal)
  return {
    ...blank(proof),
    fact,
    via: 'fetch',
    capturedAt: new Date().toISOString(),
    signal,
    error: null,
  }
}

async function fetchLootlemon(
  proof: (typeof PROOFS)[number],
  read?: (url: string) => Promise<{ text: string; etag: string | null; lastModified: string | null }>,
): Promise<SourceProof> {
  const loaded = read ? await read(proof.url) : await renderLootlemon(proof.url)
  const stored = lootlemonCapture(loaded)
  saveCapture(proof.id, stored.text)
  saveSignal(proof.id, stored.signal)
  return {
    ...blank(proof),
    fact: stored.fact,
    via: 'fetch',
    capturedAt: new Date().toISOString(),
    signal: stored.signal,
    error: null,
  }
}

function lootlemonCapture(loaded: { text: string; etag: string | null; lastModified: string | null }): {
  text: string
  fact: string
  signal: SourceSignal
} {
  if (pageBlocked(loaded.text)) {
    throw new Error('LootLemon showed a check the browser cannot pass. Open is the way through.')
  }
  const article = articleText(loaded.text)
  if (!/hellfire/i.test(article)) throw new Error('The rendered page had no Hellfire article.')
  const fact = lootlemonFact(article)
  const { names, explosion } = lootlemonFacts(article)
  const signal: SourceSignal = {
    ...emptySignal(),
    etag: loaded.etag,
    lastModified: loaded.lastModified,
    factHash: createHash('sha256')
      .update([...names, explosion].filter((item): item is string => Boolean(item)).sort().join('\n'))
      .digest('hex'),
  }
  return { text: article, fact, signal }
}

function wikiParseUrl(page: string): string {
  return `https://borderlands.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`
}

function wikiRevisionUrl(page: string): string {
  return `https://borderlands.fandom.com/api.php?action=query&titles=${encodeURIComponent(page)}&prop=revisions&rvprop=ids|timestamp&format=json`
}

function wikiPageName(url: string): string {
  const path = new URL(url).pathname.replace(/^\/wiki\//, '')
  if (!path) throw new Error('That wiki URL has no page.')
  return decodeURIComponent(path)
}

async function renderLootlemon(url: string): Promise<{ text: string; etag: string | null; lastModified: string | null }> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch((error: unknown) => {
    throw new Error(
      `Chrome could not open for the LootLemon render. ${error instanceof Error ? error.message : String(error)}`,
    )
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } })
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    const accept = page.getByRole('button', { name: 'Accept all' })
    if (await accept.count()) await accept.click({ timeout: 5_000 }).catch(() => {})
    await page
      .getByText('Parts', { exact: true })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {})
    await page
      .getByText('Body_1', { exact: true })
      .waitFor({ timeout: 10_000 })
      .catch(() => {})
    const headers = response?.headers() ?? {}
    return {
      text: await page.locator('body').innerText(),
      etag: headers.etag ?? null,
      lastModified: headers['last-modified'] ?? null,
    }
  } finally {
    await browser.close()
  }
}

function pageBlocked(text: string): boolean {
  const sample = text.slice(0, 1500).toLowerCase()
  return /just a moment|verify you are human|cf-challenge|attention required/.test(sample) && !/hellfire/.test(sample)
}

function articleText(text: string): string {
  const start = text.search(/BORDERLANDS 1\s+Hellfire/)
  const sliced = start >= 0 ? text.slice(start) : text
  const privacy = sliced.search(/We value your privacy/i)
  return (privacy >= 0 ? sliced.slice(0, privacy) : sliced).trim()
}

async function wikiJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ClaptrapediaWorkshop/0.1', Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(text.trim().slice(0, 500) || `Wiki request failed (${response.status}).`)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(text.trim().slice(0, 500) || 'The wiki parse was not JSON.')
  }
}

function wikitextOf(body: unknown): string {
  const parsed = body as { parse?: { wikitext?: { '*'?: unknown } }; error?: { info?: string } }
  if (parsed.error?.info) throw new Error(parsed.error.info)
  const text = parsed.parse?.wikitext?.['*']
  if (typeof text !== 'string' || !text.trim()) throw new Error('The wiki parse returned no wikitext.')
  return text.trim()
}

function revisionOf(body: unknown): { revid: number; timestamp: string } {
  const pages = (body as { query?: { pages?: Record<string, { revisions?: { revid?: number; timestamp?: string }[] }> } })
    .query?.pages
  const revision = Object.values(pages ?? {})[0]?.revisions?.[0]
  if (!revision?.revid || !revision.timestamp) throw new Error('The wiki parse returned no revision.')
  return { revid: revision.revid, timestamp: revision.timestamp }
}

function known(id: string): (typeof PROOFS)[number] {
  const proof = PROOFS.find((item) => item.id === id)
  if (!proof) throw new Error('Unknown source.')
  return proof
}

function blank(proof: (typeof PROOFS)[number]): SourceProof {
  return {
    id: proof.id,
    site: proof.site,
    name: proof.name,
    url: proof.url,
    fact: null,
    via: null,
    capturedAt: null,
    signal: null,
    error: null,
  }
}

function readSource(id: string): SourceProof | null {
  const row = getDb().prepare('SELECT body FROM sources WHERE id = ?').get(id) as { body: string } | undefined
  if (!row) return null
  try {
    return JSON.parse(row.body) as SourceProof
  } catch {
    return null
  }
}

function writeSource(source: SourceProof): void {
  getDb()
    .prepare(
      `INSERT INTO sources (id, body) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
    )
    .run(source.id, JSON.stringify(source))
}

function saveCapture(id: string, text: string): void {
  getDb()
    .prepare(
      `INSERT INTO captures (id, body) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
    )
    .run(id, JSON.stringify({ text }))
}

function saveSignal(id: string, signal: SourceSignal): void {
  getDb()
    .prepare(
      `INSERT INTO change_signals (id, body) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
    )
    .run(id, JSON.stringify(signal))
}
