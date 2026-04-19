#!/usr/bin/env node
/**
 * Builds a clean, seedable `subclasses.json` for Xanathar from the local PDF
 * text produced by `pdftotext -layout`.
 *
 * Usage:
 *   pdftotext -layout -f 8 -l 61 "homebrew/Guia de Xanathar Para Todo.pdf" - \
 *     | node scripts/build-xanathar-subclasses.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/santiago/dnd";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "books", "xanathar");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "subclasses.json");

function proficiency(target, value, source) {
  return { target, type: "proficiency", value, source, priority: 20 };
}

function expertise(target, value, source) {
  return { target, type: "expertise", value, source, priority: 30 };
}

function bonus(target, value, source, condition) {
  return {
    target,
    type: "bonus",
    value,
    source,
    priority: 20,
    ...(condition ? { condition } : {}),
  };
}

function resistance(value, source) {
  return {
    target: `resistance.${value}`,
    type: "resistance",
    value,
    source,
    priority: 20,
  };
}

function immunity(value, source) {
  return {
    target: `immunity.${value}`,
    type: "immunity",
    value,
    source,
    priority: 20,
  };
}

function feature(level, name, options = {}) {
  return {
    level,
    name,
    aliases: options.aliases ?? [name],
    modifiers: options.modifiers,
  };
}

const SUBCLASSES = [
  {
    slug: "zealot",
    name: "Senda del Fanático",
    parentClass: "barbarian",
    aliases: ["Senda del Fanático"],
    features: [
      feature(3, "Furia Divina"),
      feature(3, "Guerrero de los Dioses"),
      feature(6, "Foco Fanático"),
      feature(10, "Presencia Ferviente"),
      feature(14, "Furia Más Allá de la Muerte"),
    ],
  },
  {
    slug: "ancestral-guardian",
    name: "Senda del Guardián Ancestral",
    parentClass: "barbarian",
    aliases: ["Senda del Guardián Ancestral"],
    features: [
      feature(3, "Protectores Ancestrales"),
      feature(6, "Escudo de los Espíritus"),
      feature(10, "Consultar a los Espíritus"),
      feature(14, "Ancestros Vengativos"),
    ],
  },
  {
    slug: "storm-herald",
    name: "Senda del Heraldo de las Tormentas",
    parentClass: "barbarian",
    aliases: ["Senda del Heraldo de las Tormentas"],
    features: [
      feature(3, "Aura de Tormenta"),
      feature(6, "Alma de Tormenta"),
      feature(10, "Tormenta Protectora"),
      feature(14, "Tormenta Enfurecida"),
    ],
  },
  {
    slug: "swords",
    name: "Colegio de las Espadas",
    parentClass: "bard",
    aliases: ["Colegio de las Espadas"],
    features: [
      feature(3, "Competencias Adicionales", {
        modifiers: [
          proficiency("armor.medium", "medium", "subclass:bard:swords:additional_proficiencies"),
          proficiency("weapon.scimitar", "scimitar", "subclass:bard:swords:additional_proficiencies"),
        ],
      }),
      feature(3, "Estilo de Combate"),
      feature(3, "Floritura con la Espada"),
      feature(6, "Ataque Adicional"),
      feature(14, "Floritura del Maestro"),
    ],
  },
  {
    slug: "glamour",
    name: "Colegio del Glamour",
    parentClass: "bard",
    aliases: ["Colegio del Glamour"],
    features: [
      feature(3, "Manto de Inspiración"),
      feature(3, "Interpretación Cautivadora"),
      feature(6, "Manto de Majestad"),
      feature(14, "Majestad Inquebrantable"),
    ],
  },
  {
    slug: "whispers",
    name: "Colegio de los Susurros",
    parentClass: "bard",
    aliases: ["Colegio de los Susurros"],
    features: [
      feature(3, "Hoja Psíquica"),
      feature(3, "Palabras de Terror"),
      feature(6, "Manto de Susurros"),
      feature(14, "Saber de las Sombras"),
    ],
  },
  {
    slug: "celestial",
    name: "El Celestial",
    parentClass: "warlock",
    aliases: ["El Celestial"],
    features: [
      feature(1, "Trucos Adicionales"),
      feature(1, "Luz Sanadora"),
      feature(6, "Alma Radiante", {
        modifiers: [resistance("radiant", "subclass:warlock:celestial:radiant_soul")],
      }),
      feature(10, "Resiliencia Celestial"),
      feature(14, "Venganza Ardiente"),
    ],
  },
  {
    slug: "hexblade",
    name: "El Filo Maléfico",
    parentClass: "warlock",
    aliases: ["El Filo Maléfico"],
    features: [
      feature(1, "Maldición del Filo Maléfico"),
      feature(1, "Guerrero Maléfico", {
        modifiers: [
          proficiency("armor.medium", "medium", "subclass:warlock:hexblade:hex_warrior"),
          proficiency("armor.shields", "shields", "subclass:warlock:hexblade:hex_warrior"),
          proficiency("weapon.martial", "martial", "subclass:warlock:hexblade:hex_warrior"),
        ],
      }),
      feature(6, "Espectro Maldito"),
      feature(10, "Armadura de Maleficios"),
      feature(14, "Maestro de Maldiciones"),
    ],
  },
  {
    slug: "forge-domain",
    name: "Dominio de la Forja",
    parentClass: "cleric",
    aliases: ["Dominio de la Forja"],
    features: [
      feature(1, "Competencias Adicionales", {
        modifiers: [
          proficiency("armor.heavy", "heavy", "subclass:cleric:forge:bonus_proficiencies"),
          proficiency("tool.smiths_tools", "smiths_tools", "subclass:cleric:forge:bonus_proficiencies"),
        ],
      }),
      feature(1, "Bendición de la Forja"),
      feature(2, "Canalizar Divinidad: Bendición del Artesano", {
        aliases: ["Bendición del Artesano"],
      }),
      feature(6, "Alma de la Forja", {
        modifiers: [
          resistance("fire", "subclass:cleric:forge:soul_of_the_forge"),
          bonus("ac", 1, "subclass:cleric:forge:soul_of_the_forge", { armor_type: "heavy" }),
        ],
      }),
      feature(8, "Golpe Divino"),
      feature(17, "Santo de la Forja y el Fuego", {
        modifiers: [immunity("fire", "subclass:cleric:forge:saint_of_forge_and_fire")],
      }),
    ],
  },
  {
    slug: "grave-domain",
    name: "Dominio de la Sepultura",
    parentClass: "cleric",
    aliases: ["Dominio de la Sepultura"],
    features: [
      feature(1, "Círculo de Mortalidad"),
      feature(1, "Ojos de la Tumba", {
        aliases: ["Ojos de la Tumba", "Ujos de la Tumba"],
      }),
      feature(2, "Canalizar Divinidad: Camino a la Sepultura", {
        aliases: ["Camino a la Sepultura"],
      }),
      feature(6, "Centinela a las Puertas de la Muerte"),
      feature(8, "Lanzamiento Potente"),
      feature(17, "Guardián de Almas"),
    ],
  },
  {
    slug: "shepherd",
    name: "Círculo del Pastor",
    parentClass: "druid",
    aliases: ["Círculo del Pastor"],
    features: [
      feature(2, "Lengua de los Bosques"),
      feature(2, "Tótem Espiritual"),
      feature(6, "Invocador Poderoso"),
      feature(10, "Espíritu Guardián"),
      feature(14, "Fieles Invocados"),
    ],
  },
  {
    slug: "dreams",
    name: "Círculo de los Sueños",
    parentClass: "druid",
    aliases: ["Círculo de los Sueños"],
    features: [
      feature(2, "Bálsamo de la Corte del Verano"),
      feature(6, "Lumbre de Sombra y Luz de Luna"),
      feature(10, "Caminos Ocultos", {
        aliases: ["Caminos Ocultos", "Caminos Ucultos"],
      }),
      feature(14, "Caminante en Sueños"),
    ],
  },
  {
    slug: "gloom-stalker",
    name: "Acechador en la Penumbra",
    parentClass: "ranger",
    aliases: ["Acechador en la Penumbra"],
    features: [
      feature(3, "Emboscador Pavoroso"),
      feature(3, "Visión en la Umbra"),
      feature(7, "Mente de Hierro", {
        modifiers: [proficiency("saving_throw.WIS", "WIS", "subclass:ranger:gloom_stalker:iron_mind")],
      }),
      feature(11, "Oleada del Acechador", {
        aliases: ["Oleada del Acechador", "Uleada del Acechador"],
      }),
      feature(15, "Esquiva de las Sombras"),
    ],
  },
  {
    slug: "horizon-walker",
    name: "Caminante del Horizonte",
    parentClass: "ranger",
    aliases: ["Caminante del Horizonte"],
    features: [
      feature(3, "Detectar Portal"),
      feature(3, "Guerrero Interplanar"),
      feature(7, "Paso Etéreo"),
      feature(11, "Golpe Lejano"),
      feature(15, "Defensa Espectral"),
    ],
  },
  {
    slug: "monster-slayer",
    name: "Cazador de Monstruos",
    parentClass: "ranger",
    aliases: ["Cazador de Monstruos"],
    features: [
      feature(3, "Sentidos de Cazador"),
      feature(3, "Presa", {
        aliases: ["Presa", "Presa del Cazador Sobrenatural"],
      }),
      feature(7, "Defensa Sobrenatural"),
      feature(11, "Némesis de Magos"),
      feature(15, "Contraataque del Cazador"),
    ],
  },
  {
    slug: "arcane-archer",
    name: "Arquero Arcano",
    parentClass: "fighter",
    aliases: ["Arquero Arcano"],
    features: [
      feature(3, "Conocimiento de Arquero Arcano"),
      feature(3, "Disparo Arcano"),
      feature(7, "Flecha Mágica"),
      feature(7, "Disparo Curvo"),
      feature(15, "Disparo Siempre Listo"),
    ],
  },
  {
    slug: "cavalier",
    name: "Caballero",
    parentClass: "fighter",
    aliases: ["Caballero"],
    features: [
      feature(3, "Competencia Adicional"),
      feature(3, "Nacido en la Silla"),
      feature(3, "Marca Inquebrantable"),
      feature(7, "Maniobra de Protección"),
      feature(10, "Mantener la Formación"),
      feature(15, "Carga Feroz"),
      feature(18, "Defensor Atento"),
    ],
  },
  {
    slug: "samurai",
    name: "Samurái",
    parentClass: "fighter",
    aliases: ["Samurái", "Samurai"],
    features: [
      feature(3, "Competencia Adicional"),
      feature(3, "Espíritu de Lucha"),
      feature(7, "Cortesano Elegante"),
      feature(10, "Espíritu Incansable"),
      feature(15, "Golpe Súbito"),
      feature(18, "Fortaleza ante la Muerte"),
    ],
  },
  {
    slug: "divine-soul",
    name: "Alma Divina",
    parentClass: "sorcerer",
    aliases: ["Alma Divina"],
    features: [
      feature(1, "Magia Divina"),
      feature(1, "Favorecido por los Dioses"),
      feature(6, "Curación Mejorada"),
      feature(14, "Alas de Otro Mundo", {
        aliases: ["Alas de Otro Mundo", "Alas de Utro Mundo"],
      }),
      feature(18, "Recuperación Extraterrena"),
    ],
  },
  {
    slug: "storm-sorcery",
    name: "Hechicería de Tormenta",
    parentClass: "sorcerer",
    aliases: ["Hechicería de Tormenta", "Hechicerfa de Tormenta"],
    features: [
      feature(1, "Portavoz del Viento", {
        modifiers: [proficiency("language.primordial", "Primordial", "subclass:sorcerer:storm:wind_speaker")],
      }),
      feature(1, "Magia Tempestuosa"),
      feature(6, "Corazón de la Tormenta", {
        modifiers: [
          resistance("lightning", "subclass:sorcerer:storm:heart_of_the_storm"),
          resistance("thunder", "subclass:sorcerer:storm:heart_of_the_storm"),
        ],
      }),
      feature(6, "Guía de la Tormenta"),
      feature(14, "Furia de la Tormenta"),
      feature(18, "Alma del Viento", {
        modifiers: [
          immunity("lightning", "subclass:sorcerer:storm:soul_of_storm"),
          immunity("thunder", "subclass:sorcerer:storm:soul_of_storm"),
        ],
      }),
    ],
  },
  {
    slug: "shadow-magic",
    name: "Magia de las Sombras",
    parentClass: "sorcerer",
    aliases: ["Magia de las Sombras"],
    features: [
      feature(1, "Ojos de la Oscuridad", {
        aliases: ["Ojos de la Oscuridad", "Ujos de la Oscuridad"],
      }),
      feature(1, "Fuerza de Ultratumba"),
      feature(6, "Sabueso de Mal Agüero"),
      feature(14, "Caminante de Sombras"),
      feature(18, "Forma de Umbra"),
    ],
  },
  {
    slug: "war-magic",
    name: "Magia de Guerra",
    parentClass: "wizard",
    aliases: ["Magia de Guerra"],
    features: [
      feature(2, "Deflección Arcana"),
      feature(2, "Ingenio Táctico", {
        modifiers: [bonus("initiative", "INT", "subclass:wizard:war:tactical_wit")],
      }),
      feature(6, "Sobrecarga de Poder"),
      feature(10, "Magia Resistente"),
      feature(14, "Manto Deflector"),
    ],
  },
  {
    slug: "sun-soul",
    name: "Camino del Alma Solar",
    parentClass: "monk",
    aliases: ["Camino del Alma Solar"],
    features: [
      feature(3, "Rayo de Sol Radiante"),
      feature(6, "Golpe del Arco Ardiente"),
      feature(11, "Explosión Solar Abrasadora"),
      feature(17, "Escudo Solar"),
    ],
  },
  {
    slug: "kensei",
    name: "Camino del Kensei",
    parentClass: "monk",
    aliases: ["Camino del Kensei"],
    features: [
      feature(3, "Sendero del Kensei"),
      feature(6, "Uno con la Espada"),
      feature(11, "Afilar la Hoja"),
      feature(17, "Precisión Infalible"),
    ],
  },
  {
    slug: "drunken-master",
    name: "Camino del Maestro Borracho",
    parentClass: "monk",
    aliases: ["Camino del Maestro Borracho", "Maestro Borracho"],
    features: [
      feature(3, "Competencias Adicionales"),
      feature(3, "Técnica Ebria"),
      feature(6, "Bamboleo Achispado"),
      feature(11, "Suerte del Beodo"),
      feature(17, "Furia Embriagada"),
    ],
  },
  {
    slug: "conquest",
    name: "Juramento de Conquista",
    parentClass: "paladin",
    aliases: ["Juramento de Conquista"],
    features: [
      feature(3, "Canalizar Divinidad"),
      feature(7, "Aura de Conquista"),
      feature(15, "Reprimenda Despreciativa"),
      feature(20, "Conquistador Invencible"),
    ],
  },
  {
    slug: "redemption",
    name: "Juramento de Redención",
    parentClass: "paladin",
    aliases: ["Juramento de Redención"],
    features: [
      feature(3, "Canalizar Divinidad"),
      feature(7, "Aura del Guardián"),
      feature(15, "Espíritu Protector"),
      feature(20, "Emisario de Redención"),
    ],
  },
  {
    slug: "scout",
    name: "Batidor",
    parentClass: "rogue",
    aliases: ["Batidor"],
    features: [
      feature(3, "Experto en Escaramuzas"),
      feature(3, "Superviviente Nato", {
        modifiers: [
          proficiency("skill.nature", "nature", "subclass:rogue:scout:survivalist"),
          proficiency("skill.survival", "survival", "subclass:rogue:scout:survivalist"),
          expertise("skill.nature", "nature", "subclass:rogue:scout:survivalist"),
          expertise("skill.survival", "survival", "subclass:rogue:scout:survivalist"),
        ],
      }),
      feature(9, "Movilidad Superior", {
        modifiers: [bonus("speed", 10, "subclass:rogue:scout:superior_mobility")],
      }),
      feature(13, "Maestro de la Emboscada"),
      feature(17, "Ataque Súbito"),
    ],
  },
  {
    slug: "swashbuckler",
    name: "Espadachín",
    parentClass: "rogue",
    aliases: ["Espadachín", "Espadachin"],
    features: [
      feature(3, "Juego de Pies Elegante"),
      feature(3, "Audacia Galante", {
        modifiers: [bonus("initiative", "CHA", "subclass:rogue:swashbuckler:rakish_audacity")],
      }),
      feature(9, "Garbo"),
      feature(13, "Maniobra Elegante"),
      feature(17, "Duelista Experto"),
    ],
  },
  {
    slug: "inquisitive",
    name: "Inquisitivo",
    parentClass: "rogue",
    aliases: ["Inquisitivo"],
    features: [
      feature(3, "Oído para el Engaño", {
        aliases: ["Oído para el Engaño", "Uído para el Engaño"],
      }),
      feature(3, "Ojo para el Detalle", {
        aliases: ["Ojo para el Detalle", "Ujo para el Detalle"],
      }),
      feature(3, "Lucha Perspicaz"),
      feature(9, "Ojo Estable", {
        aliases: ["Ojo Estable", "Ujo Estable"],
      }),
      feature(13, "Vista Infalible"),
      feature(17, "Ojo para la Debilidad", {
        aliases: ["Ojo para la Debilidad", "Ujo para la Debilidad"],
      }),
    ],
  },
  {
    slug: "mastermind",
    name: "Mente Maestra",
    parentClass: "rogue",
    aliases: ["Mente Maestra"],
    features: [
      feature(3, "Maestro de la Intriga"),
      feature(3, "Maestro de la Táctica"),
      feature(9, "Manipulador Perspicaz"),
      feature(13, "Distracción"),
      feature(17, "Alma Engañosa"),
    ],
  },
];

function normalizeKey(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .replace(/\u000c/g, "")
    .replace(/�+/g, " ")
    .replace(/[ ]/g, " ")
    .replace(/\s+$/g, "");
}

function reconstructColumns(layoutText, cut = 64) {
  return layoutText
    .split("\f")
    .map((page) => {
      const left = [];
      const right = [];

      for (const rawLine of page.split(/\r?\n/)) {
        const line = cleanLine(rawLine);
        const leftPart = line.slice(0, cut).trimEnd();
        const rightPart = line.slice(cut).trimEnd();

        if (leftPart.trim()) left.push(leftPart);
        if (rightPart.trim()) right.push(rightPart.trimStart());
      }

      return [...left, "", ...right].join("\n");
    })
    .join("\n\n");
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", reject);
  });
}

function countLetters(line) {
  return [...String(line)].filter((char) => /\p{L}/u.test(char)).length;
}

function isNoiseLine(line) {
  const value = cleanLine(line).trim();
  if (!value) return true;

  const key = normalizeKey(value);
  if (!key) return true;
  if (key === "1" || key === "0" || key === "l") return true;
  if (key === "d6") return true;
  if (key.startsWith("capitulo")) return true;
  if (key.includes("opcionesdepersonaje")) return true;
  if (key.includes("deizquierdaaderecha")) return true;
  if (key.includes("rasgosde") || key === "rasgo") return true;
  if (key === "nivelde" || key === "conjuro" || key === "conjuros") return true;
  if (/^\d+$/.test(value)) return true;

  const letters = countLetters(value);
  const digits = [...value].filter((char) => /\d/.test(char)).length;
  const weird = [...value].filter((char) => /[\\/_{}[\]<>~`|]/.test(char)).length;
  if (letters === 0 && digits > 0) return true;
  if (letters > 0 && weird / letters > 0.2) return true;

  return false;
}

function findLineIndex(lines, aliases, startIndex, endIndex) {
  const aliasKeys = aliases.map(normalizeKey).filter(Boolean);

  for (let index = startIndex; index < endIndex; index++) {
    const lineKey = normalizeKey(lines[index]);
    if (!lineKey) continue;

    for (const aliasKey of aliasKeys) {
      if (
        lineKey === aliasKey
        || lineKey.includes(aliasKey)
        || aliasKey.includes(lineKey)
      ) {
        return index;
      }
    }
  }

  return -1;
}

function findTableIndex(lines, aliases, startIndex, endIndex) {
  const aliasKeys = aliases.map(normalizeKey);

  for (let index = startIndex; index < endIndex; index++) {
    const lineKey = normalizeKey(lines[index]);
    if (!lineKey) continue;
    if (!lineKey.includes("rasgos")) continue;
    for (const aliasKey of aliasKeys) {
      if (lineKey.includes(aliasKey) || aliasKey.includes(lineKey)) {
        return index;
      }
    }
  }

  return -1;
}

function findTitleBeforeTable(lines, subclassName, startIndex, tableIndex) {
  const nameKey = normalizeKey(subclassName);
  const floor = Math.max(startIndex, tableIndex - 120);

  for (let index = tableIndex - 1; index >= floor; index--) {
    const line = lines[index];
    const lineKey = normalizeKey(line);
    if (!lineKey || lineKey.includes("rasgos")) continue;
    if (!isMostlyUpper(line)) continue;
    if (lineKey === nameKey || lineKey.includes(nameKey) || nameKey.includes(lineKey)) {
      return index;
    }
  }

  return -1;
}

function isMostlyUpper(line) {
  const letters = [...String(line)].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return false;
  const lower = letters.filter(
    (char) => char === char.toLowerCase() && char !== char.toUpperCase(),
  ).length;
  return lower / letters.length < 0.25;
}

function findFeatureHeadingIndex(lines, aliases, startIndex, endIndex) {
  const aliasKeys = aliases.map(normalizeKey).filter(Boolean);

  for (let index = startIndex; index < endIndex; index++) {
    const line = lines[index];
    const lineKey = normalizeKey(line);
    if (!lineKey || !isMostlyUpper(line)) continue;

    for (const aliasKey of aliasKeys) {
      if (lineKey === aliasKey || lineKey.includes(aliasKey) || aliasKey.includes(lineKey)) {
        return index;
      }
    }
  }

  return findLineIndex(lines, aliases, startIndex, endIndex);
}

function paragraphize(lines) {
  const paragraphs = [];
  let current = "";

  for (const rawLine of lines) {
    const line = cleanLine(rawLine).trim();

    if (!line) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      continue;
    }

    if (isNoiseLine(line)) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      continue;
    }

    const normalized = normalizeKey(line);
    if (
      normalized.includes("rasgosde")
      || normalized.startsWith("conjurosde")
      || normalized.startsWith("nivelde")
    ) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      continue;
    }

    if (current.endsWith("-") || current.endsWith("­")) {
      current = current.slice(0, -1) + line;
    } else if (current) {
      current += ` ${line}`;
    } else {
      current = line;
    }
  }

  if (current) paragraphs.push(current.trim());

  return paragraphs
    .map((paragraph) =>
      paragraph
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\s{2,}/g, " "),
    )
    .filter((paragraph) => countLetters(paragraph) >= 20)
    .join("\n\n")
    .trim();
}

function cleanupDescription(text) {
  const cleaned = text
    .replace(/\b[A-ZÁÉÍÓÚÜÑ](?:\s+[A-ZÁÉÍÓÚÜÑ]){2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return countLetters(cleaned) >= 60 ? cleaned : null;
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    throw new Error(
      "No recibí texto por stdin. Usa pdftotext -layout -f 8 -l 61 ... - | node scripts/build-xanathar-subclasses.mjs",
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const reconstructed = reconstructColumns(input, 64);
  const lines = reconstructed.split(/\r?\n/).map(cleanLine);

  const tableIndexes = [];
  let tableCursor = 0;

  for (const subclass of SUBCLASSES) {
    const tableIndex = findTableIndex(
      lines,
      subclass.aliases ?? [subclass.name],
      tableCursor,
      lines.length,
    );
    if (tableIndex === -1) {
      if (process.env["STRICT"] === "1") {
        throw new Error(`No pude ubicar la tabla de rasgos de "${subclass.name}"`);
      }
      console.warn(
        `⚠ "${subclass.name}": no se ubicó la tabla; se omite (usar homebrew editor o llm-repair)`,
      );
      tableIndexes.push(-1);
      tableCursor += 1;
      continue;
    }

    tableIndexes.push(tableIndex);
    tableCursor = tableIndex + 1;
  }

  const entries = [];
  const report = [];

  for (let index = 0; index < SUBCLASSES.length; index++) {
    const subclass = SUBCLASSES[index];
    const tableIndex = tableIndexes[index];
    const nextTableIndex = tableIndexes[index + 1] ?? lines.length;
    const titleIndex = findTitleBeforeTable(
      lines,
      subclass.name,
      index === 0 ? 0 : tableIndexes[index - 1],
      tableIndex,
    );
    const nextTitleIndex = index < SUBCLASSES.length - 1
      ? findTitleBeforeTable(lines, SUBCLASSES[index + 1].name, tableIndex, nextTableIndex)
      : -1;
    const sectionEnd = nextTitleIndex !== -1 ? nextTitleIndex : nextTableIndex;

    const description = titleIndex !== -1
      ? cleanupDescription(paragraphize(lines.slice(titleIndex + 1, tableIndex)))
      : null;

    const featuresByLevel = {};
    const missing = [];
    let featureCursor = tableIndex + 1;

    for (let featureIndex = 0; featureIndex < subclass.features.length; featureIndex++) {
      const featureDef = subclass.features[featureIndex];
      const nextFeatureAliases = subclass.features
        .slice(featureIndex + 1)
        .flatMap((item) => item.aliases);

      const headingIndex = findFeatureHeadingIndex(
        lines,
        featureDef.aliases,
        featureCursor,
        sectionEnd,
      );

      if (headingIndex === -1) {
        missing.push(featureDef.name);
        continue;
      }

      let bodyEnd = sectionEnd;
      const nextHeadingIndex = nextFeatureAliases.length > 0
        ? findFeatureHeadingIndex(lines, nextFeatureAliases, headingIndex + 1, sectionEnd)
        : -1;
      if (nextHeadingIndex !== -1) bodyEnd = nextHeadingIndex;

      const body = paragraphize(lines.slice(headingIndex + 1, bodyEnd));
      if (!body) {
        missing.push(featureDef.name);
        featureCursor = headingIndex + 1;
        continue;
      }

      const levelKey = String(featureDef.level);
      if (!featuresByLevel[levelKey]) featuresByLevel[levelKey] = [];
      featuresByLevel[levelKey].push({
        name: featureDef.name,
        description: body,
        ...(featureDef.modifiers ? { modifiers: featureDef.modifiers } : {}),
      });

      featureCursor = headingIndex + 1;
    }

    if (missing.length > 0) {
      if (process.env["STRICT"] === "1") {
        throw new Error(
          `No pude extraer todos los rasgos de "${subclass.name}": ${missing.join(", ")}`,
        );
      }
      console.warn(
        `⚠ "${subclass.name}": faltan rasgos (${missing.join(", ")}); se omite para repararse manualmente`,
      );
      continue;
    }

    const featureCount = Object.values(featuresByLevel).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    entries.push({
      slug: subclass.slug,
      name: subclass.name,
      description,
      data: {
        parent_class: subclass.parentClass,
        flavor_name: subclass.name,
        features_by_level: featuresByLevel,
      },
      metadata: {
        source_pdf: path.join(PROJECT_ROOT, "homebrew", "Guia de Xanathar Para Todo.pdf"),
        extractor: "scripts/build-xanathar-subclasses.mjs",
      },
    });

    report.push(`${subclass.slug}: ${featureCount} rasgos`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");

  console.log(`Wrote ${entries.length} subclasses to ${OUTPUT_PATH}`);
  for (const line of report) console.log(`  - ${line}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
