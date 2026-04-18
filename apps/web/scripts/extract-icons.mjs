#!/usr/bin/env node
/**
 * Extracts a curated subset of game-icons.net icons used by the D&D app.
 * Output: apps/web/src/lib/icons/curated.json (ready for iconify addCollection).
 *
 * Run with: node apps/web/scripts/extract-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Set of icon names we want from game-icons (license: CC-BY 3.0).
// Keep this list small to avoid bundling the full 4MB icon set.
const WANTED = new Set([
  // Classes
  "barbarian", "harp", "holy-symbol", "holy-oak", "crossed-swords",
  "fist", "mailed-fist", "bow-string", "rogue", "spark-spirit",
  "warlock-eye", "wizard-staff",
  // Races
  "hood", "elf-ear", "dwarf-face", "hobbit-door", "bad-gnome",
  "orc-head", "dragon-head", "devil-mask",
  // Conditions
  "blindfold", "charm", "human-ear", "sleepy", "terror", "grapple",
  "knockout", "invisible", "frozen-body", "stone-bust", "poison",
  "fall-down", "crossed-chains", "knocked-out-stars", "night-sleep",
  // Schools of magic
  "shield", "magic-gate", "crystal-ball", "flame", "domino-mask",
  "animal-skull", "transform",
  // Abilities
  "muscle-up", "acrobatic", "ball-heart", "brain", "wisdom", "theater",
  // Damage types
  "acid-blob", "flat-hammer", "frozen-orb", "mighty-force",
  "chain-lightning", "piercing-sword", "psychic-waves", "barbed-sun",
  "crossed-slashes", "thunder-blade",
  // Misc UI (HP, initiative, AC, etc)
  "hearts", "health-potion", "sword-wound", "divert", "backup",
  "hourglass", "scroll-quill", "swords-emblem",
]);

const src = resolve(
  __dirname,
  "../node_modules/@iconify-json/game-icons/icons.json",
);
const data = JSON.parse(readFileSync(src, "utf-8"));

const out = {
  prefix: "dnd",
  width: data.width ?? 512,
  height: data.height ?? 512,
  icons: {},
};

let missing = [];
for (const name of WANTED) {
  const ic = data.icons[name];
  if (!ic) {
    missing.push(name);
    continue;
  }
  out.icons[name] = {
    body: ic.body,
    ...(ic.width ? { width: ic.width } : {}),
    ...(ic.height ? { height: ic.height } : {}),
  };
}

const dest = resolve(__dirname, "../src/lib/icons/curated.json");
writeFileSync(dest, JSON.stringify(out));

const sizeKb = (JSON.stringify(out).length / 1024).toFixed(1);
console.log(`✓ wrote ${Object.keys(out.icons).length} icons (${sizeKb}KB) → ${dest}`);
if (missing.length > 0) {
  console.warn(`⚠ missing: ${missing.join(", ")}`);
}
