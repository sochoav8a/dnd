#!/usr/bin/env node
/**
 * Builds data/books/tasha/feats.json from Caldero de Tasha PDF text.
 *
 * Tasha's Cauldron introduced additional feats:
 *   - Chef, Crusher, Piercer, Slasher, Skill Expert, Telekinetic,
 *     Telepathic, Eldritch Adept, Fey Touched, Shadow Touched,
 *     Metamagic Adept, Poisoner, Fighting Initiate
 *
 * Usage:
 *   pdftotext -layout "/home/santiago/dnd/homebrew/Caldero de Tasha..." - \
 *     | node scripts/build-tasha-feats.mjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFeatBundle } from "./lib/build-feat-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FEATS = [
  {
    slug: "chef",
    name: "Chef",
    aliases: ["CHEF", "COCINERO"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["CON", "WIS"] },
        modifiers: [prof("tool.cooks-utensils", "cooks-utensils", "chef")],
      },
    },
  },
  {
    slug: "crusher",
    name: "Triturador",
    aliases: ["TRITURADOR", "MACHACADOR"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "CON"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "piercer",
    name: "Perforador",
    aliases: ["PERFORADOR", "PENETRADOR"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "slasher",
    name: "Rebanador",
    aliases: ["REBANADOR", "CORTADOR"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "skill-expert",
    name: "Experto en Habilidades",
    aliases: ["EXPERTO EN HABILIDADES"],
    override: {
      data: {
        ability_score_choice: {
          amount: 1,
          from: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
        },
        modifiers: [],
      },
    },
  },
  {
    slug: "telekinetic",
    name: "Telequinético",
    aliases: ["TELEQUINÉTICO", "TELEQUINETICO", "TELEQ,UINÉTICO", "TELEQ,UINETICO"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["INT", "WIS", "CHA"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "telepathic",
    name: "Telepático",
    aliases: ["TELEPÁTICO", "TELEPATICO", "TELÉPATA", "TELEPATA"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["INT", "WIS", "CHA"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "fey-touched",
    name: "Toque Feérico",
    aliases: ["TOQUE FEÉRICO", "TOQUE FEERICO", "TOCADO POR LO FEÉRICO"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["INT", "WIS", "CHA"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "shadow-touched",
    name: "Toque Sombrío",
    aliases: ["TOQUE SOMBRÍO", "TOQUE SOMBRIO", "TOCADO POR LAS SOMBRAS"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["INT", "WIS", "CHA"] },
        modifiers: [],
      },
    },
  },
  { slug: "eldritch-adept", name: "Adepto Sobrenatural", aliases: ["ADEPTO SOBRENATURAL"] },
  { slug: "metamagic-adept", name: "Adepto de la Metamagia", aliases: ["ADEPTO DE LA METAMAGIA", "ADEPTO EN METAMAGIA"] },
  { slug: "poisoner", name: "Envenenador", aliases: ["ENVENENADOR"] },
  { slug: "fighting-initiate", name: "Iniciado en Combate", aliases: ["INICIADO EN COMBATE"] },
  {
    slug: "artificer-initiate",
    name: "Iniciado Artífice",
    aliases: ["INICIADO ARTÍFICE", "INICIADO ARTIFICE"],
    override: {
      data: {
        modifiers: [],
      },
    },
  },
  { slug: "gunner", name: "Artillero", aliases: ["ARTILLERO"] },
];

function prof(target, value, sourceSuffix) {
  return {
    target,
    type: "proficiency",
    value,
    source: `feat:${sourceSuffix}`,
    priority: 10,
  };
}

await buildFeatBundle({
  sourceName: "Caldero de Tasha para Todo",
  bookSlug: "tasha",
  outputDir: resolve(__dirname, "../data/books/tasha"),
  outputFile: "feats.json",
  sourcePdf: "Caldero de Tasha para Todo.pdf",
  extractor: "pdftotext -raw",
  feats: FEATS,
});
