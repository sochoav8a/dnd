/**
 * Shared parser/bundle builder for FEATS from PDF-extracted text.
 *
 * Mirrors the structure of build-subclass-bundle.mjs:
 * - Expects raw text piped in on stdin (or read from a file arg).
 * - Uses a config object per book with sections (title aliases + optional
 *   `override` for corrections).
 * - Runs OCR cleanup on all strings before writing.
 *
 * Invocation pattern (from per-book scripts):
 *   pdftotext -layout manual.pdf - | node scripts/build-feat-bundle.mjs
 *
 * The per-book script populates `config.feats[]` with:
 *   { slug, name, aliases: [...], override?: { description, data: {...} } }
 *
 * Output: data/books/<bookSlug>/feats.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cleanOcrDeep } from "./clean-ocr-text.mjs";

function normalizeKey(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .replace(/\u000c/g, "")
    .replace(/�+/g, " ")
    .replace(/[ ]/g, " ")
    .replace(/\s+$/g, "");
}

function isNoiseLine(line) {
  const value = cleanLine(line).trim();
  if (!value) return true;
  const key = normalizeKey(value);
  if (!key) return true;
  if (key === "1" || key === "0" || key === "l") return true;
  if (/^\d+$/.test(value)) return true;
  return false;
}

function paragraphize(lines) {
  // Join wrapped lines into paragraphs; paragraphs are separated by blank line.
  const paragraphs = [];
  let current = [];
  for (const raw of lines) {
    if (isNoiseLine(raw)) {
      if (current.length > 0) {
        paragraphs.push(current.join(" ").replace(/\s+/g, " ").trim());
        current = [];
      }
      continue;
    }
    current.push(cleanLine(raw).trim());
  }
  if (current.length > 0) {
    paragraphs.push(current.join(" ").replace(/\s+/g, " ").trim());
  }
  return paragraphs;
}

function lineMatchesAlias(line, aliases) {
  const key = normalizeKey(line);
  // Two-column PDF: split by 3+ spaces so a right-column heading that
  // shares its physical line with unrelated left-column paragraph text
  // can still be detected.
  const columns = String(line ?? "")
    .split(/[ ]{3,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  const columnKeys = columns.map(normalizeKey);
  for (const alias of aliases) {
    const ak = normalizeKey(alias);
    if (ak.length < 3) continue;
    if (key === ak) return true;
    if (key.startsWith(ak)) return true;
    // Substring match — only for long, distinctive aliases so we don't
    // misfire on prose that happens to contain a short word like "alerta".
    if (ak.length >= 12 && key.includes(ak)) return true;
    for (const ck of columnKeys) {
      if (ck === ak) return true;
      if (ck.startsWith(ak) && ak.length >= 6) return true;
    }
  }
  return false;
}

function findSection(lines, aliases, startIndex = 0, endIndex = lines.length) {
  for (let i = startIndex; i < endIndex; i++) {
    if (lineMatchesAlias(lines[i], aliases)) return i;
  }
  return -1;
}

/**
 * Extract the body of a feat section: everything between the heading and the
 * next known heading (or end of document).
 *
 * Hard-caps output at MAX_FEAT_CHARS to protect against mis-detected
 * boundaries (common in 2-column PDFs). If the cap triggers we trim back
 * to the last full paragraph.
 */
const MAX_FEAT_CHARS = 1800;

function extractBody(lines, startIndex, endIndex) {
  const slice = lines.slice(startIndex + 1, endIndex);
  const paragraphs = paragraphize(slice);
  const joined = paragraphs.filter((p) => p.length > 0).join("\n\n");
  if (joined.length <= MAX_FEAT_CHARS) return joined;
  // Trim to last paragraph boundary below the cap.
  let out = joined.slice(0, MAX_FEAT_CHARS);
  const lastBreak = out.lastIndexOf("\n\n");
  if (lastBreak > MAX_FEAT_CHARS * 0.5) out = out.slice(0, lastBreak);
  return out;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export async function buildFeatBundle(config) {
  const {
    sourceName,
    bookSlug,
    outputDir,
    outputFile = "feats.json",
    sourcePdf,
    extractor = "pdftotext -layout",
    feats,
    inputText: providedText,
  } = config;

  const rawText = providedText ?? (await readStdin());
  const lines = rawText.split(/\n/).map((l) => l.replace(/\r$/, ""));

  // Find all feat heading positions
  const positions = feats
    .map((feat) => ({
      feat,
      index: findSection(lines, feat.aliases),
    }))
    .sort((a, b) => a.index - b.index);

  // Compute end index = next feat's start (or end of doc)
  for (let i = 0; i < positions.length; i++) {
    const next = positions[i + 1];
    positions[i].endIndex = next ? next.index : lines.length;
  }

  const entries = [];
  const report = [];
  for (const { feat, index, endIndex } of positions) {
    if (index < 0) {
      report.push(`${feat.slug}: NOT FOUND`);
      continue;
    }
    const bodyText = extractBody(lines, index, endIndex);
    const override = feat.override ?? {};
    const overrideData = override.data ?? {};

    const data = {
      modifiers: [],
      ...overrideData,
    };

    const entry = {
      slug: feat.slug,
      name: override.name ?? feat.name,
      description: override.description ?? bodyText.slice(0, 800),
      data,
      metadata: {
        source_pdf: sourcePdf,
        extractor,
      },
    };

    entries.push(entry);
    report.push(`${feat.slug}: ${bodyText.length} chars`);
  }

  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFile);
  const cleaned = cleanOcrDeep(entries);
  writeFileSync(outputPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");

  console.log(
    `Wrote ${entries.length} feats for "${sourceName}" → ${outputPath}`,
  );
  for (const line of report) console.log(`  - ${line}`);
}
