#!/usr/bin/env node
/**
 * Runs ocrmypdf with Spanish OCR on the book PDFs, replacing the broken
 * embedded-font text with clean tesseract output. The cleaned PDFs land in
 * homebrew/<slug>-clean.pdf and are the inputs for build-*-subclasses.mjs.
 *
 * Requires (install once):
 *   Arch:   sudo pacman -S tesseract tesseract-data-spa ghostscript unpaper python-pipx
 *           pipx install ocrmypdf
 *           (or: yay -S ocrmypdf)
 *   Debian: sudo apt install ocrmypdf tesseract-ocr-spa ghostscript unpaper
 *   Mac:    brew install ocrmypdf tesseract-lang
 *
 * Usage:
 *   node scripts/reocr-books.mjs               # all books
 *   node scripts/reocr-books.mjs --book phb    # one book
 *   node scripts/reocr-books.mjs --force       # re-OCR even if output exists
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const HOMEBREW_DIR = join(REPO_ROOT, "homebrew");

const BOOKS = [
  { slug: "phb", pdf: "Manual del Jugador.pdf" },
  { slug: "tasha", pdf: "Caldero de Tasha para Todo.pdf" },
  { slug: "xanathar", pdf: "Guia de Xanathar Para Todo.pdf" },
  { slug: "dmg", pdf: "Manual del Dungeon Master Completo 5E.pdf" },
  { slug: "monsters", pdf: "Manual de monstruos 5E.pdf" },
];

const args = process.argv.slice(2);
const filterIdx = args.indexOf("--book");
const filterBook = filterIdx >= 0 ? args[filterIdx + 1] : null;
const force = args.includes("--force");

function checkOcrmypdf() {
  return new Promise((resolve) => {
    const p = spawn("ocrmypdf", ["--version"], { stdio: "pipe" });
    p.on("exit", (code) => resolve(code === 0));
    p.on("error", () => resolve(false));
  });
}

function runOcrmypdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--language",
      "spa",
      "--redo-ocr", // reprocess pages with existing (bad) text
      "--jobs",
      "4",
      "--output-type",
      "pdf",
      "--optimize",
      "1", // light compression; keeps text searchable
      inputPath,
      outputPath,
    ];
    console.log(`    $ ocrmypdf ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`);

    // Force a disk-backed tempdir. Default /tmp is tmpfs on Arch and the
    // rasterised page images for a 170MB PDF can exceed its 7-8 GB RAM
    // budget, producing ENOSPC near the finish.
    const tmpDir = resolve(HOMEBREW_DIR, ".ocr-tmp");
    try { mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

    const child = spawn("ocrmypdf", args, {
      stdio: "inherit",
      env: { ...process.env, TMPDIR: tmpDir },
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ocrmypdf exit ${code}`)),
    );
    child.on("error", reject);
  });
}

async function main() {
  if (!(await checkOcrmypdf())) {
    console.error("❌ ocrmypdf not found. Install it first:");
    console.error("   Arch:   sudo pacman -S tesseract tesseract-data-spa ghostscript unpaper python-pipx");
    console.error("           pipx install ocrmypdf   # o bien:  yay -S ocrmypdf");
    console.error("   Debian: sudo apt install ocrmypdf tesseract-ocr-spa ghostscript unpaper");
    console.error("   Mac:    brew install ocrmypdf tesseract-lang");
    process.exit(1);
  }

  const targets = filterBook ? BOOKS.filter((b) => b.slug === filterBook) : BOOKS;
  if (targets.length === 0) {
    console.error(`No book matches "${filterBook}"`);
    process.exit(1);
  }

  for (const book of targets) {
    const inputPath = join(HOMEBREW_DIR, book.pdf);
    const outputPath = join(HOMEBREW_DIR, `${book.slug}-clean.pdf`);

    console.log(`\n📖 ${book.slug}`);

    if (!existsSync(inputPath)) {
      console.warn(`  skip: source not found: ${inputPath}`);
      continue;
    }

    if (existsSync(outputPath) && !force) {
      const inStat = statSync(inputPath);
      const outStat = statSync(outputPath);
      if (outStat.mtimeMs > inStat.mtimeMs) {
        console.log(`  ✓ up to date → ${outputPath}`);
        continue;
      }
    }

    try {
      console.log(`  re-OCR → ${outputPath}`);
      const t0 = Date.now();
      await runOcrmypdf(inputPath, outputPath);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ done in ${elapsed}s`);
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
