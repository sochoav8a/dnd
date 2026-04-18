import { describe, it, expect } from "vitest";
import { computeSavingThrows } from "../saving-throws.js";
import type { AbilityModifiers } from "@dnd/shared";
import type { Ability } from "@dnd/shared";

const mods: AbilityModifiers = {
  STR: 2, DEX: 1, CON: 3, INT: 0, WIS: -1, CHA: 2,
};

describe("computeSavingThrows", () => {
  it("returns ability modifier for non-proficient saves", () => {
    const saves = computeSavingThrows(mods, [], 2);
    expect(saves.INT.total).toBe(0);
    expect(saves.INT.proficient).toBe(false);
  });

  it("adds proficiency bonus to proficient saves", () => {
    const saves = computeSavingThrows(mods, ["STR" as Ability, "CON" as Ability], 2);
    expect(saves.STR.total).toBe(4); // 2 + 2 prof
    expect(saves.CON.total).toBe(5); // 3 + 2 prof
    expect(saves.STR.proficient).toBe(true);
    expect(saves.DEX.proficient).toBe(false);
  });

  it("applies bonus to specified saves (e.g. Paladin Aura)", () => {
    const saves = computeSavingThrows(
      mods,
      ["WIS" as Ability],
      3,
      { STR: 2, DEX: 2, CON: 2, INT: 2, WIS: 2, CHA: 2 },
    );
    expect(saves.STR.total).toBe(4); // 2 STR + 2 bonus (no prof)
    expect(saves.WIS.total).toBe(4); // -1 + 3 prof + 2 bonus
  });
});
