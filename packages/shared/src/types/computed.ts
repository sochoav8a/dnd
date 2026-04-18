import type { Ability } from "../constants/abilities.js";
import type { Skill } from "../constants/skills.js";

export interface AttackBonus {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  range?: string;
  properties: string[];
}

export interface SpellcastingStats {
  ability: Ability;
  spellSaveDC: number;
  spellAttackBonus: number;
}

export interface ComputedCharacter {
  // Core
  proficiencyBonus: number;
  initiative: number;
  speed: number;
  ac: number;
  passivePerception: number;

  // HP
  maxHp: number;

  // Ability modifiers
  abilityModifiers: Record<Ability, number>;

  // Saving throws
  savingThrows: Record<Ability, { total: number; proficient: boolean }>;

  // Skills
  skills: Record<Skill, { total: number; proficient: boolean; expertise: boolean }>;

  // Attacks
  attacks: AttackBonus[];

  // Spellcasting
  spellcasting: SpellcastingStats | null;
  spellSlotsByLevel: Record<number, number>;

  // Proficiencies
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];

  // Features
  features: Array<{ name: string; description: string; source: string }>;

  // Resistances / immunities
  resistances: string[];
  immunities: string[];
}
