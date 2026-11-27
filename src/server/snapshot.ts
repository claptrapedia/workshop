import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { strToU8, unzipSync, zipSync } from 'fflate'

import { closeDb, getDb } from './db.ts'
import { dataDir, dbPath, extractDir, stagingRoot } from './paths.ts'

const FORMAT = 'claptrapedia-workshop-snapshot'
const VERSION = 1

const pending = new Map<string, string>()

export function exportSnapshot(): string {
  if (!fs.existsSync(dbPath) || !fs.existsSync(path.join(extractDir, 'manifest.json'))) {
    throw new Error('There is no workshop store to export.')
  }
  getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
  const files: Record<string, Uint8Array> = {
    'snapshot.json': strToU8(JSON.stringify({ format: FORMAT, version: VERSION })),
    'workshop.sqlite': new Uint8Array(fs.readFileSync(dbPath)),
  }
  addDir(extractDir, 'extract/', files)
  const tmp = path.join(os.tmpdir(), `workshop-snapshot-${randomUUID()}.zip`)
  fs.writeFileSync(tmp, zipSync(files, { level: 1 }))
  return tmp
}

export function stageSnapshot(zipPath: string): { token: string } {
  const token = randomUUID()
  const dir = path.join(stagingRoot, token)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(fs.readFileSync(zipPath)))
  } catch {
    fs.rmSync(dir, { recursive: true, force: true })
    throw new Error('The file is not a zip archive.')
  }
  try {
    for (const [name, data] of Object.entries(entries)) {
      const rel = name.replaceAll('\\', '/')
      if (!rel || rel.endsWith('/') || rel.includes('__MACOSX')) continue
      writeUnder(dir, rel, data)
    }
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true })
    throw error
  }
  const problems = snapshotProblems(dir)
  if (problems.length) {
    fs.rmSync(dir, { recursive: true, force: true })
    throw new Error(problems.join('\n'))
  }
  pending.set(token, dir)
  return { token }
}

export function confirmSnapshot(token: string): void {
  const dir = pending.get(token)
  if (!dir || !fs.existsSync(dir)) {
    throw new Error('That import has expired. Choose the snapshot again.')
  }
  closeDb()
  const backup = `${dataDir}-previous`
  fs.rmSync(backup, { recursive: true, force: true })
  const hadStore = fs.existsSync(dataDir)
  if (hadStore) fs.renameSync(dataDir, backup)
  try {
    fs.renameSync(dir, dataDir)
    if (hadStore) fs.rmSync(backup, { recursive: true, force: true })
    pending.delete(token)
    getDb()
  } catch (error) {
    if (hadStore && fs.existsSync(backup) && !fs.existsSync(dataDir)) fs.renameSync(backup, dataDir)
    getDb()
    throw error
  }
}

export function cancelSnapshot(token: string): void {
  const dir = pending.get(token)
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
  pending.delete(token)
}

export function resetStore(): void {
  closeDb()
  for (const dir of pending.values()) fs.rmSync(dir, { recursive: true, force: true })
  pending.clear()
  fs.rmSync(dataDir, { recursive: true, force: true })
  fs.rmSync(stagingRoot, { recursive: true, force: true })
  fs.rmSync(`${dataDir}-previous`, { recursive: true, force: true })
}

function snapshotProblems(dir: string): string[] {
  const problems: string[] = []
  const snapshotPath = path.join(dir, 'snapshot.json')
  if (!fs.existsSync(snapshotPath)) {
    problems.push('Missing snapshot.json.')
  } else {
    try {
      const body = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as { format?: string; version?: number }
      if (body.format !== FORMAT) problems.push('This zip is not a workshop snapshot.')
      else if (body.version !== VERSION) {
        problems.push(`This snapshot is version ${String(body.version)}. This workshop reads version ${VERSION}.`)
      }
    } catch {
      problems.push('snapshot.json is not JSON.')
    }
  }
  if (!fs.existsSync(path.join(dir, 'workshop.sqlite'))) problems.push('Missing workshop.sqlite.')
  if (!fs.existsSync(path.join(dir, 'extract', 'manifest.json'))) problems.push('Missing extract/manifest.json.')
  return problems
}

function addDir(dir: string, prefix: string, files: Record<string, Uint8Array>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    const full = path.join(dir, entry.name)
    const name = prefix + entry.name
    if (entry.isDirectory()) addDir(full, `${name}/`, files)
    else files[name] = new Uint8Array(fs.readFileSync(full))
  }
}

function writeUnder(root: string, rel: string, data: Uint8Array): void {
  if (rel.split('/').includes('..') || path.posix.isAbsolute(rel)) {
    throw new Error(`The zip entry "${rel}" is not a safe path.`)
  }
  const dest = path.resolve(root, rel)
  const base = path.resolve(root)
  if (dest !== base && !dest.startsWith(base + path.sep)) {
    throw new Error(`Refusing to write ${rel}.`)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, data)
}
