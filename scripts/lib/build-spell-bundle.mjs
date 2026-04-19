/**
 * Shared parser/bundle builder for SPELLS extracted from PDF text.
 *
 * Mirrors build-feat-bundle.mjs: per-book scripts declare the structured
 * spell metadata (level, school, classes, casting_time, range,
 * components, duration, concentration, ritual) and a list of UPPERCASE
 * heading aliases; this library finds each heading in the piped
 * pdftotext output, extracts the body, strips the metadata block, and
 * writes <bookSlug>/spells.json.
 *
 * Invocation pattern (from per-book script):
 *   pdftotext -raw homebrew/<book>-clean.pdf - | node scripts/build-<book>-spells.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
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
  if (/^\d+$/.test(value)) return true;
  return false;
}

function paragraphize(lines) {
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

// Spell headings in the PDF are ALL CAPS ("ABSORBER ELEMENTOS"), while
// the class-by-class spell tables at the start of the chapter use Title
// Case ("Absorber los elementos (abjuración)"). Require the matched
// region to be predominantly uppercase so we skip the TOC and land on
// the real description heading.
function isMostlyUppercase(s) {
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (letters.length === 0) return false;
  const upper = letters.replace(/[a-záéíóúüñ]/g, "");
  return upper.length / letters.length >= 0.85;
}

function lineMatchesAlias(line, aliases) {
  const key = normalizeKey(line);
  const columns = String(line ?? "")
    .split(/[ ]{3,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  const columnKeys = columns.map(normalizeKey);
  const lineIsUpper = isMostlyUppercase(line);
  const lineRaw = String(line ?? "");
  for (const alias of aliases) {
    const ak = normalizeKey(alias);
    if (ak.length < 3) continue;
    if (lineIsUpper) {
      if (key === ak) return true;
      if (key.startsWith(ak)) return true;
      if (ak.length >= 12 && key.includes(ak)) return true;
    }
    // OCR garbage sometimes prepends gibberish (lowercase prose) before
    // a heading on the same physical line, e.g.
    //   "alma enjaulaste. — _ 1ESCRIBIR EN LAS NUBES"
    // We accept the match only if the prefix before the alias contains
    // lowercase letters (indicating OCR junk) — not if the prefix is a
    // longer uppercase heading like "VARITA DE PIROTECNIA".
    if (ak.length >= 10 && !lineIsUpper) {
      const up = alias.toUpperCase();
      const idx = lineRaw.indexOf(up);
      if (idx > 0) {
        const prefix = lineRaw.slice(0, idx);
        if (/[a-záéíóúüñ]/.test(prefix)) return true;
      }
    }
    for (let i = 0; i < columnKeys.length; i++) {
      const ck = columnKeys[i];
      if (!isMostlyUppercase(columns[i])) continue;
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

const MAX_SPELL_CHARS = 2400;

// Advance past the statblock at the top of each spell entry. The body
// always starts with a 5-line metadata block: "<School> nivel N" /
// "Tiempo de lanzamiento: …" / "Alcance: …" / "Componentes: …" /
// "Duración: …". Skip until we find "Duración" (or "Duracion") and
// start the real prose on the line after its value — metadata lines
// may wrap, so we consume continuations that start with lowercase.
function sliceAfterMetadata(rawLines) {
  let durationLine = -1;
  for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
    const l = rawLines[i].trim();
    if (/^\s*Duraci[oó]n\s*:/i.test(l)) {
      durationLine = i;
      break;
    }
  }
  if (durationLine < 0) return rawLines; // not a spell block — keep as-is
  // Skip the Duration line and any wrapped continuation lines
  // (starting lowercase or blank) that belong to its value.
  let j = durationLine + 1;
  while (j < rawLines.length) {
    const l = rawLines[j].trim();
    if (!l) { j++; break; }
    if (/^[a-záéíóúüñ(]/.test(l)) { j++; continue; }
    break;
  }
  return rawLines.slice(j);
}

function extractBody(lines, startIndex, endIndex) {
  const rawSlice = lines.slice(startIndex + 1, endIndex);
  const afterMetadata = sliceAfterMetadata(rawSlice);
  const paragraphs = paragraphize(afterMetadata);
  const joined = paragraphs.filter((p) => p.length > 0).join("\n\n");
  if (joined.length <= MAX_SPELL_CHARS) return joined;
  let out = joined.slice(0, MAX_SPELL_CHARS);
  const lastBreak = out.lastIndexOf("\n\n");
  if (lastBreak > MAX_SPELL_CHARS * 0.5) out = out.slice(0, lastBreak);
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

export async function buildSpellBundle(config) {
  const {
    sourceName,
    bookSlug,
    outputDir,
    outputFile = "spells.json",
    sourcePdf,
    extractor = "pdftotext -raw",
    spells,
    inputText: providedText,
  } = config;

  const rawText = providedText ?? (await readStdin());
  const lines = rawText.split(/\n/).map((l) => l.replace(/\r$/, ""));

  const positions = spells
    .map((spell) => ({ spell, index: findSection(lines, spell.aliases) }))
    .sort((a, b) => a.index - b.index);

  for (let i = 0; i < positions.length; i++) {
    const next = positions[i + 1];
    positions[i].endIndex = next ? next.index : lines.length;
  }

  const entries = [];
  const report = [];
  for (const { spell, index, endIndex } of positions) {
    if (index < 0) {
      report.push(`${spell.slug}: NOT FOUND`);
      continue;
    }
    const bodyText = extractBody(lines, index, endIndex);

    const entry = {
      slug: spell.slug,
      name: spell.name,
      description: spell.description ?? bodyText.slice(0, MAX_SPELL_CHARS),
      data: {
        ...spell.data,
        description: spell.description ?? bodyText.slice(0, MAX_SPELL_CHARS),
      },
      metadata: {
        source_pdf: sourcePdf,
        extractor,
      },
    };

    entries.push(entry);
    report.push(`${spell.slug}: ${bodyText.length} chars`);
  }

  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFile);
  const cleaned = cleanOcrDeep(entries);
  writeFileSync(outputPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");

  console.log(`Wrote ${entries.length} spells for "${sourceName}" → ${outputPath}`);
  for (const line of report) console.log(`  - ${line}`);
}
