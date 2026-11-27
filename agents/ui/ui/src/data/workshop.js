export const GAME = {
  id: "borderlands",
  name: "Borderlands 1",
  release: "Borderlands 1 Enhanced",
  releaseId: "borderlands-1-enhanced",
};

export const AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    model: "Sonnet 5.5",
    effort: "medium",
    cli: "claude -p",
    role: "Primary",
    accent: "#FF8A3D",
  },
  {
    id: "codex",
    name: "Codex",
    model: "GPT Sol 6.2",
    effort: "medium",
    cli: "codex exec",
    role: "Reserve",
    accent: "#7DD3FC",
  },
];

export const EXTRACT = {
  id: "extract-20261110-124546-348467",
  path: "/Users/keogh/Sites/claptrapedia/extractions/borderlands1e/extract-20261110-124546-348467",
  extractor: "0.3.2",
  formatVersion: "1",
  status: "complete",
  captured: "10 Nov 2026, 12:45",
  seeds: "1,402",
  groups: "386",
  records: "8,940",
  unmatched: "41",
};

export const ENTITIES = [
  {
    id: "hellfire",
    name: "Hellfire",
    kind: "Items",
    type: "Weapon · SMG",
    detail: "Maliwan · legendary · incendiary",
    records: 3,
    status: "In review",
    tone: "ion",
    accent: "#FF8A1F",
    raw: [
      {
        kind: "object",
        path: "GD_Weap_SMG.Maliwan_3_Hellfire",
        fields: [
          ["class", "WillowWeapTypeSubMachineGun"],
          ["balance", "balance_maliwan_3_legendary"],
          ["rarity", "Rarity_Legendary"],
          ["element", "Incendiary"],
          ["projectiles", "1"],
          ["body", "GD_Weap_SMG.Body.body3"],
        ],
      },
      {
        kind: "archetype_binding",
        path: "GD_Weap_SMG.A_Weapons_SubMachineGun.Hellfire",
        fields: [
          ["archetype", "AWeap_SMG_Maliwan_3"],
          ["prefabs", "4"],
          ["material", "Maliwan_Material_A"],
        ],
      },
      {
        kind: "world_binding",
        path: "GD_ItemPools.WeaponPools.Pool_Weapons_SMG_04_Legendary",
        fields: [
          ["pool", "Pool_Weapons_SMG_04_Legendary"],
          ["weight", "1"],
          ["enemy", "GD_BoneHead.Character.BoneHead"],
        ],
      },
    ],
  },
  {
    id: "bone-head",
    name: "Bone Head",
    kind: "Enemies",
    type: "Enemy · boss",
    detail: "bandit · Skag Gully",
    records: 2,
    status: "New record",
    tone: "violet",
    accent: "#FF0055",
    raw: [
      {
        kind: "object",
        path: "GD_BoneHead.Character.BoneHead",
        fields: [
          ["kind", "boss"],
          ["family", "bandit"],
          ["rank", "—"],
          ["dlc", "—"],
        ],
      },
      {
        kind: "world_binding",
        path: "GD_SkagGully.Population.BoneHead",
        fields: [
          ["location", "skag-gully"],
          ["mission", "nine-toes-food"],
        ],
      },
    ],
  },
  {
    id: "skag-gully",
    name: "Skag Gully",
    kind: "Locations",
    type: "Location · area",
    detail: "Arid Badlands · base game",
    records: 5,
    status: "Matched",
    tone: "signal",
    accent: "#3BE07A",
    raw: [
      {
        kind: "object",
        path: "GD_SkagGully.TheWorld.PersistentLevel",
        fields: [
          ["region", "arid-badlands"],
          ["dlc", "—"],
          ["missions", "3"],
        ],
      },
    ],
  },
  {
    id: "nine-toes-food",
    name: "Nine-Toes: T.K.'s Food",
    kind: "Missions",
    type: "Mission · story",
    detail: "Skag Gully · level 2",
    records: 4,
    status: "Matched",
    tone: "signal",
    accent: "#3EC8FF",
    raw: [
      {
        kind: "object",
        path: "GD_NineToes.Missions.Mission_Food",
        fields: [
          ["level", "2"],
          ["giver", "T.K. Baha"],
          ["enemies", "bone-head"],
        ],
      },
    ],
  },
  {
    id: "phasewalk",
    name: "Phasewalk",
    kind: "Skills",
    type: "Action skill",
    detail: "Lilith · siren",
    records: 2,
    status: "Matched",
    tone: "signal",
    accent: "#A855F7",
    raw: [
      {
        kind: "object",
        path: "GD_Siren_Skills.ActionSkill.Phasewalk",
        fields: [
          ["character", "lilith"],
          ["cooldown", "36"],
          ["duration", "7"],
        ],
      },
    ],
  },
  {
    id: "maliwan-hellfire-barrel",
    name: "Maliwan Hellfire Barrel",
    kind: "Parts",
    type: "Part · weapon barrel",
    detail: "Maliwan · elemental barrel",
    records: 6,
    status: "Conflict",
    tone: "danger",
    accent: "#FF4D1A",
    raw: [
      {
        kind: "object",
        path: "GD_Weap_SMG.Barrel.barrel_maliwan_3_hellfire",
        fields: [
          ["slot", "barrel"],
          ["manufacturer", "maliwan"],
          ["subtype", "smg"],
        ],
      },
    ],
  },
  {
    id: "repeater-pistol",
    name: "Repeater Pistol",
    kind: "Pools",
    type: "Pool · world",
    detail: "Repeater pistol · all sources",
    records: 1,
    status: "Matched",
    tone: "signal",
    accent: "#E6EDF5",
    raw: [
      {
        kind: "object",
        path: "GD_ItemPools.WeaponPools.Pool_Weapons_RepeaterPistol",
        fields: [
          ["pool", "repeater-pistol"],
          ["items", "84"],
        ],
      },
    ],
  },
  {
    id: "corpse-eater",
    name: "Corpse Eater",
    kind: "Enemies",
    type: "Enemy · mob",
    detail: "trash-feeder · Zombie Island",
    records: 2,
    status: "Sources pending",
    tone: "warn",
    accent: "#FFD400",
    raw: [
      {
        kind: "object",
        path: "GD_ZombieIsland.Character.CorpseEater",
        fields: [
          ["family", "trash-feeder"],
          ["dlc", "zombie-island"],
          ["rank", "—"],
        ],
      },
    ],
  },
];

export const ENTITY = {
  id: "hellfire",
  name: "Hellfire",
  slug: "hellfire",
  type: "Weapon · SMG",
  manufacturer: "Maliwan",
  rarity: "legendary",
  rarityColor: "#FF8A1F",
  element: "incendiary",
  elementColor: "#FF4D1A",
  stage: "Review",
};

export const SOURCES = [
  {
    id: "wiki",
    site: "Borderlands Wiki",
    host: "borderlands.fandom.com",
    url: "https://borderlands.fandom.com/wiki/Hellfire_(Borderlands)",
    method: "MediaWiki parse API",
    signal: "revision 2841993",
    signalDetail: "4 Nov 2026, 09:12 UTC",
    status: "Captured",
    tone: "signal",
    captured: "4 Nov 2026, 09:14",
    bytes: "18.4 KB",
    facts: 6,
    capture: [
      "Hellfire",
      "Manufacturer: Maliwan",
      "Type: Submachine gun",
      "Rarity: Legendary",
      "Element: Incendiary  x3 – x4",
      "Damage: 41 – 76",
      "Accuracy: 88.5",
      "Fire rate: 8.3",
      "Magazine: 60",
      "Red text: Some people just want to watch the world burn.",
      "Notes: Drops from Bone Head in Skag Gully, and from the Crimson Lance",
      "chests in the Crimson Fastness. Part list includes a Maliwan barrel",
      "and a Dahl stock.",
    ],
  },
  {
    id: "lootlemon",
    site: "LootLemon",
    host: "www.lootlemon.com",
    url: "https://www.lootlemon.com/weapon/hellfire-bl1",
    method: "Fetch · Playwright Chromium",
    signal: "ETag 8f2c · fact hash 4a91be",
    signalDetail: "last modified 2 Nov 2026",
    status: "Captured",
    tone: "signal",
    captured: "4 Nov 2026, 09:21",
    bytes: "64.1 KB",
    facts: 9,
    capture: [
      "Hellfire — Legendary Submachine Gun",
      "Manufacturer  Maliwan",
      "Element  Incendiary",
      "Damage  41 – 76",
      "Accuracy  88.5",
      "Fire Rate  8.3",
      "Magazine  60",
      "Parts",
      "  Maliwan barrel",
      "  Maliwan grip",
      "  Dahl stock",
      "  Hyperion sight",
      "Sources",
      "  Bone Head (Skag Gully)",
      "  Crimson Lance chest (Crimson Fastness)",
    ],
  },
  {
    id: "wiki-drops",
    site: "Borderlands Wiki",
    host: "borderlands.fandom.com",
    url: "https://borderlands.fandom.com/wiki/Bone_Head",
    method: "Not captured",
    signal: "revision 2842117",
    signalDetail: "26 Nov 2026, 18:40 UTC",
    status: "Needs capture",
    tone: "warn",
    captured: null,
    bytes: "—",
    facts: 0,
    capture: [],
  },
];

export const DRAFT = {
  summary:
    "A legendary Maliwan submachine gun that trades magazine size for a searing incendiary spread.",
  description:
    "The Hellfire is Maliwan's answer to close-quarters panic. It spits a tight cone of burning rounds that keep working after the trigger stops, and it rewards a player who keeps the magazine above half.\n\nAccuracy holds up at range for a submachine gun, so it doubles as a marksman's fallback when a sniper rifle runs dry. The burn is the point: targets that survive the burst rarely survive the fire.",
  flavour:
    "Some people just want to watch the world burn.",
  flavourSummary:
    "Ignites on impact, and the burn keeps ticking after the target stops moving.",
  abilities: ["+25% incendiary damage while the magazine is above half"],
  tags: ["smg", "incendiary", "maliwan"],
};

export const FIELDS = [
  { key: "id", label: "id", value: "hellfire", locked: true, hint: "Stable key, chosen once" },
  { key: "slug", label: "slug", value: "hellfire", hint: "Public URL, editable" },
  { key: "name", label: "name", value: "Hellfire", hint: "Name as printed" },
  { key: "item_type", label: "item_type", value: "weapon", locked: true, hint: "Inventory bucket" },
  { key: "subtype", label: "subtype", value: "smg", locked: true, hint: "Second label" },
  { key: "manufacturer", label: "manufacturer", value: "Maliwan", hint: "Brand on the card" },
  { key: "rarity", label: "rarity", value: "legendary", hint: "Every tier it can spawn as" },
  { key: "element", label: "element", value: "incendiary · x3–x4", hint: "Tech rating spread" },
  { key: "projectile", label: "projectile", value: "1 – 1", hint: "xN beside damage" },
  { key: "accuracy", label: "accuracy range", value: "88.0 – 94.0", hint: "Part spread" },
  { key: "fire_rate", label: "fire rate range", value: "8.3 – 9.2", hint: "Part spread" },
  { key: "magazine", label: "magazine range", value: "42 – 60", hint: "Part spread" },
];

export const PUBLISHED = [
  { label: "summary", value: "A legendary Maliwan submachine gun that sets its targets alight.", state: "changed" },
  { label: "description", value: "— not written yet", state: "empty" },
  { label: "rarity", value: "legendary", state: "same" },
  { label: "element", value: "incendiary · x3–x4", state: "same" },
  { label: "drop · Bone Head", value: "Skag Gully", state: "same" },
];

export const CONFLICTS = [
  {
    field: "magazine",
    tone: "warn",
    text: "LootLemon reads 60, the extract stores 42–60. The extract wins and the roll spread stays.",
  },
  {
    field: "fire rate",
    tone: "warn",
    text: "The captured card reads 8.3, the extract stores 9.2. Use 8.3 for the shown roll, 8.3–9.2 for the range.",
  },
];

export const QUEUE = [
  {
    id: "hellfire",
    name: "Hellfire",
    kind: "weapon",
    change: "Update",
    tone: "ion",
    statements: 7,
    source: "extract · wiki · lootlemon",
    sql: `-- hellfire · items
INSERT INTO catalogue.items
  (id, game_id, dlc_id, slug, name, item_type_id, subtype_id,
   character_id, plain, projectile_min, projectile_max, summary, description)
VALUES
  ('hellfire', 'borderlands', NULL, 'hellfire', 'Hellfire', 'weapon', 'smg',
   NULL, false, 1, 1,
   'A legendary Maliwan submachine gun that trades magazine size for a searing incendiary spread.',
   'The Hellfire is Maliwan''s answer to close-quarters panic...')
ON CONFLICT (id, game_id) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description;

-- hellfire · item_elements
INSERT INTO catalogue.item_elements
  (item_id, game_id, element_id, multiplier_min, multiplier_max)
VALUES ('hellfire', 'borderlands', 'incendiary', 3, 4)
ON CONFLICT (item_id, game_id, element_id) DO UPDATE SET
  multiplier_min = EXCLUDED.multiplier_min,
  multiplier_max = EXCLUDED.multiplier_max;

-- hellfire · item_stat_ranges
INSERT INTO catalogue.item_stat_ranges
  (item_id, game_id, card_stat_id, value_min, value_max)
VALUES
  ('hellfire', 'borderlands', 'accuracy', 88.0, 94.0),
  ('hellfire', 'borderlands', 'fire-rate', 8.3, 9.2),
  ('hellfire', 'borderlands', 'magazine', 42.0, 60.0)
ON CONFLICT (item_id, game_id, card_stat_id) DO UPDATE SET
  value_min = EXCLUDED.value_min,
  value_max = EXCLUDED.value_max;`,
  },
  {
    id: "bone-head",
    name: "Bone Head",
    kind: "enemy",
    change: "Insert",
    tone: "violet",
    statements: 2,
    source: "extract · wiki",
    sql: `-- bone-head · enemies
INSERT INTO catalogue.enemies
  (id, game_id, dlc_id, name, slug, kind, family_id, rank_id, position)
VALUES ('bone-head', 'borderlands', NULL, 'Bone Head', 'bone-head',
   'boss', 'bandit', NULL, 4)
ON CONFLICT (id, game_id) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind;`,
  },
  {
    id: "drops-hellfire-bone-head",
    name: "Hellfire → Bone Head",
    kind: "drops",
    change: "Relation",
    tone: "signal",
    statements: 2,
    source: "captures",
    sql: `-- drops · hellfire / bone-head / skag-gully
INSERT INTO catalogue.drops
  (item_id, game_id, enemy_id, location_id, mission_id, pool_id)
VALUES ('hellfire', 'borderlands', 'bone-head', 'skag-gully', NULL, NULL)
ON CONFLICT (item_id, game_id, enemy_id, location_id, mission_id, pool_id)
DO NOTHING;`,
  },
];

export const TEST_RUN = {
  migration: "20261127143000_DATA_bl1_weapon_drops.sql",
  image: "claptrapedia-postgres:17.2",
  host: "127.0.0.1:5433",
  history: "db/migrations · 148 files",
  steps: [
    { label: "Start claptrapedia-postgres:17.2 on 127.0.0.1:5433", detail: "disposable container, own volume" },
    { label: "Apply database repo migration history", detail: "dbmate · 148 files · 2.4 s" },
    { label: "Apply candidate migration", detail: "exact bytes to be exported" },
    { label: "Verify affected rows", detail: "items, elements, ranges, drops" },
  ],
  result: { statements: 11, errors: 0, rows: 6, duration: "3.4 s" },
};

export const EXPORTS = [
  { file: "20261127143000_DATA_bl1_weapon_drops.sql", when: "27 Nov 2026, 14:30", statements: 11, status: "Exported" },
  { file: "20261120101500_DATA_bl1_skag_gully.sql", when: "20 Nov 2026, 10:15", statements: 8, status: "Committed" },
  { file: "20261118164000_DATA_bl1_smg_pools.sql", when: "18 Nov 2026, 16:40", statements: 5, status: "Committed" },
];

export const PATHS = [
  { name: "CLAPTRAPEDIA_DATABASE_DIR", value: "/Users/keogh/Sites/claptrapedia/database", state: "Resolved", tone: "signal" },
  { name: "migration destination", value: "database/db/migrations/", state: "Writable", tone: "signal" },
  { name: "CLAPTRAPEDIA_SITE_DIR", value: "/Users/keogh/Sites/claptrapedia/site", state: "Resolved", tone: "signal" },
  { name: "CLAPTRAPEDIA_EXTRACT_DIR", value: "…/extractions/borderlands1e/extract-20261110-124546-348467", state: "Default", tone: "muted" },
  { name: "CLAPTRAPEDIA_DATABASE_URL", value: "postgres://claptrapedia@127.0.0.1:5432/claptrapedia", state: "Connected", tone: "signal" },
  { name: "CLAPTRAPEDIA_TEST_DATABASE_URL", value: "postgres://claptrapedia@127.0.0.1:5433/claptrapedia", state: "Idle", tone: "muted" },
];

export const PROOFS = [
  {
    id: "wiki",
    title: "Wiki proof",
    tone: "signal",
    lines: [
      ["endpoint", "borderlands.fandom.com/api.php?action=parse"],
      ["revision", "2841993"],
      ["saved fact", "Red text reads: Some people just want to watch the world burn."],
    ],
  },
  {
    id: "lootlemon",
    title: "LootLemon proof",
    tone: "signal",
    lines: [
      ["page", "lootlemon.com/weapon/hellfire-bl1"],
      ["render", "Playwright Chromium · rendered article"],
      ["saved fact", "Parts: Maliwan barrel, Maliwan grip, Dahl stock, Hyperion sight"],
    ],
  },
];

export const UPDATES = [
  { site: "Borderlands Wiki", url: "borderlands.fandom.com/wiki/Hellfire_(Borderlands)", outcome: "Skipped", detail: "revision 2841993 unchanged", tone: "muted" },
  { site: "LootLemon", url: "lootlemon.com/weapon/hellfire-bl1", outcome: "Skipped", detail: "ETag and fact hash match", tone: "muted" },
  { site: "Borderlands Wiki", url: "borderlands.fandom.com/wiki/Bone_Head", outcome: "Needs capture", detail: "revision 2842117, facts changed", tone: "warn" },
  { site: "LootLemon", url: "lootlemon.com/weapon/bone-shredder-bl1", outcome: "Recaptured", detail: "1 fact changed · wrote _DATA_ file", tone: "signal" },
];