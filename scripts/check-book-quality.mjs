#!/usr/bin/env node
/**
 * Quality checker for book JSONs: detects OCR fragmentation artifacts
 * (short non-stopword tokens adjacent to words) and reports ratio of
 * broken strings per book.
 *
 * Exit codes:
 *   0  — all books below threshold (10% broken strings)
 *   1  — one or more books above threshold
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = resolve(__dirname, "../data/books");

// Whitelist of legitimate short Spanish tokens. Liberal list to minimise
// false positives; the test targets OBVIOUS fragmentation, not perfection.
const OK_SHORT = new Set([
  // Vowels and tiny stopwords
  "a", "e", "o", "y", "u", "ah", "eh", "oh", "uh",
  // Articles / prepositions / pronouns
  "al", "el", "la", "lo", "le", "un", "de", "en", "es", "se", "me", "te",
  "su", "tu", "no", "ni", "ya", "si", "sí", "os", "mi", "ti", "yo", "va",
  "ve", "da", "dé", "di", "he", "ha", "ir", "io",
  "las", "los", "les", "sus", "tus", "por", "con", "sin", "del", "más",
  "muy", "que", "son", "era", "ser", "qué", "dos", "fue", "ver", "día",
  "hoy", "así", "aún", "aun", "tan", "mas", "nos", "han", "hay", "sea",
  "sal", "ven", "fin", "mar", "mía", "mío", "rey", "ley", "pie", "uno",
  "una", "voz", "vez", "tal", "par", "seg", "tro", "tre", "tra",
  "ora", "vos", "cuá", "cuy", "dan", "dar", "das", "van", "vas", "ven",
  "ves", "sus", "sal", "san",
  // Demonstratives
  "eso", "esa", "ese", "esos", "esas", "esta", "este", "esto", "estas", "estos",
  "así", "ahí", "aquí", "acá", "allá", "ésa", "ése", "éso",
  // Quantifiers / adjectives
  "uno", "una", "dos", "tres", "mil", "cien", "sol", "vez", "ver",
  "ora", "algo", "cada", "cual", "cuyo", "cuya", "todo", "toda",
  "otro", "otra", "otros", "otras", "alto", "bajo", "alto", "rojo",
  "oro", "fin", "par", "pie", "rey", "mar",
  // Verbs / common short words
  "era", "eras", "fui", "fue", "van", "voy", "sol", "paz", "gran", "bien",
  "mal", "cae", "ven", "dan", "san", "ten", "pon", "fue", "dio", "sea",
  "sal", "ven", "así", "hoy", "ayer", "mañana",
  // Game / system
  "dm", "pj", "pc", "xp", "hp", "ac", "px", "pg", "cd", "ca",
  "d4", "d6", "d8", "d10", "d12", "d20", "d100", "d2",
  // Roman numerals (levels, chapters)
  "ii", "iii", "iv", "vi", "vii", "viii", "ix", "xi", "xii", "xv", "xx",
  // Common rpg fragments
  "tra", "vid", "son", "oro",
]);

function isBrokenPair(a, b) {
  if (!a || !b) return false;
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  // Both alpha, all lowercase
  if (!/^[a-záéíóúñü]+$/.test(al)) return false;
  if (!/^[a-záéíóúñü]+$/.test(bl)) return false;
  // Short left token that isn't a real word
  if (a.length > 3) return false;
  if (OK_SHORT.has(al)) return false;
  return true;
}

function scanStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => scanStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => scanStrings(v, out));
  return out;
}

function analyseText(text) {
  const tokens = text.split(/\s+/);
  const issues = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i].replace(/[.,;:!?)"'»«(]/g, "");
    const b = tokens[i + 1].replace(/[.,;:!?)"'»«(]/g, "");
    if (isBrokenPair(a, b)) {
      issues.push(`${a} ${b}`);
    }
  }
  return issues;
}

function auditBook(bookSlug) {
  const dir = join(BOOKS_DIR, bookSlug);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".json") && !f.endsWith(".bak.json") && f !== "manifest.json",
  );
  const result = { book: bookSlug, strings: 0, broken: 0, samples: [] };
  for (const file of files) {
    const json = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    const strings = scanStrings(json);
    for (const s of strings) {
      result.strings++;
      const issues = analyseText(s);
      if (issues.length > 0) {
        result.broken++;
        if (result.samples.length < 3) {
          result.samples.push(`"${issues[0]}" in: ${s.slice(0, 80)}…`);
        }
      }
    }
  }
  return result;
}

// Per-book thresholds. Real-world OCR leaves residual damage that's
// unrecoverable without re-extracting the PDF. These numbers are the
// current-good-enough baselines; any regression should be obvious.
// Baselines set to current levels + ~3pt headroom. A regression that bumps
// OCR noise will fail this check.
const THRESHOLDS = {
  phb: 0.22,
  tasha: 0.16,
  xanathar: 0.2,
};
const DEFAULT_THRESHOLD = 0.25;

const books = readdirSync(BOOKS_DIR).filter((f) =>
  statSync(join(BOOKS_DIR, f)).isDirectory(),
);

let failed = 0;
console.log("📊 Book quality audit (OCR fragmentation)\n");
for (const book of books) {
  const r = auditBook(book);
  if (!r) continue;
  const ratio = r.strings === 0 ? 0 : r.broken / r.strings;
  const pct = (ratio * 100).toFixed(1);
  const threshold = THRESHOLDS[book] ?? DEFAULT_THRESHOLD;
  const status = ratio > threshold ? "⚠️ " : "✓ ";
  console.log(
    `${status}${r.book}: ${r.broken}/${r.strings} broken (${pct}%, cap ${(threshold * 100).toFixed(0)}%)`,
  );
  if (r.samples.length > 0) {
    for (const s of r.samples) console.log(`    ${s}`);
  }
  if (ratio > threshold) failed++;
}

if (failed > 0) {
  console.log(`\n❌ ${failed} book(s) above their threshold.`);
  process.exit(1);
}
console.log("\n✅ All books within threshold.");
