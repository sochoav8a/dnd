import type { AbilityScores, AbilityModifiers } from "@dnd/shared";
import { ABILITIES } from "@dnd/shared";

/**
 * Returns the modifier for an ability score.
 * Formula: floor((score - 10) / 2)
 */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Computes all ability modifiers from ability scores.
 */
export function computeModifiers(scores: AbilityScores): AbilityModifiers {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability, getModifier(scores[ability])]),
  ) as AbilityModifiers;
}
