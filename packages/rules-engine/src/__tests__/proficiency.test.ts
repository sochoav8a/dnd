import { describe, it, expect } from "vitest";
import { getProficiencyBonus } from "../proficiency.js";

describe("getProficiencyBonus", () => {
  it("returns +2 for levels 1-4", () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(2)).toBe(2);
    expect(getProficiencyBonus(3)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
  });

  it("returns +3 for levels 5-8", () => {
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(6)).toBe(3);
    expect(getProficiencyBonus(7)).toBe(3);
    expect(getProficiencyBonus(8)).toBe(3);
  });

  it("returns +4 for levels 9-12", () => {
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(12)).toBe(4);
  });

  it("returns +5 for levels 13-16", () => {
    expect(getProficiencyBonus(13)).toBe(5);
    expect(getProficiencyBonus(16)).toBe(5);
  });

  it("returns +6 for levels 17-20", () => {
    expect(getProficiencyBonus(17)).toBe(6);
    expect(getProficiencyBonus(20)).toBe(6);
  });

  it("throws for out-of-range levels", () => {
    expect(() => getProficiencyBonus(0)).toThrow(RangeError);
    expect(() => getProficiencyBonus(21)).toThrow(RangeError);
  });
});
