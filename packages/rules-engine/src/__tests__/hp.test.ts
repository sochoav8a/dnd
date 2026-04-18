import { describe, it, expect } from "vitest";
import { computeMaxHp } from "../hp.js";
import type { AbilityScores } from "@dnd/shared";

const baseScores: AbilityScores = {
  STR: 10, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 10,
};

describe("computeMaxHp", () => {
  it("computes level 1 fighter HP (d10 + CON mod)", () => {
    // CON 12 → mod +1, level 1 fighter: 10 + 1 = 11
    const hp = computeMaxHp({ hitDie: 10, level: 1, abilityScores: baseScores });
    expect(hp).toBe(11);
  });

  it("computes level 1 wizard HP (d6 + CON mod)", () => {
    // CON 12 → mod +1, level 1 wizard: 6 + 1 = 7
    const hp = computeMaxHp({ hitDie: 6, level: 1, abilityScores: baseScores });
    expect(hp).toBe(7);
  });

  it("computes level 5 fighter HP", () => {
    // Level 1: 10+1=11. Levels 2-5: (d10 avg=6) + 1 = 7 per level → 4×7=28. Total: 39
    const hp = computeMaxHp({ hitDie: 10, level: 5, abilityScores: baseScores });
    expect(hp).toBe(39);
  });

  it("respects negative CON modifier", () => {
    const lowConScores: AbilityScores = { ...baseScores, CON: 6 }; // mod -2
    // Level 1 barbarian (d12): 12 + (-2) = 10
    const hp = computeMaxHp({ hitDie: 12, level: 1, abilityScores: lowConScores });
    expect(hp).toBe(10);
  });

  it("applies hpBonusPerLevel (Hill Dwarf Toughness)", () => {
    // CON 12 → +1, level 1 cleric d8 + 1(CON) + 1(toughness) = 10
    const hp = computeMaxHp({ hitDie: 8, level: 1, abilityScores: baseScores, hpBonusPerLevel: 1 });
    expect(hp).toBe(10);
  });

  it("computes level 20 barbarian HP", () => {
    // CON 12 → +1, d12 HD
    // Level 1: 12+1=13. Levels 2-20: (d12 avg=7)+1=8 per level → 19×8=152. Total: 165
    const hp = computeMaxHp({ hitDie: 12, level: 20, abilityScores: baseScores });
    expect(hp).toBe(165);
  });

  it("never returns less than level (minimum 1 HP per level)", () => {
    const veryLowCon: AbilityScores = { ...baseScores, CON: 1 }; // mod -5
    // Level 1 wizard: 6 + (-5) = 1
    const hp = computeMaxHp({ hitDie: 6, level: 1, abilityScores: veryLowCon });
    expect(hp).toBeGreaterThanOrEqual(1);
  });
});
