import { describe, it, expect } from "vitest";
import { computeSkills } from "../skills.js";
import type { AbilityModifiers } from "@dnd/shared";
import type { Skill } from "@dnd/shared";

const mods: AbilityModifiers = {
  STR: 2, DEX: 3, CON: 1, INT: 0, WIS: 1, CHA: -1,
};

describe("computeSkills", () => {
  it("computes non-proficient skill correctly", () => {
    const skills = computeSkills(mods, [], [], 2);
    expect(skills.athletics.total).toBe(2); // STR mod only
    expect(skills.athletics.proficient).toBe(false);
    expect(skills.athletics.expertise).toBe(false);
  });

  it("adds proficiency bonus to proficient skills", () => {
    const skills = computeSkills(mods, ["athletics" as Skill, "stealth" as Skill], [], 2);
    expect(skills.athletics.total).toBe(4); // 2 STR + 2 prof
    expect(skills.stealth.total).toBe(5);   // 3 DEX + 2 prof
    expect(skills.athletics.proficient).toBe(true);
  });

  it("doubles proficiency for expertise skills", () => {
    const skills = computeSkills(mods, ["stealth" as Skill], ["stealth" as Skill], 3);
    expect(skills.stealth.total).toBe(9); // 3 DEX + 3*2 prof
    expect(skills.stealth.expertise).toBe(true);
  });

  it("applies Jack of All Trades (half proficiency) to non-proficient skills", () => {
    const skills = computeSkills(mods, [], [], 4, true); // prof bonus 4
    // Non-proficient perception (WIS): 1 + floor(4/2) = 3
    expect(skills.perception.total).toBe(3);
    expect(skills.perception.proficient).toBe(false);
  });

  it("does not apply Jack of All Trades to proficient skills (already adds full prof)", () => {
    const skills = computeSkills(mods, ["perception" as Skill], [], 4, true);
    // Proficient: 1 + 4 = 5, not 1 + 2 + 4
    expect(skills.perception.total).toBe(5);
  });
});
