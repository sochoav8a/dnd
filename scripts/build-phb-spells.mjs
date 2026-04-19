#!/usr/bin/env node
/**
 * Builds data/books/phb/spells.json from the Spanish PHB PDF.
 *
 * Only spells the Artificer uses that aren't in the SRD export (the
 * Spanish PHB has them under different headings/spellings, hence a
 * targeted patch rather than re-seeding the whole PHB spell list).
 *
 * Usage:
 *   pdftotext -raw homebrew/phb-clean.pdf - | node scripts/build-phb-spells.mjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpellBundle } from "./lib/build-spell-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SPELLS = [
  {
    slug: "thorn-whip",
    name: "Látigo de Espinas",
    aliases: ["LÁTIGO DE ESPINAS", "LATIGO DE ESPINAS"],
    data: {
      level: 0,
      school: "transmutation",
      casting_time: "1 acción",
      range: "30 pies",
      components: { V: true, S: true, M: "el tallo de una planta con espinas" },
      duration: "Instantáneo",
      concentration: false,
      classes: ["artificer", "druid"],
    },
  },
  {
    slug: "elemental-weapon",
    name: "Arma Elemental",
    aliases: ["ARMA ELEMENTAL"],
    data: {
      level: 3,
      school: "transmutation",
      casting_time: "1 acción",
      range: "Toque",
      components: { V: true, S: true },
      duration: "Concentración, hasta 1 hora",
      concentration: true,
      classes: ["artificer", "paladin", "ranger"],
    },
  },
];

await buildSpellBundle({
  sourceName: "Manual del Jugador",
  bookSlug: "phb",
  outputDir: resolve(__dirname, "../data/books/phb"),
  outputFile: "spells.json",
  sourcePdf: "Manual del Jugador.pdf",
  extractor: "pdftotext -raw",
  spells: SPELLS,
});
