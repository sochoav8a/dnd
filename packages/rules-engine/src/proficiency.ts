/**
 * Returns the proficiency bonus for a given character level.
 * D&D 5e: +2 at 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20.
 */
export function getProficiencyBonus(level: number): number {
  if (level < 1 || level > 20) {
    throw new RangeError(`Level must be between 1 and 20, got ${level}`);
  }
  return Math.ceil(level / 4) + 1;
}

/**
 * Returns the number of ki points / sorcery points / etc. by level.
 * Used generically — the actual value is always equal to monk/sorcerer level.
 */
export function getResourcePointsByLevel(level: number): number {
  return level;
}
