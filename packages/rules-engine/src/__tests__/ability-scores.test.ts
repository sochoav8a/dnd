import { describe, it, expect } from "vitest";
import { getModifier, computeModifiers } from "../ability-scores.js";
import type { AbilityScores } from "@dnd/shared";

describe("getModifier", () => {
  it("returns correct modifiers for standard scores", () => {
    const cases: Array<[number, number]> = [
      [1, -5],
      [2, -4],
      [3, -4],
      [4, -3],
      [5, -3],
      [6, -2],
      [7, -2],
      [8, -1],
      [9, -1],
      [10, 0],
      [11, 0],
      [12, 1],
      [13, 1],
      [14, 2],
      [15, 2],
      [16, 3],
      [17, 3],
      [18, 4],
      [19, 4],
      [20, 5],
    ];

    for (const [score, expected] of cases) {
      expect(getModifier(score), `score ${score}`).toBe(expected);
    }
  });
});

describe("computeModifiers", () => {
  it("computes all ability modifiers correctly", () => {
    const scores: AbilityScores = {
      STR: 16,
      DEX: 14,
      CON: 12,
      INT: 10,
      WIS: 8,
      CHA: 18,
    };

    const mods = computeModifiers(scores);
    expect(mods.STR).toBe(3);
    expect(mods.DEX).toBe(2);
    expect(mods.CON).toBe(1);
    expect(mods.INT).toBe(0);
    expect(mods.WIS).toBe(-1);
    expect(mods.CHA).toBe(4);
  });
});
