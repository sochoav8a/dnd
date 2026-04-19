#!/usr/bin/env node
/**
 * Builds data/books/tasha/spells.json from the Spanish Tasha PDF.
 *
 * Usage:
 *   pdftotext -raw homebrew/tasha-clean.pdf - | node scripts/build-tasha-spells.mjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpellBundle } from "./lib/build-spell-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SPELLS = [
  // ── SCAG cantrips reprinted in Tasha ───────────────────────────────
  {
    slug: "booming-blade",
    name: "Filo Atronador",
    aliases: ["FILO ATRONADOR"],
    data: {
      level: 0,
      school: "evocation",
      casting_time: "1 acción",
      range: "Lanzador (5 pies)",
      components: { V: false, S: true, M: "un arma cuerpo a cuerpo con al menos 1 po de valor" },
      duration: "1 asalto",
      concentration: false,
      classes: ["artificer", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "green-flame-blade",
    name: "Filo de Llamas Verdes",
    aliases: ["FILO DE LLAMAS VERDES"],
    data: {
      level: 0,
      school: "evocation",
      casting_time: "1 acción",
      range: "Lanzador (5 pies)",
      components: { V: false, S: true, M: "un arma cuerpo a cuerpo con al menos 1 po de valor" },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "lightning-lure",
    name: "Atracción del Relámpago",
    aliases: ["ATRACCIÓN DEL RELÁMPAGO", "ATRACCION DEL RELAMPAGO"],
    data: {
      level: 0,
      school: "evocation",
      casting_time: "1 acción",
      range: "Lanzador (15 pies)",
      components: { V: true, S: false },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "sword-burst",
    name: "Estallido de Espadas",
    aliases: ["ESTALLIDO DE ESPADAS"],
    data: {
      level: 0,
      school: "conjuration",
      casting_time: "1 acción",
      range: "Lanzador (5 pies)",
      components: { V: true, S: false },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "sorcerer", "warlock", "wizard"],
    },
  },

  // ── 4th level — Tasha originals ────────────────────────────────────
  {
    slug: "intellect-fortress",
    name: "Fortaleza del Intelecto",
    aliases: ["FORTALEZA DEL INTELECTO"],
    data: {
      level: 4,
      school: "abjuration",
      casting_time: "1 acción",
      range: "30 pies",
      components: { V: true, S: false },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      classes: ["artificer", "bard", "sorcerer", "warlock", "wizard"],
    },
  },
  {
    slug: "summon-construct",
    name: "Invocar Autómata",
    aliases: ["INVOCAR AUTÓMATA", "INVOCAR AUTOMATA"],
    data: {
      level: 4,
      school: "conjuration",
      casting_time: "1 acción",
      range: "90 pies",
      components: {
        V: true,
        S: true,
        M: "una joya de 400 po engastada en metal, arcilla o piedra",
      },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      classes: ["artificer", "wizard"],
    },
  },
];

await buildSpellBundle({
  sourceName: "Caldero de Tasha para Todo",
  bookSlug: "tasha",
  outputDir: resolve(__dirname, "../data/books/tasha"),
  outputFile: "spells.json",
  sourcePdf: "Caldero de Tasha para Todo.pdf",
  extractor: "pdftotext -raw",
  spells: SPELLS,
});
