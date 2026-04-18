import { describe, it, expect } from "vitest";
import { computeSpellSlots } from "../spell-slots.js";

describe("computeSpellSlots", () => {
  it("returns empty object for non-casters", () => {
    const slots = computeSpellSlots(null, 5);
    expect(slots).toEqual({});
  });

  it("returns correct full caster slots at level 1 (2 first-level slots)", () => {
    const slots = computeSpellSlots("full", 1);
    expect(slots[1]).toBe(2);
    expect(slots[2]).toBeUndefined();
  });

  it("returns correct full caster slots at level 5", () => {
    // Level 5: 4×1st, 3×2nd, 2×3rd
    const slots = computeSpellSlots("full", 5);
    expect(slots[1]).toBe(4);
    expect(slots[2]).toBe(3);
    expect(slots[3]).toBe(2);
    expect(slots[4]).toBeUndefined();
  });

  it("returns correct full caster slots at level 20 (max)", () => {
    const slots = computeSpellSlots("full", 20);
    expect(slots[1]).toBe(4);
    expect(slots[9]).toBe(1);
  });

  it("returns correct half caster slots at level 2 (first level with spell slots)", () => {
    // Level 2 paladin/ranger: 2×1st slot
    const slots = computeSpellSlots("half", 2);
    expect(slots[1]).toBe(2);
  });

  it("returns no slots for half caster at level 1", () => {
    const slots = computeSpellSlots("half", 1);
    expect(Object.keys(slots).length).toBe(0);
  });

  it("returns correct warlock slots at level 1", () => {
    const slots = computeSpellSlots("warlock", 1);
    // Level 1: 1 slot of level 1
    expect(slots[1]).toBe(1);
  });

  it("returns correct warlock slots at level 11 (3 slots of level 5)", () => {
    const slots = computeSpellSlots("warlock", 11);
    expect(slots[5]).toBe(3);
    expect(Object.keys(slots).length).toBe(1);
  });
});
