import { GRENADE_SUBTYPES } from '../shared/vocab.ts'

const GRENADE_IDS = new Set<string>(GRENADE_SUBTYPES.map(([id]) => id))

const WEAPON_PACKAGE: Record<string, string> = {
  gd_weap_repeater_pistol: 'repeater-pistol',
  gd_weap_machine_pistol: 'repeater-pistol',
  gd_weap_revolver_pistol: 'revolver',
  gd_weap_patrol_smg: 'smg',
  gd_weap_combat_rifle: 'combat-rifle',
  gd_weap_support_machinegun: 'combat-rifle',
  gd_weap_combat_shotgun: 'shotgun',
  gd_weap_assault_shotgun: 'shotgun',
  gd_weap_sniper_rifle: 'sniper-rifle',
  gd_weap_sniper_rifle_semiauto: 'sniper-rifle',
  gd_weap_rocket_launcher: 'rocket-launcher',
  gd_weap_grenade_launcher: 'rocket-launcher',
  gd_weap_alien_rifle: 'eridian-weapon',
}

const CHARACTERS = new Set(['roland', 'lilith', 'mordecai', 'brick'])

export type Bucket = {
  groupKind: string
  itemType: string | null
  subtype: string | null
  characterId: string | null
}

export function classNameOf(value: unknown): string {
  const text = typeof value === 'string' ? value : ''
  const parts = text.split('.')
  return parts[parts.length - 1] ?? ''
}

export function slug(name: string): string {
  return name
    .replace(/['’]/g, '')
    .replace(/\./g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function weaponSubtype(path: string, pkg: string, file: string): string | null {
  if (path.includes('deletedelete')) return null
  const stem = file.toLowerCase()
  if (stem.includes('titleu_repeater_')) return 'repeater-pistol'
  if (stem.includes('titleu_semiautosniper_')) return 'sniper-rifle'
  if (stem.includes('titleu_smg_')) return 'smg'
  if (stem.includes('titleu_supportmg_')) return 'combat-rifle'
  if (path.includes('.title_eridan')) return 'eridian-weapon'
  return WEAPON_PACKAGE[pkg] ?? null
}

const equipmentName: Bucket = {
  groupKind: 'equipment_name',
  itemType: null,
  subtype: null,
  characterId: null,
}

export function classify(input: {
  className: string
  path: string
  category: string
  name: string
}): Bucket {
  const path = input.path.toLowerCase()
  const parts = path.split('.')
  const pkg = parts[0] ?? ''
  const segment = parts[1] ?? ''
  const file = parts[parts.length - 1] ?? ''
  const kind = input.className
  const prefix = segment.startsWith('prefix')
  const title = segment.startsWith('title')

  if (kind === 'WeaponNamePartDefinition') {
    if (prefix || pkg === 'gd_weap_names_shared' || !title) return equipmentName
    return {
      groupKind: 'weapon',
      itemType: 'weapon',
      subtype: weaponSubtype(path, pkg, file),
      characterId: null,
    }
  }

  if (kind === 'ItemNamePartDefinition') {
    if (prefix || !title) return equipmentName
    if (pkg === 'gd_shields' || pkg === 'dlc3_gd_item_uniqueparts') {
      return { groupKind: 'shield', itemType: 'shield', subtype: null, characterId: null }
    }
    if (pkg === 'gd_tunercuffs') {
      const subtype = slug(input.name)
      return {
        groupKind: 'grenade-mod',
        itemType: 'grenade-mod',
        subtype: GRENADE_IDS.has(subtype) ? subtype : null,
        characterId: null,
      }
    }
    if (pkg === 'gd_commanddecks' || pkg === 'dlc3_gd_commanddecks') {
      return { groupKind: 'class-mod', itemType: 'class-mod', subtype: null, characterId: null }
    }
    return equipmentName
  }

  if (kind === 'ItemDefinition' && pkg === 'gd_elementalupgrade' && CHARACTERS.has(segment)) {
    return { groupKind: 'artifact', itemType: 'artifact', subtype: null, characterId: segment }
  }

  if (kind === 'AIPawnBalanceDefinition') {
    return { groupKind: 'enemy', itemType: null, subtype: null, characterId: null }
  }

  if (kind === 'TeleportOutpostLookupObject' || kind === 'EmergencyTeleportOutpostDefinition') {
    return { groupKind: 'location', itemType: null, subtype: null, characterId: null }
  }

  if (kind === 'MissionDefinition') {
    return { groupKind: 'mission', itemType: null, subtype: null, characterId: null }
  }

  const player = playerFromPath(path)
  if (player && kind === 'PlayerClassDefinition') {
    return { groupKind: 'character', itemType: null, subtype: null, characterId: player.id }
  }

  return {
    groupKind: input.category || 'unknown',
    itemType: null,
    subtype: null,
    characterId: null,
  }
}

const PLAYER_NAMES: Record<string, string> = {
  roland: 'Roland',
  lilith: 'Lilith',
  mordecai: 'Mordecai',
  brick: 'Brick',
}

export function playerFromPath(path: string): { id: string; name: string } | null {
  const match = /characterclass_(roland|lilith|mordecai|brick)$/i.exec(path)
  const id = match?.[1]?.toLowerCase()
  if (!id) return null
  return { id, name: PLAYER_NAMES[id] ?? id }
}

export function familyLabel(pathOriginal: string, groupKind: string): string | null {
  if (groupKind !== 'enemy') return null
  const segment = pathOriginal.split('.')[1]
  return segment || null
}
