#!/usr/bin/env node
/**
 * Splits the plain pdftotext output of Xanathar into one text file per subclass.
 *
 * Usage:
 *   pdftotext -f 8 -l 61 "homebrew/Guia de Xanathar Para Todo.pdf" - \
 *     | node scripts/split-xanathar-subclass-sections.mjs
 *
 * Output:
 *   data/books/xanathar/sections/<slug>.txt
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = "/home/santiago/dnd";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "books", "xanathar", "sections");

const SUBCLASSES = [
  { slug: "zealot", headingKey: "sendadelfanatico" },
  { slug: "ancestral-guardian", headingKey: "sendadelguardianancestral" },
  { slug: "storm-herald", headingKey: "sendadelheraldodelastormentas" },
  { slug: "swords", headingKey: "colegiodelasespadas" },
  { slug: "glamour", headingKey: "colegiodelglamour" },
  { slug: "whispers", headingKey: "colegiodelossusurros" },
  { slug: "celestial", headingKey: "elcelestial" },
  { slug: "hexblade", headingKey: "elfilomalefico" },
  { slug: "forge-domain", headingKey: "dominiodelaforja" },
  { slug: "grave-domain", headingKey: "dominiodelasepultura" },
  { slug: "shepherd", headingKey: "circulodelpastor" },
  { slug: "dreams", headingKey: "circulodelossuenos" },
  { slug: "gloom-stalker", headingKey: "acechadorenlapenumbra" },
  { slug: "horizon-walker", headingKey: "caminantedelhorizonte" },
  { slug: "monster-slayer", headingKey: "cazadordemonstruos" },
  { slug: "arcane-archer", headingKey: "arqueroarcano" },
  { slug: "cavalier", headingKey: "caballero" },
  { slug: "samurai", headingKey: "samurai" },
  { slug: "divine-soul", headingKey: "almadivina" },
  {
    slug: "storm-sorcery",
    headingKey: "hechiceriadetormenta",
    headingFragments: ["hechicer", "tormenta"],
  },
  { slug: "shadow-magic", headingKey: "magiadelassombras" },
  { slug: "war-magic", headingKey: "magiadeguerra" },
  { slug: "sun-soul", headingKey: "caminodelalmasolar" },
  { slug: "kensei", headingKey: "caminodelkensei" },
  {
    slug: "drunken-master",
    headingKey: "caminodelmaestroborracho",
    headingFragments: ["maestro", "borracho"],
  },
  { slug: "conquest", headingKey: "juramentodeconquista" },
  { slug: "redemption", headingKey: "juramentoderedencion" },
  { slug: "scout", headingKey: "batidor" },
  { slug: "swashbuckler", headingKey: "espadachin" },
  { slug: "inquisitive", headingKey: "inquisitivo" },
  { slug: "mastermind", headingKey: "mentemaestra" },
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

function isHeadingLine(line, headingKey) {
  const key = normalizeKey(line);
  if (!key) return false;
  const withoutArticle = headingKey.replace(/^(el|la|los|las)/, "");
  return key.includes(`rasgosde${headingKey}`)
    || key.includes(`rasgosdela${headingKey}`)
    || key.includes(`rasgosdel${headingKey}`)
    || (withoutArticle !== headingKey && key.includes(`rasgosde${withoutArticle}`))
    || (withoutArticle !== headingKey && key.includes(`rasgosdela${withoutArticle}`))
    || (withoutArticle !== headingKey && key.includes(`rasgosdel${withoutArticle}`));
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    throw new Error(
      "No recibí texto por stdin. Usa pdftotext -f 8 -l 61 ... - | node scripts/split-xanathar-subclass-sections.mjs",
    );
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const lines = input.split(/\r?\n/);
  const starts = [];
  let cursor = lines.findIndex((line) => normalizeKey(line) === "barbaro");
  if (cursor === -1) cursor = 0;

  for (const subclass of SUBCLASSES) {
    let found = -1;
    for (let index = cursor; index < lines.length; index++) {
      const lineKey = normalizeKey(lines[index]);
      const matchesExact = isHeadingLine(lines[index], subclass.headingKey);
      const matchesFragments =
        subclass.headingFragments?.every((fragment) => lineKey.includes(fragment)) ??
        false;
      if (matchesExact || (lineKey.includes("rasgos") && matchesFragments)) {
        found = index;
        break;
      }
    }

    if (found === -1) {
      throw new Error(`No pude ubicar la sección para "${subclass.slug}"`);
    }

    starts.push(found);
    cursor = found + 1;
  }

  for (let index = 0; index < SUBCLASSES.length; index++) {
    const subclass = SUBCLASSES[index];
    const start = starts[index];
    const end = starts[index + 1] ?? lines.length;
    const section = lines
      .slice(start, end)
      .map(collapseWhitespace)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    writeFileSync(
      path.join(OUTPUT_DIR, `${subclass.slug}.txt`),
      section + "\n",
      "utf8",
    );
  }

  console.log(`Wrote ${SUBCLASSES.length} subclass sections to ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
