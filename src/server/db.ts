import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import { dataDir, dbPath } from './paths.ts'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  path_original TEXT NOT NULL,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  class_name TEXT NOT NULL,
  extract_category TEXT NOT NULL,
  group_kind TEXT NOT NULL,
  item_type TEXT,
  subtype TEXT,
  character_id TEXT,
  family_label TEXT,
  origin_hint TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS corrections (
  candidate_id TEXT PRIMARY KEY,
  removed INTEGER NOT NULL DEFAULT 0,
  type_set INTEGER NOT NULL DEFAULT 0,
  item_type TEXT,
  subtype TEXT,
  character_set INTEGER NOT NULL DEFAULT 0,
  character_id TEXT,
  image_set INTEGER NOT NULL DEFAULT 0,
  image_path TEXT,
  dedupe_reason TEXT
);
CREATE TABLE IF NOT EXISTS records (
  candidate_id TEXT NOT NULL,
  sort INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  file TEXT,
  body TEXT
);
CREATE INDEX IF NOT EXISTS records_candidate ON records (candidate_id, sort);
CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS shared_sources (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS captures (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS change_signals (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS export_history (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`

let database: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!database) {
    fs.mkdirSync(dataDir, { recursive: true })
    database = new DatabaseSync(dbPath)
    database.exec('PRAGMA journal_mode = WAL')
    database.exec(SCHEMA)
    const columns = database.prepare('PRAGMA table_info(corrections)').all() as { name: string }[]
    if (!columns.some((column) => column.name === 'dedupe_reason')) {
      database.exec('ALTER TABLE corrections ADD COLUMN dedupe_reason TEXT')
    }
  }
  return database
}

export function closeDb(): void {
  database?.close()
  database = null
}

export function metaGet(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function metaSet(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value)
}
