import type { AbilityScores } from "@dnd/shared";
import { getModifier } from "./ability-scores.js";

/**
 * Computes the maximum HP for a single-class character.
 *
 * Rules:
 *  - Level 1: max hit die + CON mod
 *  - Each subsequent level: average hit die (rounded up) + CON mod
 *  - Hill Dwarf subrace adds +1 HP per level (passed as bonus)
 */
export function computeMaxHp(params: {
  hitDie: number;
  level: number;
  abilityScores: AbilityScores;
  hpBonusPerLevel?: number; // e.g. Hill Dwarf toughness
}): number {
  const { hitDie, level, abilityScores, hpBonusPerLevel = 0 } = params;
  const conMod = getModifier(abilityScores.CON);
  const averagePerLevel = Math.floor(hitDie / 2) + 1; // PHB: average rounded up

  const level1Hp = hitDie + conMod + hpBonusPerLevel;
  if (level === 1) return Math.max(1, level1Hp);

  const additionalLevels = (level - 1) * (averagePerLevel + conMod + hpBonusPerLevel);
  return Math.max(level, level1Hp + additionalLevels);
}

/**
 * Computes the maximum HP for a multiclass character (PHB p. 163).
 *
 * Rules:
 *  - First level overall: max hit die of primary class + CON mod
 *  - Every subsequent level (any class): average of that class's hit die + CON mod
 *
 * @param classEntries  Array of { hitDie, level } in order gained. First entry is primary.
 */
export function computeMulticlassMaxHp(params: {
  classEntries: Array<{ hitDie: number; level: number }>;
  abilityScores: AbilityScores;
  hpBonusPerLevel?: number;
}): number {
  const { classEntries, abilityScores, hpBonusPerLevel = 0 } = params;
  const conMod = getModifier(abilityScores.CON);
  let total = 0;
  let isFirstLevel = true;

  for (const entry of classEntries) {
    const avgDie = Math.floor(entry.hitDie / 2) + 1;
    for (let lvl = 1; lvl <= entry.level; lvl++) {
      const dieRoll = isFirstLevel ? entry.hitDie : avgDie;
      total += dieRoll + conMod + hpBonusPerLevel;
      isFirstLevel = false;
    }
  }

  return Math.max(classEntries.reduce((s, e) => s + e.level, 0), total);
}

/**
 * Computes remaining hit dice after rests. Returns array of [die, count] pairs.
 */
export function computeHitDiceTotal(
  classEntries: Array<{ hitDie: number; level: number }>,
): Array<{ die: number; total: number }> {
  const map = new Map<number, number>();
  for (const entry of classEntries) {
    map.set(entry.hitDie, (map.get(entry.hitDie) ?? 0) + entry.level);
  }
  return Array.from(map.entries()).map(([die, total]) => ({ die, total }));
}
