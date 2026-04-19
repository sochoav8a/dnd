#!/usr/bin/env node
/**
 * Builds data/books/xanathar/spells.json from the Spanish Xanathar PDF.
 *
 * Usage:
 *   pdftotext -raw homebrew/xanathar-clean.pdf - | node scripts/build-xanathar-spells.mjs
 *
 * Structured metadata is hardcoded per spell; description is extracted
 * from the PDF body after stripping the statblock block.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpellBundle } from "./lib/build-spell-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Spells the Artificer needs that are *only* in XGtE (not in SRD).
const SPELLS = [
  // ── Cantrips (level 0) ─────────────────────────────────────────────
  {
    slug: "create-bonfire",
    name: "Crear Hoguera",
    aliases: ["CREAR HOGUERA"],
    data: {
      level: 0,
      school: "conjuration",
      casting_time: "1 acción",
      range: "60 pies",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 minuto",
      concentration: true,
      classes: ["artificer", "druid", "sorcerer", "wizard"],
    },
  },
  {
    slug: "frostbite",
    name: "Congelar",
    aliases: ["CONGELAR"],
    data: {
      level: 0,
      school: "evocation",
      casting_time: "1 acción",
      range: "60 pies",
      components: { V: true, S: true },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "druid", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "magic-stone",
    name: "Piedra Mágica",
    aliases: ["PIEDRA MÁGICA", "PIEDRA MAGICA"],
    data: {
      level: 0,
      school: "transmutation",
      casting_time: "1 acción adicional",
      range: "Toque",
      components: { V: true, S: true },
      duration: "1 minuto",
      concentration: false,
      classes: ["artificer", "druid", "warlock"],
    },
  },
  {
    slug: "thunderclap",
    name: "Tronar",
    aliases: ["TRONAR"],
    data: {
      level: 0,
      school: "evocation",
      casting_time: "1 acción",
      range: "Lanzador (5 pies de radio)",
      components: { V: false, S: true },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "bard", "druid", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "toll-the-dead",
    name: "Tañido por los Muertos",
    aliases: ["TAÑIDO POR LOS MUERTOS", "TANIDO POR LOS MUERTOS"],
    data: {
      level: 0,
      school: "necromancy",
      casting_time: "1 acción",
      range: "60 pies",
      components: { V: true, S: true },
      duration: "Instantáneo",
      concentration: false,
      classes: ["cleric", "warlock", "wizard"],
    },
  },

  // ── 1st level ──────────────────────────────────────────────────────
  {
    slug: "absorb-elements",
    name: "Absorber Elementos",
    aliases: ["ABSORBER ELEMENTOS", "ABSORBER LOS ELEMENTOS"],
    data: {
      level: 1,
      school: "abjuration",
      casting_time: "1 reacción",
      range: "Lanzador",
      components: { V: false, S: true },
      duration: "1 asalto",
      concentration: false,
      classes: ["artificer", "druid", "ranger", "sorcerer", "wizard"],
    },
  },
  {
    slug: "catapult",
    name: "Catapulta",
    aliases: ["CATAPULTA"],
    data: {
      level: 1,
      school: "transmutation",
      casting_time: "1 acción",
      range: "60 pies",
      components: { V: false, S: true },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "sorcerer", "wizard"],
    },
  },
  {
    slug: "snare",
    name: "Atrapar",
    aliases: ["ATRAPAR"],
    data: {
      level: 1,
      school: "abjuration",
      casting_time: "1 minuto",
      range: "Toque",
      components: { V: true, S: true, M: "25 pies de cuerda, que el conjuro consume" },
      duration: "8 horas",
      concentration: false,
      classes: ["artificer", "druid", "ranger", "wizard"],
    },
  },

  // ── 2nd level ──────────────────────────────────────────────────────
  {
    slug: "pyrotechnics",
    name: "Pirotecnia",
    aliases: ["PIROTECNIA"],
    data: {
      level: 2,
      school: "transmutation",
      casting_time: "1 acción",
      range: "60 pies",
      components: { V: true, S: true },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "bard", "sorcerer", "wizard"],
    },
  },
  {
    slug: "skywrite",
    name: "Escribir en las Nubes",
    aliases: ["ESCRIBIR EN LAS NUBES"],
    data: {
      level: 2,
      school: "transmutation",
      casting_time: "1 acción",
      range: "Vista",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      ritual: true,
      classes: ["artificer", "bard", "druid", "wizard"],
    },
  },

  // ── 3rd level ──────────────────────────────────────────────────────
  {
    slug: "catnap",
    name: "Cabezadita",
    aliases: ["CABEZADITA"],
    data: {
      level: 3,
      school: "enchantment",
      casting_time: "1 acción",
      range: "30 pies",
      components: { V: false, S: true, M: "una pizca de arena" },
      duration: "10 minutos",
      concentration: false,
      classes: ["artificer", "bard", "sorcerer", "wizard"],
    },
  },
  {
    slug: "flame-arrows",
    name: "Flechas Llameantes",
    aliases: ["FLECHAS LLAMEANTES", "FLECHAS FLAMEANTES"],
    data: {
      level: 3,
      school: "transmutation",
      casting_time: "1 acción",
      range: "Toque",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      classes: ["artificer", "druid", "ranger", "sorcerer", "wizard"],
    },
  },
  {
    slug: "tiny-servant",
    name: "Siervo Diminuto",
    aliases: ["SIERVO DIMINUTO"],
    data: {
      level: 3,
      school: "transmutation",
      casting_time: "1 minuto",
      range: "Toque",
      components: { V: true, S: true },
      duration: "8 horas",
      concentration: false,
      classes: ["artificer", "wizard"],
    },
  },

  // ── 4th level ──────────────────────────────────────────────────────
  {
    slug: "elemental-bane",
    name: "Perdición Elemental",
    aliases: ["PERDICIÓN ELEMENTAL", "PERDICION ELEMENTAL"],
    data: {
      level: 4,
      school: "transmutation",
      casting_time: "1 acción",
      range: "90 pies",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 minuto",
      concentration: true,
      classes: ["artificer", "druid", "warlock", "wizard"],
    },
  },

  // ── 5th level ──────────────────────────────────────────────────────
  {
    slug: "skill-empowerment",
    name: "Fortalecer Habilidad",
    aliases: ["FORTALECER HABILIDAD"],
    data: {
      level: 5,
      school: "transmutation",
      casting_time: "1 acción",
      range: "Toque",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      classes: ["artificer", "bard", "sorcerer", "wizard"],
    },
  },
  {
    slug: "transmute-rock",
    name: "Transmutar Piedra",
    aliases: ["TRANSMUTAR PIEDRA", "TRANSMUTAR ROCA"],
    data: {
      level: 5,
      school: "transmutation",
      casting_time: "1 acción",
      range: "120 pies",
      components: { V: true, S: true, M: "arcilla y agua" },
      duration: "Hasta que se disipe",
      concentration: false,
      classes: ["artificer", "druid", "wizard"],
    },
  },
];

await buildSpellBundle({
  sourceName: "Guía del Xanathar para Todo",
  bookSlug: "xanathar",
  outputDir: resolve(__dirname, "../data/books/xanathar"),
  outputFile: "spells.json",
  sourcePdf: "Guia de Xanathar Para Todo.pdf",
  extractor: "pdftotext -raw",
  spells: SPELLS,
});
