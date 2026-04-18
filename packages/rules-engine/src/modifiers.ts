import type { Modifier } from "@dnd/shared";
import type { AbilityModifiers } from "@dnd/shared";

/**
 * Resolves a modifier value that may be a string expression referencing ability modifiers.
 * Supported expressions: numeric values or ability modifier keys like "DEX", "CON", "CHA", etc.
 * Complex expressions like "10+DEX+CON" are also supported.
 */
export function resolveModifierValue(
  value: number | string,
  modifiers: AbilityModifiers,
): number {
  if (typeof value === "number") return value;

  // Handle expressions like "10+DEX+CON", "CHA", "DEX"
  let expr = value.trim();

  // Replace ability names with their modifier values
  const abilityPattern = /\b(STR|DEX|CON|INT|WIS|CHA)\b/g;
  expr = expr.replace(abilityPattern, (match) => {
    const mod = modifiers[match as keyof AbilityModifiers];
    return mod >= 0 ? String(mod) : String(mod);
  });

  // Simple expression evaluator (only + and -)
  const parts = expr.split(/([+-])/);
  let result = 0;
  let sign = 1;
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "+") { sign = 1; continue; }
    if (trimmed === "-") { sign = -1; continue; }
    if (trimmed === "") continue;
    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) result += sign * num;
  }
  return result;
}

/**
 * Collects all modifiers targeting a specific prefix (e.g. "skill.stealth", "saving_throw.DEX").
 */
export function collectModifiersForTarget(
  modifiers: Modifier[],
  target: string,
): Modifier[] {
  return modifiers
    .filter((m) => m.target === target)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Applies a list of modifiers to a base value, respecting D&D 5e stacking rules:
 *  - "set" modifiers are applied first (lowest priority wins if multiple)
 *  - "bonus" modifiers stack additively
 *  - Only one "proficiency" modifier applies (no double-proficiency stacking unless "expertise")
 */
export function applyModifiers(
  base: number,
  modifiers: Modifier[],
  abilityModifiers: AbilityModifiers,
  hasProficiency: boolean,
  proficiencyBonus: number,
): {
  total: number;
  proficient: boolean;
  expertise: boolean;
} {
  const sorted = [...modifiers].sort((a, b) => a.priority - b.priority);

  let value = base;
  let proficient = hasProficiency;
  let expertise = false;

  for (const mod of sorted) {
    switch (mod.type) {
      case "set": {
        const resolved = resolveModifierValue(mod.value, abilityModifiers);
        value = resolved;
        break;
      }
      case "bonus": {
        const resolved = resolveModifierValue(mod.value, abilityModifiers);
        value += resolved;
        break;
      }
      case "proficiency": {
        if (!proficient) {
          proficient = true;
          value += proficiencyBonus;
        }
        break;
      }
      case "expertise": {
        if (!expertise) {
          expertise = true;
          if (!proficient) {
            proficient = true;
            value += proficiencyBonus * 2;
          } else {
            // Already proficient — add the second proficiency
            value += proficiencyBonus;
          }
        }
        break;
      }
    }
  }

  return { total: value, proficient, expertise };
}
