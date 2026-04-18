import type { AbilityModifiers } from "@dnd/shared";
import { SKILLS, SKILL_ABILITY, type Skill } from "@dnd/shared";
import { getModifier } from "./ability-scores.js";

export interface SkillResult {
  total: number;
  proficient: boolean;
  expertise: boolean;
  abilityMod: number;
}

export interface SkillInput {
  proficientSkills: Skill[];
  expertiseSkills: Skill[];
  abilityScores: Record<string, number>;
  proficiencyBonus: number;
  halfProficiencyRoundDown?: boolean; // bard's Jack of All Trades
}

/**
 * Computes all 18 skill totals for a character.
 */
export function computeSkills(
  abilityModifiers: AbilityModifiers,
  proficientSkills: Skill[],
  expertiseSkills: Skill[],
  proficiencyBonus: number,
  jackOfAllTrades: boolean = false,
): Record<Skill, SkillResult> {
  const result: Partial<Record<Skill, SkillResult>> = {};

  for (const skill of SKILLS) {
    const ability = SKILL_ABILITY[skill];
    const abilityMod = abilityModifiers[ability];
    const proficient = proficientSkills.includes(skill);
    const hasExpertise = expertiseSkills.includes(skill);

    let total = abilityMod;

    if (hasExpertise) {
      total += proficiencyBonus * 2;
    } else if (proficient) {
      total += proficiencyBonus;
    } else if (jackOfAllTrades) {
      total += Math.floor(proficiencyBonus / 2);
    }

    result[skill] = {
      total,
      proficient,
      expertise: hasExpertise,
      abilityMod,
    };
  }

  return result as Record<Skill, SkillResult>;
}
