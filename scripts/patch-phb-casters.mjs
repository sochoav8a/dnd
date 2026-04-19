#!/usr/bin/env node
/**
 * Applies third-caster spell_casting data to Eldritch Knight and Arcane
 * Trickster in the PHB bundle (they're already in the build script's
 * overrides but applying them requires re-running the parser on the PDF,
 * which needs the source. This script does the patch directly on the JSON.)
 *
 * Idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "../data/books/phb/subclasses.json");

const PATCHES = {
  "eldritch-knight": {
    ability: "INT",
    type: "third",
    cantrips_known: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spells_known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  },
  "arcane-trickster": {
    ability: "INT",
    type: "third",
    cantrips_known: [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    spells_known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  },
};

const data = JSON.parse(readFileSync(FILE, "utf-8"));
let changed = 0;
for (const sc of data) {
  const patch = PATCHES[sc.slug];
  if (!patch) continue;
  const before = JSON.stringify(sc.data.spell_casting);
  sc.data.spell_casting = patch;
  const after = JSON.stringify(sc.data.spell_casting);
  if (before !== after) changed++;
}
writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`✓ patched ${changed} caster subclass(es)`);
