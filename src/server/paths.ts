import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const root = path.resolve(here, '../..')
export const dataDir = path.join(root, '.data')
export const stagingRoot = path.join(root, '.staging')
export const imgDir = path.join(root, 'src/data/img')
export const dbPath = path.join(dataDir, 'workshop.sqlite')
export const extractDir = path.join(dataDir, 'extract')
