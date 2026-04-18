import type { Ability } from "../constants/abilities.js";

export type AbilityScores = Record<Ability, number>;

export type AbilityModifiers = Record<Ability, number>;

export type AbilityBonus = {
  ability: Ability;
  bonus: number;
};
