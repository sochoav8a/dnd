#!/usr/bin/env node
/**
 * Patches data/srd/feats.json to add ability_score_improvement /
 * ability_score_choice data to half-feats per PHB 5e rules.
 *
 * Idempotent: only sets when not already present.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "../data/srd/feats.json");

// slug → patch
const PATCHES = {
  // Fixed single-ability +1
  actor: { ability_score_improvement: { CHA: 1 } },
  "dragon-hellfire": { ability_score_improvement: { CHA: 1 } },
  durable: { ability_score_improvement: { CON: 1 } },
  "heavily-armored": { ability_score_improvement: { STR: 1 } },
  "heavy-armor-master": { ability_score_improvement: { STR: 1 } },
  "keen-mind": { ability_score_improvement: { INT: 1 } },
  linguist: { ability_score_improvement: { INT: 1 } },

  // Choice between 2 abilities
  athlete: { ability_score_choice: { amount: 1, from: ["STR", "DEX"] } },
  "lightly-armored": { ability_score_choice: { amount: 1, from: ["STR", "DEX"] } },
  "moderately-armored": { ability_score_choice: { amount: 1, from: ["STR", "DEX"] } },
  observant: { ability_score_choice: { amount: 1, from: ["INT", "WIS"] } },
  "weapon-master": { ability_score_choice: { amount: 1, from: ["STR", "DEX"] } },
  "tavern-brawler": { ability_score_choice: { amount: 1, from: ["STR", "CON"] } },

  // Any one ability
  resilient: {
    ability_score_choice: {
      amount: 1,
      from: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
    },
  },
};

const data = JSON.parse(readFileSync(FILE, "utf8"));
let updated = 0;
for (const feat of data) {
  const patch = PATCHES[feat.slug];
  if (!patch) continue;
  const before = JSON.stringify(feat.data);
  feat.data = { ...feat.data, ...patch };
  const after = JSON.stringify(feat.data);
  if (before !== after) updated++;
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`✓ patched ${updated} feats (of ${Object.keys(PATCHES).length} mapped)`);
