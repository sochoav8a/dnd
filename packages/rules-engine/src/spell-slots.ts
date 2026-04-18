/**
 * Full caster spell slots by level (PHB table).
 * Index 0 = level 1, index 19 = level 20.
 * Inner array: [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
 */
export const FULL_CASTER_SLOTS: number[][] = [
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],
  [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1],
  [4,3,3,3,3,2,2,1,1],
];

/** Half caster (Paladin, Ranger) — available from level 2 */
export const HALF_CASTER_SLOTS: number[][] = [
  [0,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
];

/** Warlock Pact Magic slots: [slotsAvailable, slotLevel] per character level */
export const WARLOCK_PACT_SLOTS: Array<{ slots: number; level: number }> = [
  { slots: 1, level: 1 },
  { slots: 2, level: 1 },
  { slots: 2, level: 2 },
  { slots: 2, level: 2 },
  { slots: 2, level: 3 },
  { slots: 2, level: 3 },
  { slots: 2, level: 4 },
  { slots: 2, level: 4 },
  { slots: 2, level: 5 },
  { slots: 2, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
];

/**
 * Multiclass spellcasting: effective caster level per class type (PHB p. 165).
 * Warlocks always use Pact Magic and are excluded from the combined table.
 */
function effectiveCasterLevel(type: "full" | "half" | "third" | "warlock", level: number): number {
  if (type === "warlock") return 0; // Pact Magic is separate
  if (type === "full") return level;
  if (type === "half") return Math.floor(level / 2);
  return Math.floor(level / 3); // third
}

/**
 * Computes combined multiclass spell slots using the full-caster table (PHB p. 165).
 * Warlocks' Pact Magic is returned separately under the special key 0.
 *
 * @param casters  Array of { type, level } for each spellcasting class entry.
 */
export function computeMulticlassSpellSlots(
  casters: Array<{ type: "full" | "half" | "third" | "warlock"; level: number }>,
): Record<number, number> {
  let combinedLevel = 0;
  let warlockLevel: number | null = null;

  for (const c of casters) {
    if (c.type === "warlock") {
      warlockLevel = c.level;
    } else {
      combinedLevel += effectiveCasterLevel(c.type, c.level);
    }
  }

  const result: Record<number, number> = {};

  if (combinedLevel > 0) {
    const levelIndex = Math.min(combinedLevel - 1, 19);
    const row = FULL_CASTER_SLOTS[levelIndex];
    if (row) {
      row.forEach((count, i) => {
        if (count > 0) result[i + 1] = count;
      });
    }
  }

  // Pact Magic slots are tracked separately at key 0 to avoid collision
  if (warlockLevel !== null) {
    const pact = WARLOCK_PACT_SLOTS[warlockLevel - 1];
    if (pact) {
      // Store warlock slots at their pact level — consumer merges if needed
      result[pact.level] = (result[pact.level] ?? 0) + pact.slots;
    }
  }

  return result;
}

/**
 * Returns spell slots by spell level (1-9) for a given caster type and character level.
 * Returns an object mapping spell level to number of slots.
 */
export function computeSpellSlots(
  casterType: "full" | "half" | "third" | "warlock" | null,
  level: number,
  customSlots?: number[][],
): Record<number, number> {
  if (!casterType) return {};

  const levelIndex = level - 1;

  if (casterType === "warlock") {
    const pact = WARLOCK_PACT_SLOTS[levelIndex];
    if (!pact) return {};
    return { [pact.level]: pact.slots };
  }

  let slotsTable: number[][];

  if (customSlots) {
    slotsTable = customSlots;
  } else if (casterType === "full") {
    slotsTable = FULL_CASTER_SLOTS;
  } else {
    slotsTable = HALF_CASTER_SLOTS;
  }

  const row = slotsTable[levelIndex];
  if (!row) return {};

  const result: Record<number, number> = {};
  row.forEach((count, i) => {
    if (count > 0) result[i + 1] = count;
  });
  return result;
}
