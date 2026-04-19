#!/usr/bin/env node
/**
 * Post-processes already-extracted book JSONs to fix common Spanish OCR
 * fragmentation artifacts. Writes a .bak of each file before modifying.
 *
 * Usage:
 *   node scripts/clean-book-ocr.mjs               # clean all books
 *   node scripts/clean-book-ocr.mjs phb           # clean a specific book
 *   node scripts/clean-book-ocr.mjs --dry-run     # no-op preview
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanOcrDeep, cleanOcrText } from "./lib/clean-ocr-text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = resolve(__dirname, "../data/books");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const filters = args.filter((a) => !a.startsWith("--"));

function collectStrings(value, into = []) {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, into));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectStrings(v, into));
  return into;
}

function diffCount(before, after) {
  const b = collectStrings(before);
  const a = collectStrings(after);
  let changed = 0;
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== a[i]) changed++;
  }
  return { total: b.length, changed };
}

function cleanFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);
  const cleaned = cleanOcrDeep(json);
  const { total, changed } = diffCount(json, cleaned);
  return { json, cleaned, total, changed, raw };
}

function processBookDir(bookSlug) {
  const bookDir = join(BOOKS_DIR, bookSlug);
  if (!existsSync(bookDir) || !statSync(bookDir).isDirectory()) {
    console.warn(`  skip ${bookSlug}: not a directory`);
    return;
  }
  const entries = readdirSync(bookDir).filter(
    (f) => f.endsWith(".json") && !f.endsWith(".bak.json") && f !== "manifest.json",
  );
  console.log(`\n📖 ${bookSlug}`);
  let anyChange = false;
  for (const file of entries) {
    const filePath = join(bookDir, file);
    const { cleaned, total, changed, raw } = cleanFile(filePath);
    const status = changed > 0 ? "✏️ " : "✓ ";
    console.log(`  ${status}${file} — ${changed}/${total} strings changed`);
    if (changed === 0) continue;
    anyChange = true;
    if (!dryRun) {
      const backupPath = filePath.replace(/\.json$/, ".bak.json");
      if (!existsSync(backupPath)) {
        writeFileSync(backupPath, raw, "utf-8");
      }
      writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + "\n", "utf-8");
    }
  }
  if (!anyChange) console.log(`  (no changes)`);
}

// ── Main ────────────────────────────────────────────────────────────────
if (!existsSync(BOOKS_DIR)) {
  console.error("No data/books/ found.");
  process.exit(1);
}

const allBooks = readdirSync(BOOKS_DIR).filter((f) =>
  statSync(join(BOOKS_DIR, f)).isDirectory(),
);

const targets = filters.length > 0 ? filters : allBooks;

console.log(
  dryRun
    ? "🔍 Dry run — no files will be written."
    : "🧹 Cleaning OCR artifacts in book JSONs (backups saved as *.bak.json)",
);
console.log(`Targets: ${targets.join(", ")}`);

for (const book of targets) {
  processBookDir(book);
}

// Quick self-test so the cleaner stays honest.
const tests = [
  ["c riatura", "criatura"],
  ["pa ra los", "para los"],
  ["Cr íti Co Mejora D o", "Crítico Mejorado"],
  ["una criatura que", "una criatura que"],
  ["Mejora D o", "Mejorado"],
  ["s i eliges", "si eliges"],
  ["tal y como", "tal y como"], // must NOT be merged
];
console.log("\n🧪 Self-test:");
let failed = 0;
for (const [input, expected] of tests) {
  const got = cleanOcrText(input);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`  ${ok ? "✓" : "✗"}  "${input}" → "${got}"${ok ? "" : ` (want "${expected}")`}`);
}
if (failed > 0) {
  console.error(`\n${failed} self-test(s) failed.`);
  process.exit(2);
}
