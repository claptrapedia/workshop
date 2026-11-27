export type AgentId = 'claude' | 'codex'

export type SourceSite = 'wiki' | 'lootlemon'

export type SourceSignal = {
  revisionId: number | null
  revisedAt: string | null
  etag: string | null
  lastModified: string | null
  factHash: string | null
}

export type SourceScope = {
  kind: 'game' | 'item-type' | 'subtype' | 'manufacturer' | 'element'
  value: string
}

export type ItemSource = {
  id: string
  candidateId: string | null
  site: SourceSite
  url: string
  rejected: boolean
  scope: SourceScope | null
  fact: string | null
  via: 'fetch' | null
  capturedAt: string | null
  signal: SourceSignal | null
  error: string | null
}

export type WeaponDraft = {
  candidateId: string
  name: string
  summary: string
  description: string
  manufacturer: string
  element: string
  rarity: string
  damage: string
  approved: boolean
  model: string | null
}

export type ResearchView = {
  candidateId: string
  name: string
  sources: ItemSource[]
  shared: ItemSource[]
  scopes: SourceScope[]
  draft: WeaponDraft | null
  canWrite: boolean
}

export type SourceProof = {
  id: string
  site: SourceSite
  name: string
  url: string
  fact: string | null
  via: 'fetch' | null
  capturedAt: string | null
  signal: SourceSignal | null
  error: string | null
}

export type AgentPing = {
  agent: AgentId
  model: string
  reply: string
}

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
