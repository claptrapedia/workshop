export type Summary = {
  candidates: number
  weapons: number
  smgs: number
  enemies: number
  locations: number
  missions: number
  shields: number
  grenadeMods: number
  classMods: number
  artifacts: number
  maps: number
}

export type Status = {
  ready: boolean
  error?: string
  summary?: Summary
  capture?: {
    extractor: string
    created: string
    status: string
  }
}

export type GroupNode = {
  key: string
  label: string
  held: number
  done: number
  attention: number
  children: GroupNode[]
}

export type CandidateRow = {
  id: string
  name: string
  path: string
  className: string
  originLabel: string
  groupKey: string
  groupLabel: string
  subtypeLabel: string | null
  characterLabel: string | null
  imageUrl: string | null
  duplicateCount: number
  removed: boolean
  dedupeReason: string | null
  named: boolean
}

export type CandidateList = {
  total: number
  shown: number
  rows: CandidateRow[]
}

export type DuplicatePointer = {
  id: string
  name: string
  path: string
  groupKey: string
  groupLabel: string
}

export type CandidateDetail = CandidateRow & {
  candidateId: string
  className: string
  originHint: string
  extractCategory: string
  extractedLabel: string
  bucket: {
    typeSet: boolean
    itemType: string | null
    subtype: string | null
    characterSet: boolean
    characterId: string | null
  }
  image: {
    mode: 'auto' | 'none' | 'file'
    path: string | null
  }
  duplicates: DuplicatePointer[]
  recordCount: number
}

export type RawRecord = Record<string, unknown>
