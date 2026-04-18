import { describe, it, expect } from "vitest";
import { computeAC } from "../ac.js";
import type { AbilityModifiers } from "@dnd/shared";

const baseMods: AbilityModifiers = {
  STR: 2, DEX: 2, CON: 1, INT: 0, WIS: 0, CHA: 0,
};

describe("computeAC", () => {
  it("returns 10 + DEX with no armor", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: null,
      hasShield: false,
      acModifiers: [],
    });
    expect(ac).toBe(12); // 10 + 2 DEX
  });

  it("adds shield bonus", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: null,
      hasShield: true,
      acModifiers: [],
    });
    expect(ac).toBe(14); // 10 + 2 DEX + 2 shield
  });

  it("computes light armor (Leather + DEX)", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: { name: "Leather", armorType: "light", baseAc: 11, maxDexBonus: null },
      hasShield: false,
      acModifiers: [],
    });
    expect(ac).toBe(13); // 11 + 2 DEX
  });

  it("computes medium armor (Scale Mail, caps DEX at +2)", () => {
    const highDexMods: AbilityModifiers = { ...baseMods, DEX: 4 };
    const ac = computeAC({
      abilityModifiers: highDexMods,
      equippedArmor: { name: "Scale Mail", armorType: "medium", baseAc: 14, maxDexBonus: 2 },
      hasShield: false,
      acModifiers: [],
    });
    expect(ac).toBe(16); // 14 + 2 (capped DEX)
  });

  it("computes heavy armor (Chain Mail, ignores DEX)", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: { name: "Chain Mail", armorType: "heavy", baseAc: 16, maxDexBonus: 0 },
      hasShield: false,
      acModifiers: [],
    });
    expect(ac).toBe(16); // No DEX bonus
  });

  it("applies Barbarian Unarmored Defense (10+DEX+CON) via set modifier", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: null,
      hasShield: false,
      acModifiers: [
        {
          target: "ac",
          type: "set",
          value: "10+DEX+CON",
          source: "class:barbarian:unarmored_defense",
          priority: 5,
          condition: { armor_type: "none" },
        },
      ],
    });
    expect(ac).toBe(13); // 10 + 2 DEX + 1 CON
  });

  it("stacks magic item bonus on top of armor", () => {
    const ac = computeAC({
      abilityModifiers: baseMods,
      equippedArmor: { name: "Leather", armorType: "light", baseAc: 11, maxDexBonus: null },
      hasShield: false,
      acModifiers: [
        { target: "ac", type: "bonus", value: 1, source: "item:cloak-of-protection", priority: 50 },
      ],
    });
    expect(ac).toBe(14); // 11 + 2 DEX + 1 bonus
  });
});
