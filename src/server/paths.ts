import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const root = path.resolve(here, '../..')
const home = process.env.WORKSHOP_HOME ? path.resolve(process.env.WORKSHOP_HOME) : root
export const dataDir = path.join(home, '.data')
export const stagingRoot = path.join(home, '.staging')
export const imgDir = path.join(root, 'src/data/img')
export const dbPath = path.join(dataDir, 'workshop.sqlite')
export const extractDir = path.join(dataDir, 'extract')
