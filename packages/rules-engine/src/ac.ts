import type { AbilityModifiers } from "@dnd/shared";
import type { Modifier } from "@dnd/shared";
import { resolveModifierValue } from "./modifiers.js";

export type ArmorType = "none" | "light" | "medium" | "heavy" | "shield";

export interface EquippedArmor {
  name: string;
  armorType: ArmorType;
  baseAc: number;
  maxDexBonus: number | null; // null = unlimited
  stealthDisadvantage?: boolean;
}

/**
 * Computes Armor Class from equipped armor, shield, DEX modifier, and AC modifiers.
 *
 * Priority:
 *  1. If a "set" modifier targets "ac" with no armor condition, it overrides (e.g. Unarmored Defense)
 *  2. If wearing armor: base AC + DEX (capped for medium, 0 for heavy)
 *  3. If no armor: 10 + DEX (base) — can be replaced by Unarmored Defense
 *  4. Shield adds +2 (no stacking of multiple shields)
 *  5. Additional bonus modifiers
 */
export function computeAC(params: {
  abilityModifiers: AbilityModifiers;
  equippedArmor: EquippedArmor | null;
  hasShield: boolean;
  acModifiers: Modifier[];
}): number {
  const { abilityModifiers, equippedArmor, hasShield, acModifiers } = params;
  const dexMod = abilityModifiers.DEX;
  const armorType: ArmorType = equippedArmor?.armorType ?? "none";

  // Find any "set" modifiers that apply for the current armor situation
  const setModifiers = acModifiers
    .filter((m) => m.type === "set")
    .filter((m) => {
      if (!m.condition?.armor_type) return true;
      return m.condition.armor_type === armorType;
    })
    .sort((a, b) => a.priority - b.priority);

  let baseAc: number;

  if (setModifiers.length > 0 && !equippedArmor) {
    // Unarmored Defense or similar
    const setMod = setModifiers[0]!;
    baseAc = resolveModifierValue(setMod.value, abilityModifiers);
  } else if (equippedArmor) {
    const { baseAc: armorBase, armorType: type, maxDexBonus } = equippedArmor;
    if (type === "heavy") {
      baseAc = armorBase;
    } else if (type === "medium") {
      baseAc = armorBase + Math.min(dexMod, maxDexBonus ?? 2);
    } else {
      // light armor
      baseAc = armorBase + dexMod;
    }
  } else {
    // No armor, no unarmored defense
    baseAc = 10 + dexMod;
  }

  // Add shield
  if (hasShield) {
    baseAc += 2;
  }

  // Add bonus modifiers
  const bonusModifiers = acModifiers
    .filter((m) => m.type === "bonus")
    .filter((m) => {
      if (!m.condition?.armor_type) return true;
      return m.condition.armor_type === armorType;
    });

  for (const mod of bonusModifiers) {
    baseAc += resolveModifierValue(mod.value, abilityModifiers);
  }

  return baseAc;
}
