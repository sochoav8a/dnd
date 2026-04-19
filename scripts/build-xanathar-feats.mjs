#!/usr/bin/env node
/**
 * Builds data/books/xanathar/feats.json from Guía de Xanathar PDF text.
 *
 * Usage:
 *   pdftotext -layout "/home/santiago/dnd/homebrew/Guia de Xanathar Para Todo.pdf" - \
 *     | node scripts/build-xanathar-feats.mjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFeatBundle } from "./lib/build-feat-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Xanathar's Guide does not add new feats in the core rules but does reprint
// some. Leave this as a template for the user to populate if needed.
const FEATS = [];

if (FEATS.length === 0) {
  console.log("(No feats declared for Xanathar — leaving placeholder.)");
  process.exit(0);
}

await buildFeatBundle({
  sourceName: "Guía del Xanathar para Todo",
  bookSlug: "xanathar",
  outputDir: resolve(__dirname, "../data/books/xanathar"),
  outputFile: "feats.json",
  sourcePdf: "Guia de Xanathar Para Todo.pdf",
  extractor: "pdftotext -layout",
  feats: FEATS,
});
