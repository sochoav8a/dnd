export type ModifierType =
  | "bonus"
  | "set"
  | "advantage"
  | "disadvantage"
  | "proficiency"
  | "expertise"
  | "resistance"
  | "immunity"
  | "vulnerability";

export interface ModifierCondition {
  armor_type?: "none" | "light" | "medium" | "heavy" | "shield";
  has_feature?: string;
  wielding?: string;
  class?: string;
}

export interface Modifier {
  target: string; // "ac", "speed", "skill.stealth", "saving_throw.DEX", "hp_max"
  type: ModifierType;
  value: number | string;
  condition?: ModifierCondition;
  source: string; // "race:elf", "feat:alert", "item:cloak-of-protection"
  priority: number; // lower = applied first; set operations should have low priority
}
