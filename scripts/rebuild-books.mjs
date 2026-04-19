#!/usr/bin/env node
/**
 * Orchestrator: runs the existing per-book build scripts over the re-OCR'd
 * PDFs. Pipes pdftotext output into each build-*-subclasses.mjs and
 * build-*-feats.mjs script.
 *
 * Usage:
 *   node scripts/rebuild-books.mjs                # all books
 *   node scripts/rebuild-books.mjs --book phb     # one book
 *   node scripts/rebuild-books.mjs --only subclasses
 *   node scripts/rebuild-books.mjs --src original # use original PDF instead of *-clean
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const HOMEBREW_DIR = join(REPO_ROOT, "homebrew");

const BOOKS = [
  {
    slug: "phb",
    original: "Manual del Jugador.pdf",
    scripts: {
      subclasses: "build-phb-subclasses.mjs",
      feats: "build-phb-feats.mjs",
    },
  },
  {
    slug: "tasha",
    original: "Caldero de Tasha para Todo.pdf",
    scripts: {
      subclasses: "build-tasha-subclasses.mjs",
      feats: "build-tasha-feats.mjs",
    },
  },
  {
    slug: "xanathar",
    original: "Guia de Xanathar Para Todo.pdf",
    scripts: {
      subclasses: "build-xanathar-subclasses.mjs",
      feats: "build-xanathar-feats.mjs",
    },
  },
];

const args = process.argv.slice(2);
const bookIdx = args.indexOf("--book");
const filterBook = bookIdx >= 0 ? args[bookIdx + 1] : null;
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null; // "subclasses" or "feats"
const srcIdx = args.indexOf("--src");
const src = srcIdx >= 0 ? args[srcIdx + 1] : "clean"; // "clean" or "original"

function resolveInput(book) {
  const clean = join(HOMEBREW_DIR, `${book.slug}-clean.pdf`);
  const original = join(HOMEBREW_DIR, book.original);

  if (src === "original") return original;
  if (existsSync(clean)) return clean;
  // Fallback to original if clean not available yet.
  console.log(`  (no ${book.slug}-clean.pdf, falling back to original)`);
  return original;
}

function runPipe(inputPath, scriptPath) {
  return new Promise((resolve, reject) => {
    const pdftotext = spawn("pdftotext", ["-layout", inputPath, "-"]);
    const builder = spawn("node", [scriptPath], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    pdftotext.stdout.pipe(builder.stdin);
    pdftotext.stderr.on("data", (d) => process.stderr.write(d));
    pdftotext.on("error", reject);
    builder.on("error", reject);
    builder.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`builder exit ${code}`)),
    );
  });
}

async function main() {
  const targets = filterBook ? BOOKS.filter((b) => b.slug === filterBook) : BOOKS;
  if (targets.length === 0) {
    console.error(`No book matches "${filterBook}"`);
    process.exit(1);
  }

  for (const book of targets) {
    console.log(`\n📖 ${book.slug}`);
    const input = resolveInput(book);
    if (!existsSync(input)) {
      console.warn(`  skip: input missing: ${input}`);
      continue;
    }
    console.log(`  input: ${input}`);

    const kinds = only ? [only] : Object.keys(book.scripts);
    for (const kind of kinds) {
      const scriptName = book.scripts[kind];
      if (!scriptName) continue;
      const scriptPath = join(__dirname, scriptName);
      if (!existsSync(scriptPath)) {
        console.warn(`  skip: ${scriptName} not found`);
        continue;
      }
      console.log(`  → ${kind} (${scriptName})`);
      try {
        await runPipe(input, scriptPath);
      } catch (err) {
        console.error(`  ✗ failed: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
