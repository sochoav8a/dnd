#!/usr/bin/env node
/**
 * Extracts draft subclass data from the local Spanish Xanathar PDF text.
 *
 * Usage:
 *   pdftotext -layout -f 8 -l 61 "homebrew/Guia de Xanathar Para Todo.pdf" - \
 *     | node scripts/extract-xanathar-subclasses.mjs
 *
 * Output:
 *   data/books/xanathar/manifest.json
 *   data/books/xanathar/subclasses.draft.json
 *   data/books/xanathar/README.md
 *
 * Notes:
 * - The draft JSON is intentionally not seeded automatically. Review it,
 *   clean it up as needed, then rename/copy it to subclasses.json.
 * - This parser is heuristic and tuned to the extracted text layout from
 *   the current Xanathar PDF in /home/santiago/dnd/homebrew.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/santiago/dnd";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "books", "xanathar");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const DRAFT_PATH = path.join(OUTPUT_DIR, "subclasses.draft.json");
const README_PATH = path.join(OUTPUT_DIR, "README.md");
const SOURCE_PDF = path.join(PROJECT_ROOT, "homebrew", "Guia de Xanathar Para Todo.pdf");

const SUBCLASSES = [
  { slug: "zealot", name: "Senda del Fanático", parentClass: "barbarian", headingKey: "sendadelfanatico" },
  { slug: "ancestral-guardian", name: "Senda del Guardián Ancestral", parentClass: "barbarian", headingKey: "sendadelguardianancestral" },
  { slug: "storm-herald", name: "Senda del Heraldo de las Tormentas", parentClass: "barbarian", headingKey: "sendadelheraldodelastormentas" },
  { slug: "swords", name: "Colegio de las Espadas", parentClass: "bard", headingKey: "colegiodelasespadas" },
  { slug: "glamour", name: "Colegio del Glamour", parentClass: "bard", headingKey: "colegiodelglamour" },
  { slug: "whispers", name: "Colegio de los Susurros", parentClass: "bard", headingKey: "colegiodelossusurros" },
  { slug: "celestial", name: "El Celestial", parentClass: "warlock", headingKey: "elcelestial" },
  { slug: "hexblade", name: "El Filo Maléfico", parentClass: "warlock", headingKey: "elfilomalefico" },
  { slug: "forge-domain", name: "Dominio de la Forja", parentClass: "cleric", headingKey: "dominiodelaforja" },
  { slug: "grave-domain", name: "Dominio de la Sepultura", parentClass: "cleric", headingKey: "dominiodelasepultura" },
  { slug: "shepherd", name: "Círculo del Pastor", parentClass: "druid", headingKey: "circulodelpastor" },
  { slug: "dreams", name: "Círculo de los Sueños", parentClass: "druid", headingKey: "circulodelossuenos" },
  { slug: "gloom-stalker", name: "Acechador en la Penumbra", parentClass: "ranger", headingKey: "acechadorenlapenumbra" },
  { slug: "horizon-walker", name: "Caminante del Horizonte", parentClass: "ranger", headingKey: "caminantedelhorizonte" },
  { slug: "monster-slayer", name: "Cazador de Monstruos", parentClass: "ranger", headingKey: "cazadordemonstruos" },
  { slug: "arcane-archer", name: "Arquero Arcano", parentClass: "fighter", headingKey: "arqueroarcano" },
  { slug: "cavalier", name: "Caballero", parentClass: "fighter", headingKey: "caballero" },
  { slug: "samurai", name: "Samurái", parentClass: "fighter", headingKey: "samurai" },
  { slug: "divine-soul", name: "Alma Divina", parentClass: "sorcerer", headingKey: "almadivina" },
  {
    slug: "storm-sorcery",
    name: "Hechicería de Tormenta",
    parentClass: "sorcerer",
    headingKey: "hechiceriadetormenta",
    headingFragments: ["hechicer", "tormenta"],
  },
  { slug: "shadow-magic", name: "Magia de las Sombras", parentClass: "sorcerer", headingKey: "magiadelassombras" },
  { slug: "war-magic", name: "Magia de Guerra", parentClass: "wizard", headingKey: "magiadeguerra" },
  { slug: "sun-soul", name: "Camino del Alma Solar", parentClass: "monk", headingKey: "caminodelalmasolar" },
  { slug: "kensei", name: "Camino del Kensei", parentClass: "monk", headingKey: "caminodelkensei" },
  {
    slug: "drunken-master",
    name: "Camino del Maestro Borracho",
    parentClass: "monk",
    headingKey: "caminodelmaestroborracho",
    headingFragments: ["maestro", "borracho"],
  },
  { slug: "conquest", name: "Juramento de Conquista", parentClass: "paladin", headingKey: "juramentodeconquista" },
  { slug: "redemption", name: "Juramento de Redención", parentClass: "paladin", headingKey: "juramentoderedencion" },
  { slug: "scout", name: "Batidor", parentClass: "rogue", headingKey: "batidor" },
  { slug: "swashbuckler", name: "Espadachín", parentClass: "rogue", headingKey: "espadachin" },
  { slug: "inquisitive", name: "Inquisitivo", parentClass: "rogue", headingKey: "inquisitivo" },
  { slug: "mastermind", name: "Mente Maestra", parentClass: "rogue", headingKey: "mentemaestra" },
];

function normalizeKey(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function collapseWhitespace(input) {
  return String(input ?? "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMostlyUpper(input) {
  const letters = [...String(input)].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return false;
  const lower = letters.filter(
    (char) => char === char.toLowerCase() && char !== char.toUpperCase(),
  ).length;
  return lower / letters.length < 0.35;
}

function isNoiseLine(input) {
  const line = collapseWhitespace(input);
  if (!line) return true;

  const key = normalizeKey(line);
  if (!key) return true;
  if (key.startsWith("capitulo")) return true;
  if (key === "l") return true;
  if (key.includes("opcionesdepersonaje")) return true;

  const letters = [...line].filter((char) => /\p{L}/u.test(char)).length;
  const weird = [...line].filter((char) => /[�\\/_{}[\]<>]/.test(char)).length;
  if (letters > 0 && weird / letters > 0.2) return true;

  return false;
}

function paragraphize(lines) {
  const paragraphs = [];
  let current = [];

  for (const rawLine of lines) {
    if (isNoiseLine(rawLine)) continue;
    const line = collapseWhitespace(rawLine)
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")");

    if (!line) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs.join("\n\n").trim();
}

function featureBaseKey(featureName) {
  return normalizeKey(String(featureName).replace(/\([^)]*\)/g, ""));
}

function splitFeatureList(raw) {
  return raw
    .split(",")
    .map((part) => collapseWhitespace(part))
    .filter(Boolean);
}

function uniqBy(items, getKey) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
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

function findSectionStarts(lines) {
  const starts = [];
  let cursor = 0;

  for (const subclass of SUBCLASSES) {
    let found = -1;
    for (let index = cursor; index < lines.length; index++) {
      const lineKey = normalizeKey(lines[index]);
      const matchesExact = lineKey.includes(subclass.headingKey);
      const matchesFragments =
        subclass.headingFragments?.every((fragment) => lineKey.includes(fragment)) ??
        false;
      if (lineKey.includes("rasgos") && (matchesExact || matchesFragments)) {
        found = index;
        break;
      }
    }

    if (found === -1) {
      throw new Error(`No pude ubicar la tabla de rasgos para "${subclass.name}"`);
    }

    starts.push(found);
    cursor = found + 1;
  }

  return starts;
}

function parseFeatureTable(sectionLines) {
  const rows = [];
  let currentLevel = null;
  let tableStarted = false;
  let tableEndIndex = sectionLines.length;

  for (let index = 1; index < sectionLines.length; index++) {
    const rawLine = sectionLines[index];
    const line = collapseWhitespace(rawLine);
    const lineKey = normalizeKey(line);

    if (!line) continue;
    if (lineKey.includes("nivelde") || lineKey === "rasgo") continue;

    const match = rawLine.match(/^\s*(\d{1,2})\s+(.*\S)\s*$/);
    if (match) {
      tableStarted = true;
      currentLevel = Number(match[1]);
      for (const feature of splitFeatureList(match[2])) {
        rows.push({ level: currentLevel, raw: feature });
      }
      continue;
    }

    if (!tableStarted) continue;

    if (currentLevel !== null && !isMostlyUpper(rawLine)) {
      for (const feature of splitFeatureList(line)) {
        rows.push({ level: currentLevel, raw: feature });
      }
      continue;
    }

    tableEndIndex = index;
    break;
  }

  return {
    tableEndIndex,
    tableRows: rows,
  };
}

function parseFeatureBodies(sectionLines, tableEndIndex, tableRows) {
  const uniqueFeatures = uniqBy(
    tableRows
      .map((row) => ({
        level: row.level,
        raw: row.raw,
        baseKey: featureBaseKey(row.raw),
      }))
      .filter((row) => row.baseKey),
    (row) => row.baseKey,
  );

  const bodyLines = sectionLines.slice(tableEndIndex);
  const bodyKeys = bodyLines.map(normalizeKey);
  const bodies = new Map();
  const warnings = [];
  let cursor = 0;

  for (let index = 0; index < uniqueFeatures.length; index++) {
    const feature = uniqueFeatures[index];
    let start = -1;
    for (let lineIndex = cursor; lineIndex < bodyLines.length; lineIndex++) {
      if (bodyKeys[lineIndex].includes(feature.baseKey)) {
        start = lineIndex;
        break;
      }
    }

    if (start === -1) {
      warnings.push(`No se encontró el cuerpo del rasgo "${feature.raw}"`);
      continue;
    }

    let end = bodyLines.length;
    for (let nextIndex = index + 1; nextIndex < uniqueFeatures.length; nextIndex++) {
      const nextKey = uniqueFeatures[nextIndex].baseKey;
      for (let lineIndex = start + 1; lineIndex < bodyLines.length; lineIndex++) {
        if (bodyKeys[lineIndex].includes(nextKey)) {
          end = lineIndex;
          break;
        }
      }
      if (end !== bodyLines.length) break;
    }

    const description = paragraphize(bodyLines.slice(start + 1, end));
    if (!description) {
      warnings.push(`No se pudo extraer texto útil para "${feature.raw}"`);
      cursor = Math.max(cursor, start + 1);
      continue;
    }

    bodies.set(feature.baseKey, {
      level: feature.level,
      name: collapseWhitespace(feature.raw),
      description,
    });
    cursor = Math.max(cursor, start + 1);
  }

  const featuresByLevel = {};
  for (const feature of bodies.values()) {
    const levelKey = String(feature.level);
    if (!featuresByLevel[levelKey]) featuresByLevel[levelKey] = [];
    featuresByLevel[levelKey].push({
      name: feature.name,
      description: feature.description,
    });
  }

  return {
    featuresByLevel,
    warnings,
    tableRows,
  };
}

function buildDraftEntries(lines) {
  const starts = findSectionStarts(lines);
  const entries = [];
  const report = [];

  for (let index = 0; index < SUBCLASSES.length; index++) {
    const subclass = SUBCLASSES[index];
    const start = starts[index];
    const end = starts[index + 1] ?? lines.length;
    const sectionLines = lines.slice(start, end);

    const { tableEndIndex, tableRows } = parseFeatureTable(sectionLines);
    const { featuresByLevel, warnings } = parseFeatureBodies(
      sectionLines,
      tableEndIndex,
      tableRows,
    );

    const featureCount = Object.values(featuresByLevel).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    entries.push({
      slug: subclass.slug,
      name: subclass.name,
      description: null,
      data: {
        parent_class: subclass.parentClass,
        flavor_name: subclass.name,
        features_by_level: featuresByLevel,
      },
      metadata: {
        draft: true,
        source_pdf: SOURCE_PDF,
        extractor: "scripts/extract-xanathar-subclasses.mjs",
        table_features_detected: tableRows.length,
        body_features_extracted: featureCount,
        warnings,
      },
    });

    report.push(
      [
        `## ${subclass.name}`,
        `- slug: \`${subclass.slug}\``,
        `- clase: \`${subclass.parentClass}\``,
        `- rasgos en tabla: ${tableRows.length}`,
        `- rasgos con cuerpo extraído: ${featureCount}`,
        ...(warnings.length > 0
          ? warnings.map((warning) => `- aviso: ${warning}`)
          : ["- avisos: ninguno"]),
      ].join("\n"),
    );
  }

  return {
    entries,
    reviewReport: report.join("\n\n"),
  };
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    throw new Error(
      "No recibí texto por stdin. Usa pdftotext -layout ... - | node scripts/extract-xanathar-subclasses.mjs",
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const lines = input.split(/\r?\n/);
  const { entries, reviewReport } = buildDraftEntries(lines);

  const manifest = {
    name: "Guía del Xanathar para Todo",
    type: "official",
  };

  const readme = [
    "# Guía del Xanathar para Todo",
    "",
    "Este directorio guarda borradores y paquetes seedables para contenido oficial local.",
    "",
    "Archivos relevantes:",
    "- `manifest.json`: define la fuente de contenido.",
    "- `subclasses.json`: bundle final listo para seed, generado con el builder limpio.",
    "- `subclasses.draft.json`: borrador generado por OCR/text extraction.",
    "- `sections/*.txt`: texto separado por subclase para revisión manual.",
    "",
    "Flujo recomendado:",
    "1. Generar secciones de trabajo por subclase con `pdftotext -f 8 -l 61 \"homebrew/Guia de Xanathar Para Todo.pdf\" - | node scripts/split-xanathar-subclass-sections.mjs`.",
    "2. Generar o regenerar el borrador con `pdftotext -layout -f 8 -l 61 \"homebrew/Guia de Xanathar Para Todo.pdf\" - | node scripts/extract-xanathar-subclasses.mjs`.",
    "3. Regenerar el bundle seedable con `pdftotext -layout -f 8 -l 61 \"homebrew/Guia de Xanathar Para Todo.pdf\" - | node scripts/build-xanathar-subclasses.mjs`.",
    "4. Ejecutar `pnpm db:seed` para cargar la fuente y los items en la base.",
    "",
    "El seed ignora el archivo `.draft.json` a propósito y consume `subclasses.json`.",
    "",
    "## Resumen de extracción",
    "",
    reviewReport,
    "",
  ].join("\n");

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  writeFileSync(DRAFT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");
  writeFileSync(README_PATH, readme, "utf8");

  console.log(`Manifest written to ${MANIFEST_PATH}`);
  console.log(`Draft written to ${DRAFT_PATH}`);
  console.log(`Review notes written to ${README_PATH}`);

  if (!existsSync(SOURCE_PDF)) {
    console.warn(`Warning: expected PDF not found at ${SOURCE_PDF}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
