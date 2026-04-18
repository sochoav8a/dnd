export type ContentType =
  | "race"
  | "subrace"
  | "class"
  | "subclass"
  | "background"
  | "feat"
  | "spell"
  | "item"
  | "monster"
  | "condition"
  | "rule";

export type ContentSourceType = "official" | "homebrew";

export interface ContentSource {
  id: string;
  name: string;
  type: ContentSourceType;
  createdBy: string | null;
  createdAt: Date;
}

export interface ContentItem<T = unknown> {
  id: string;
  sourceId: string;
  contentType: ContentType;
  name: string;
  slug: string;
  description: string | null;
  data: T;
  metadata: Record<string, unknown> | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Per-type data shapes ----

export interface RaceData {
  speed: number;
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  ability_bonuses: Partial<Record<string, number>>;
  traits: Array<{ name: string; description: string }>;
  languages: string[];
  subraces: string[];
  darkvision?: number;
  resistances?: string[];
}

export interface SubraceData {
  parent_race: string;
  ability_bonuses: Partial<Record<string, number>>;
  traits: Array<{ name: string; description: string }>;
  extra_languages?: string[];
  extra_proficiencies?: string[];
  resistances?: string[];
}

export interface ClassFeature {
  name: string;
  description: string;
  modifiers?: import("./modifiers.js").Modifier[];
}

export interface ClassData {
  hit_die: number;
  primary_ability: string[];
  saving_throws: string[];
  armor_proficiencies: string[];
  weapon_proficiencies: string[];
  tool_proficiencies?: string[];
  skill_choices: { count: number; from: string[] };
  features_by_level: Record<string, ClassFeature[]>;
  subclass_level: number;
  spell_casting: SpellcastingInfo | null;
  subclasses?: string[];
}

export interface SpellcastingInfo {
  ability: string;
  type: "full" | "half" | "third" | "warlock";
  cantrips_known?: number[];
  spells_known?: number[];
  spell_slots?: number[][];
}

export interface SubclassData {
  parent_class: string;
  flavor_name: string;
  features_by_level: Record<string, ClassFeature[]>;
  spell_casting?: SpellcastingInfo;
  extra_spells?: Record<string, string[]>;
}

export interface BackgroundData {
  skill_proficiencies: string[];
  tool_proficiencies?: string[];
  languages?: number;
  starting_equipment?: string[];
  feature: { name: string; description: string };
  suggested_characteristics?: {
    personality_traits?: string[];
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
  };
}

export interface FeatData {
  prerequisites?: string[];
  ability_score_improvement?: Partial<Record<string, number>>;
  modifiers: import("./modifiers.js").Modifier[];
  description: string;
}

export interface SpellData {
  level: number;
  school:
    | "abjuration"
    | "conjuration"
    | "divination"
    | "enchantment"
    | "evocation"
    | "illusion"
    | "necromancy"
    | "transmutation";
  casting_time: string;
  range: string;
  components: { V: boolean; S: boolean; M?: string };
  duration: string;
  concentration: boolean;
  ritual?: boolean;
  damage?: { base: string; type: string; higher_levels?: string };
  healing?: { base: string; higher_levels?: string };
  classes: string[];
  description: string;
}

export interface ItemData {
  category: "weapon" | "armor" | "shield" | "gear" | "tool" | "magic";
  cost?: { amount: number; currency: string };
  weight?: number;
  weapon?: WeaponProperties;
  armor?: ArmorProperties;
  rarity?: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  requires_attunement?: boolean;
  modifiers?: import("./modifiers.js").Modifier[];
}

export interface WeaponProperties {
  damage_dice: string;
  damage_type: string;
  properties: string[];
  range?: { normal: number; long: number };
}

export interface ArmorProperties {
  base_ac: number;
  type: "light" | "medium" | "heavy" | "shield";
  max_dex_bonus?: number | null;
  strength_requirement?: number;
  stealth_disadvantage?: boolean;
}

export interface MonsterAction {
  name: string;
  description: string;
  attack_bonus?: number;
  damage?: Array<{ damage_dice: string; damage_type: string }>;
  cost?: number;
}

export interface MonsterData {
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  type: string;
  subtype?: string;
  alignment: string;
  ac: number;
  ac_source?: string;
  hp: { average: number; roll: string };
  speed: {
    walk?: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
    hover?: boolean;
  };
  ability_scores: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
  };
  saving_throws?: Record<string, number>;
  skills?: Record<string, number>;
  damage_resistances?: string[];
  damage_immunities?: string[];
  damage_vulnerabilities?: string[];
  condition_immunities?: string[];
  senses: {
    passive_perception: number;
    darkvision?: number;
    blindsight?: number;
    tremorsense?: number;
    truesight?: number;
  };
  languages: string[];
  challenge_rating: number;
  xp: number;
  proficiency_bonus: number;
  special_abilities?: Array<{ name: string; description: string }>;
  actions?: MonsterAction[];
  legendary_actions?: MonsterAction[];
  reactions?: Array<{ name: string; description: string }>;
}

export interface ConditionData {
  effects: string[];
  description?: string;
}
