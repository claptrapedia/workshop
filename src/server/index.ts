import { execFile } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { createServer as createViteServer } from 'vite'

import { metaGet } from './db.ts'
import { applyDedupe } from './dedupe.ts'
import { applyFolds } from './fold.ts'
import { importExtract, storeIsReady } from './extract.ts'
import { imageFiles } from './images.ts'
import {
  candidateDetail,
  groups,
  listCandidates,
  loadRecords,
  removeCandidate,
  restoreCandidate,
  saveBucket,
  saveImage,
  summarize,
} from './library.ts'
import { imgDir, root, stagingRoot } from './paths.ts'
import { cancelSnapshot, confirmSnapshot, exportSnapshot, resetStore, stageSnapshot } from './snapshot.ts'

if (process.versions.node !== '26.13.1') {
  console.error(`Workshop needs Node 26.13.1 (.nvmrc). This process is ${process.versions.node}.`)
  process.exit(1)
}

const upload = multer({ dest: stagingRoot, limits: { fileSize: 200 * 1024 * 1024 } })

function ensureStaging(_req: Request, _res: Response, next: NextFunction): void {
  fs.mkdirSync(stagingRoot, { recursive: true })
  next()
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function status() {
  const ready = storeIsReady()
  if (!ready) return { ready: false }
  return {
    ready: true,
    summary: summarize(),
    capture: {
      extractor: metaGet('extractor') ?? '',
      created: metaGet('created') ?? '',
      status: metaGet('capture_status') ?? '',
    },
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(path.join(root, '.staging'), { recursive: true })
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/status', (_req, res) => {
    res.json(status())
  })

  app.post('/api/extract', ensureStaging, upload.single('file'), (req, res) => {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'Choose a zip file.' })
      return
    }
    try {
      const summary = importExtract(file.path)
      res.json({ ok: true, summary })
    } catch (error) {
      res.status(400).json({ error: message(error) })
    } finally {
      fs.rmSync(file.path, { force: true })
    }
  })

  app.get('/api/groups', (req, res) => {
    if (!storeIsReady()) {
      res.status(400).json({ error: 'Upload an extract first.' })
      return
    }
    res.json(groups(req.query.removed === '1'))
  })

  app.get('/api/candidates', (req, res) => {
    if (!storeIsReady()) {
      res.status(400).json({ error: 'Upload an extract first.' })
      return
    }
    res.json(
      listCandidates({
        group: String(req.query.group ?? ''),
        q: String(req.query.q ?? ''),
        missing: req.query.missing === '1',
        removed: req.query.removed === '1',
      }),
    )
  })

  app.get('/api/candidates/detail', (req, res) => {
    const detail = candidateDetail(String(req.query.id ?? ''))
    if (!detail) {
      res.status(404).json({ error: 'That candidate is not in the store.' })
      return
    }
    res.json(detail)
  })

  app.get('/api/candidates/records', (req, res) => {
    const records = loadRecords(String(req.query.id ?? ''))
    if (!records) {
      res.status(404).json({ error: 'That candidate is not in the store.' })
      return
    }
    res.json(records)
  })

  app.post('/api/candidates/remove', (req, res) => {
    try {
      removeCandidate(String(req.body?.id ?? ''))
      res.json({ ok: true, summary: summarize() })
    } catch (error) {
      res.status(400).json({ error: message(error) })
    }
  })

  app.post('/api/candidates/restore', (req, res) => {
    try {
      restoreCandidate(String(req.body?.id ?? ''))
      res.json({ ok: true, summary: summarize() })
    } catch (error) {
      res.status(400).json({ error: message(error) })
    }
  })

  app.patch('/api/candidates', (req, res) => {
    const id = String(req.body?.id ?? '')
    try {
      if (req.body?.bucket) {
        const bucket = req.body.bucket as {
          reset?: boolean
          itemType?: string | null
          subtype?: string | null
          characterId?: string | null
        }
        saveBucket(id, {
          reset: Boolean(bucket.reset),
          itemType: bucket.itemType ?? null,
          subtype: bucket.subtype ?? null,
          characterId: bucket.characterId ?? null,
        })
      }
      if (req.body?.image) {
        const image = req.body.image as { mode?: 'auto' | 'none' | 'file'; path?: string }
        const mode = image.mode
        if (mode !== 'auto' && mode !== 'none' && mode !== 'file') {
          throw new Error('Choose an image.')
        }
        saveImage(id, { mode, path: image.path })
      }
      const detail = candidateDetail(id)
      res.json(detail)
    } catch (error) {
      res.status(400).json({ error: message(error) })
    }
  })

  app.get('/api/images', (req, res) => {
    const needle = String(req.query.q ?? '').trim().toLowerCase()
    const files = [...imageFiles()]
      .filter((file) => !needle || file.toLowerCase().includes(needle))
      .sort()
    res.json(files)
  })

  app.get('/api/snapshot', (_req, res) => {
    try {
      const file = exportSnapshot()
      res.download(file, 'claptrapedia-workshop-snapshot.zip', () => {
        fs.rmSync(file, { force: true })
      })
    } catch (error) {
      res.status(400).json({ error: message(error) })
    }
  })

  app.post('/api/snapshot/check', ensureStaging, upload.single('file'), (req, res) => {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'Choose a snapshot zip.' })
      return
    }
    try {
      res.json(stageSnapshot(file.path))
    } catch (error) {
      res.status(400).json({ error: message(error) })
    } finally {
      fs.rmSync(file.path, { force: true })
    }
  })

  app.post('/api/snapshot/confirm', (req, res) => {
    try {
      confirmSnapshot(String(req.body?.token ?? ''))
      res.json(status())
    } catch (error) {
      res.status(400).json({ error: message(error) })
    }
  })

  app.post('/api/snapshot/cancel', (req, res) => {
    cancelSnapshot(String(req.body?.token ?? ''))
    res.json({ ok: true })
  })

  app.post('/api/reset', (req, res) => {
    if (req.body?.confirm !== 'CONFIRM') {
      res.status(400).json({ error: 'Type CONFIRM to reset.' })
      return
    }
    resetStore()
    res.json({ ready: false })
  })

  app.use('/cards', express.static(imgDir, { index: false, dotfiles: 'deny', redirect: false }))

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: message(error) })
  })

  const server = http.createServer(app)
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  })
  app.use(vite.middlewares)

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error('Port 7914 is already in use.')
      process.exit(1)
    }
    throw error
  })

  server.requestTimeout = 0
  if (storeIsReady()) {
    applyDedupe()
    applyFolds()
  }
  server.listen(7914, '127.0.0.1', () => {
    const url = 'http://127.0.0.1:7914'
    console.log(url)
    if (process.env.WORKSHOP_NO_OPEN !== '1') execFile('open', [url], () => {})
  })
}

main().catch((error: unknown) => {
  console.error(message(error))
  process.exit(1)
})
