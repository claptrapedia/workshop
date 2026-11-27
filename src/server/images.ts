import fs from 'node:fs'
import path from 'node:path'

import { imgDir } from './paths.ts'
import { slug } from './classify.ts'

const FOLDERS: Record<string, string> = {
  weapon: 'weapons',
  shield: 'shields',
  'grenade-mod': 'grenade-mods',
  'class-mod': 'class-mods',
  artifact: 'artifacts',
}

let cached: Set<string> | null = null

function walk(dir: string, prefix: string, into: Set<string>): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) walk(path.join(dir, entry.name), rel, into)
    else if (entry.name.endsWith('.png')) into.add(rel)
  }
}

export function imageFiles(): Set<string> {
  if (!cached) {
    const files = new Set<string>()
    walk(imgDir, '', files)
    cached = files
  }
  return cached
}

export function autoImage(
  itemType: string | null,
  name: string,
  extra?: { characterId?: string | null; path?: string },
): string | null {
  if (!itemType) return null
  if (itemType === 'artifact' && extra?.characterId && extra.path) {
    const element = extra.path.toLowerCase().match(/\.(corrosive|explosive|incendiary|shock)_level_/)
    if (element) {
      const card = `borderlands/artifacts/${extra.characterId}-${element[1]}.png`
      if (imageFiles().has(card)) return card
    }
  }
  if (!name) return null
  const folder = FOLDERS[itemType]
  if (!folder) return null
  const rel = `borderlands/${folder}/${slug(name)}.png`
  return imageFiles().has(rel) ? rel : null
}

export function imageUrl(rel: string | null): string | null {
  return rel ? `/cards/${rel}` : null
}
