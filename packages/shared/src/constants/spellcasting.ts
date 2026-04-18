import type { ClassData } from "../types/content.js";
import type { AbilityScores } from "../types/ability-scores.js";
import type { Ability } from "./abilities.js";

/**
 * Caps SRD 5.1 por clase/nivel para gestionar hechizos y cantrips aprendidos.
 *
 * Distinguimos entre:
 * - "known caster": elige una lista fija de hechizos conocidos (bard, sorcerer, warlock, ranger).
 * - "prepared caster": prepara hechizos cada descanso largo del total de la clase (cleric, druid, paladin).
 * - "spellbook caster" (wizard): conoce los hechizos de su grimorio; prepara un subconjunto al día.
 */
export type CasterKind = "known" | "prepared" | "spellbook" | "none";

export function getCasterKind(classSlug: string): CasterKind {
  switch (classSlug) {
    case "bard":
    case "sorcerer":
    case "warlock":
    case "ranger":
      return "known";
    case "cleric":
    case "druid":
    case "paladin":
      return "prepared";
    case "wizard":
      return "spellbook";
    default:
      return "none";
  }
}

export interface SpellCaps {
  /** Cuántos cantrips puede conocer en total a este nivel */
  cantripsKnown: number;
  /**
   * Para "known" y "spellbook": tamaño total del repertorio (hechizos que "conoce")
   * Para "prepared": tamaño máximo de la lista preparada (= nivel + mod de habilidad, mínimo 1)
   */
  spellsKnown: number;
  /** Nivel máximo de slot disponible (para filtrar el picker) */
  maxSpellLevel: number;
}

const SLOT_TABLES: Record<string, number[][]> = {
  // full caster: 20 filas con slots por nivel [1..9]
  full: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ],
  half: [
    [0, 0, 0, 0, 0], [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0], [3, 0, 0, 0, 0],
    [4, 2, 0, 0, 0], [4, 2, 0, 0, 0],
    [4, 3, 0, 0, 0], [4, 3, 0, 0, 0],
    [4, 3, 2, 0, 0], [4, 3, 2, 0, 0],
    [4, 3, 3, 0, 0], [4, 3, 3, 0, 0],
    [4, 3, 3, 1, 0], [4, 3, 3, 1, 0],
    [4, 3, 3, 2, 0], [4, 3, 3, 2, 0],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
  ],
};

function maxSpellLevelFor(type: ClassData["spell_casting"] extends infer T ? T : never, level: number): number {
  // SRD quick ref: lv1→1, 3→2, 5→3 (full); 2→1, 5→2, 9→3 (half); warlock uses slot level directly.
  // We derive from class slot table if available.
  const t = (type as { type?: string } | null)?.type ?? "full";
  const table = SLOT_TABLES[t] ?? SLOT_TABLES["full"]!;
  const row = table[Math.max(0, Math.min(19, level - 1))] ?? [];
  let max = 0;
  for (let i = 0; i < row.length; i++) if ((row[i] ?? 0) > 0) max = i + 1;
  if (t === "warlock") {
    // Warlock slots by pact magic; top slot unlocks at levels 1,3,5,7,9
    if (level >= 9) max = 5;
    else if (level >= 7) max = 4;
    else if (level >= 5) max = 3;
    else if (level >= 3) max = 2;
    else max = 1;
  }
  return max;
}

/**
 * Devuelve los caps de hechizos/cantrips para una clase a un nivel dado,
 * considerando el modificador de la habilidad de casteo cuando aplica (prepared casters).
 */
export function getSpellCaps(
  classData: ClassData,
  classSlug: string,
  level: number,
  abilityScores: AbilityScores,
): SpellCaps {
  const sc = classData.spell_casting;
  if (!sc) return { cantripsKnown: 0, spellsKnown: 0, maxSpellLevel: 0 };

  const kind = getCasterKind(classSlug);
  const idx = Math.max(0, Math.min(19, level - 1));
  const cantripsKnown = sc.cantrips_known?.[idx] ?? 0;
  const abilityMod = Math.floor((abilityScores[sc.ability as Ability] - 10) / 2);

  let spellsKnown = 0;
  if (kind === "known") {
    spellsKnown = sc.spells_known?.[idx] ?? 0;
  } else if (kind === "prepared") {
    // "cantidad preparada" = nivel por clase + mod habilidad (min 1)
    // Para paladín/ranger half-caster el cálculo redondeado hacia abajo.
    if (sc.type === "half") {
      spellsKnown = Math.max(1, Math.floor(level / 2) + abilityMod);
    } else {
      spellsKnown = Math.max(1, level + abilityMod);
    }
  } else if (kind === "spellbook") {
    // Wizard: empieza con 6 hechizos de nivel 1; +2 por nivel.
    // Lo tratamos como cap de "conocidos / en el grimorio".
    spellsKnown = 6 + (level - 1) * 2;
  }

  return {
    cantripsKnown,
    spellsKnown,
    maxSpellLevel: maxSpellLevelFor(sc, level),
  };
}
