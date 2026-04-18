import type { AbilityModifiers } from "@dnd/shared";
import { ABILITIES, type Ability } from "@dnd/shared";

export interface SavingThrowResult {
  total: number;
  proficient: boolean;
}

/**
 * Computes all 6 saving throw totals for a character.
 */
export function computeSavingThrows(
  abilityModifiers: AbilityModifiers,
  proficientSavingThrows: Ability[],
  proficiencyBonus: number,
  savingThrowBonuses: Partial<Record<Ability, number>> = {},
): Record<Ability, SavingThrowResult> {
  const result: Partial<Record<Ability, SavingThrowResult>> = {};

  for (const ability of ABILITIES) {
    const proficient = proficientSavingThrows.includes(ability);
    const bonus = savingThrowBonuses[ability] ?? 0;
    const total = abilityModifiers[ability] + (proficient ? proficiencyBonus : 0) + bonus;
    result[ability] = { total, proficient };
  }

  return result as Record<Ability, SavingThrowResult>;
}
