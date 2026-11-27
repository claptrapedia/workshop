export const WEAPON_SUBTYPES = [
  ['repeater-pistol', 'Repeater pistol'],
  ['revolver', 'Revolver'],
  ['smg', 'SMG'],
  ['combat-rifle', 'Combat rifle'],
  ['shotgun', 'Shotgun'],
  ['sniper-rifle', 'Sniper rifle'],
  ['rocket-launcher', 'Rocket launcher'],
  ['eridian-weapon', 'Eridian weapon'],
] as const

export const SHIELD_SUBTYPES = [
  ['standard', 'Standard'],
  ['resistance', 'Resistance'],
  ['healing', 'Healing'],
  ['burst', 'Burst'],
  ['wave', 'Wave'],
  ['nova', 'Nova'],
  ['health-boost', 'Health boost'],
] as const

export const GRENADE_SUBTYPES = [
  ['contact', 'Contact'],
  ['sticky', 'Sticky'],
  ['rubberized', 'Rubberized'],
  ['bouncing-bettie', 'Bouncing Betty'],
  ['proximity-mine', 'Proximity mine'],
  ['longbow', 'Longbow'],
  ['mirv', 'MIRV'],
  ['rain', 'Rain'],
  ['transfusion', 'Transfusion'],
] as const

export const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', subtypes: WEAPON_SUBTYPES },
  { id: 'shield', label: 'Shield', subtypes: SHIELD_SUBTYPES },
  { id: 'grenade-mod', label: 'Grenade mod', subtypes: GRENADE_SUBTYPES },
  { id: 'class-mod', label: 'Class mod', subtypes: [] },
  { id: 'artifact', label: 'Artifact', subtypes: [] },
] as const

export const CHARACTERS = [
  ['roland', 'Roland'],
  ['lilith', 'Lilith'],
  ['mordecai', 'Mordecai'],
  ['brick', 'Brick'],
] as const

export const ORIGIN_LABELS: Record<string, string> = {
  '': 'Base game',
  dlc1: 'Zombie Island',
  dlc2: 'Underdome',
  dlc3: 'General Knoxx',
  dlc4: 'Robot Revolution',
}

export const GROUP_LABELS: Record<string, string> = {
  weapon: 'Weapons',
  shield: 'Shields',
  'grenade-mod': 'Grenade mods',
  'class-mod': 'Class mods',
  artifact: 'Artifacts',
  enemy: 'Enemies',
  location: 'Locations',
  mission: 'Missions',
  map: 'Maps',
  character: 'Characters',
  item: 'Items',
  equipment_name: 'Equipment names',
  equipment_part: 'Equipment parts',
  equipment_balance: 'Balances',
  loot_pool: 'Loot pools',
  population_source: 'Populations',
  interactive_object: 'Interactive objects',
  skill: 'Skills',
  weapon_type: 'Weapon types',
  manufacturer: 'Manufacturers',
  challenge: 'Challenges',
  contact: 'Contacts',
  npc: 'NPCs',
  vehicle: 'Vehicles',
  region: 'Regions',
  character_class: 'Character classes',
  named_definition: 'Named definitions',
  location_list: 'Location lists',
  map_list: 'Map lists',
}

export const GROUP_ORDER = [
  'weapon',
  'shield',
  'grenade-mod',
  'class-mod',
  'artifact',
  'enemy',
  'location',
  'mission',
  'map',
  'character',
  'item',
  'equipment_name',
  'equipment_part',
  'equipment_balance',
  'loot_pool',
  'population_source',
  'skill',
  'weapon_type',
  'manufacturer',
  'challenge',
  'contact',
  'npc',
  'vehicle',
  'region',
  'interactive_object',
  'character_class',
  'named_definition',
  'location_list',
  'map_list',
]

const SUBTYPE_LABELS = new Map<string, string>([
  ...WEAPON_SUBTYPES,
  ...SHIELD_SUBTYPES,
  ...GRENADE_SUBTYPES,
])

const CHARACTER_LABELS = new Map<string, string>(CHARACTERS)

export function groupLabel(kind: string): string {
  return GROUP_LABELS[kind] ?? kind.replaceAll('_', ' ')
}

export function subtypeLabel(id: string | null): string | null {
  if (!id) return null
  return SUBTYPE_LABELS.get(id) ?? id
}

export function characterLabel(id: string | null): string | null {
  if (!id) return null
  return CHARACTER_LABELS.get(id) ?? id
}

export function originLabel(hint: string): string {
  return ORIGIN_LABELS[hint] ?? hint
}

export function subtypesFor(itemType: string): readonly (readonly [string, string])[] {
  return ITEM_TYPES.find((type) => type.id === itemType)?.subtypes ?? []
}

export function itemTypeLabel(id: string | null): string | null {
  if (!id) return null
  return ITEM_TYPES.find((type) => type.id === id)?.label ?? groupLabel(id)
}
