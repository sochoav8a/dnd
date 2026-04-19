#!/usr/bin/env node
/**
 * Uses a local LLM (Ollama) to repair OCR-corrupted feature descriptions
 * in already-built book JSONs. Only calls the model for entries that look
 * damaged — clean entries are left alone.
 *
 * The model acts as a "smart spell-checker": it restores broken Spanish
 * words, removes artifacts like `\` `<` and glyph corruption, but MUST NOT
 * invent new content. If a fragment is irrecoverable, it returns the text
 * as-is with a [TRUNCATED] marker.
 *
 * Usage:
 *   node scripts/llm-repair-book.mjs --book phb --kind subclasses
 *   node scripts/llm-repair-book.mjs --book tasha            # all kinds
 *   node scripts/llm-repair-book.mjs --dry-run               # preview only
 *   node scripts/llm-repair-book.mjs --model qwen2.5:14b-instruct
 *   node scripts/llm-repair-book.mjs --threshold 0.15        # brokenness trigger
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chat, healthCheck, DEFAULTS } from "./lib/ollama-client.mjs";
import { cleanOcrText } from "./lib/clean-ocr-text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const BOOKS_DIR = join(REPO_ROOT, "data/books");

const args = process.argv.slice(2);
function argVal(flag, def = null) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
}
function argBool(flag) {
  return args.includes(flag);
}

const filterBook = argVal("--book");
const filterKind = argVal("--kind"); // "subclasses" | "feats"
const dryRun = argBool("--dry-run");
const threshold = Number(argVal("--threshold", "0.12"));
const model = argVal("--model", DEFAULTS.MODEL);
const force = argBool("--force"); // repair every entry, even clean ones

// ── Brokenness scorer ──────────────────────────────────────────────────────

const STOP = new Set([
  "a", "e", "o", "y", "u", "al", "el", "la", "lo", "le", "un", "de", "en",
  "es", "se", "me", "te", "su", "tu", "no", "ni", "ya", "si", "os", "mi",
  "ti", "yo", "va", "ve", "da", "di", "he", "ha", "ir",
  "las", "los", "les", "sus", "tus", "por", "con", "sin", "del", "más",
  "muy", "que", "son", "era", "ser", "qué", "dos", "fue", "ver", "día",
  "hoy", "así", "aún", "aun", "tan", "mas", "nos", "han", "hay", "sea",
  "una", "uno", "vez", "tal", "par", "eso", "ese", "esa", "est", "todo",
  "toda", "otro", "otra", "dm", "pj", "pc",
]);

/** Counts short-fragment adjacencies and corruption markers per char. */
function brokennessScore(text) {
  if (!text || text.length < 20) return 0;
  let broken = 0;
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i].replace(/[.,;:!?()]/g, "").toLowerCase();
    if (!/^[a-záéíóúñü]+$/.test(a)) continue;
    if (a.length > 3) continue;
    if (STOP.has(a)) continue;
    broken++;
  }
  // Corruption glyphs add weight
  const corruption = (text.match(/[<\\|]/g) ?? []).length;
  return (broken + corruption * 3) / text.length;
}

// ── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un corrector de texto que repara fragmentos de OCR en español procedentes de manuales de rol Dungeons & Dragons.

Reglas estrictas:
1. Devuelve ÚNICAMENTE un objeto JSON con la forma { "text": "…" }.
2. Tu tarea es reparar, no generar. Une palabras rotas ("pa rtir" → "partir"), quita glifos corruptos (< \\ |), restaura acentos obvios.
3. NO añadas información, detalles, ejemplos, explicaciones o flavor que no esté en el original.
4. Si una frase es irrecuperable por datos faltantes (letras comidas, frases truncadas), déjala lo más limpia posible y añade " [TRUNCADO]" al final de la oración afectada.
5. Mantén el registro de reglas de D&D en español (uso de "tú", "nivel", "tirada de salvación", "CA", etc.).
6. Respeta la longitud original ±10%. No resumas ni expandas.
7. Devuelve ÚNICAMENTE el JSON. Sin markdown, sin texto extra.`;

function buildPrompt(context) {
  const {
    bookSlug,
    kind,
    entrySlug,
    entryName,
    parentClass,
    level,
    featureName,
    rawText,
  } = context;
  const header = [
    `Libro: ${bookSlug}`,
    `Tipo: ${kind}`,
    `Entrada: ${entrySlug} (${entryName})`,
    parentClass ? `Clase: ${parentClass}` : null,
    level ? `Nivel: ${level}` : null,
    featureName ? `Rasgo: ${featureName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}

Texto a reparar (del PDF con OCR imperfecto):
"""
${rawText}
"""

Devuelve: {"text": "<texto reparado>"}`;
}

// ── Repair per string ──────────────────────────────────────────────────────

async function repairString(rawText, context) {
  if (!rawText || typeof rawText !== "string") return rawText;

  const prompt = buildPrompt({ ...context, rawText });
  let content;
  try {
    content = await chat({ system: SYSTEM_PROMPT, prompt, json: true, model });
  } catch (err) {
    console.error(`    ✗ LLM error on ${context.entrySlug}/${context.featureName}: ${err.message}`);
    return rawText;
  }

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(
      content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim(),
    );
  } catch (err) {
    console.error(`    ✗ parse error on ${context.entrySlug}: ${err.message}`);
    return rawText;
  }
  const repaired = parsed?.text;
  if (typeof repaired !== "string" || repaired.length < 5) {
    console.warn(`    ⚠ empty repair for ${context.entrySlug}, keeping original`);
    return rawText;
  }

  // Quick sanity: repair shouldn't be >30% shorter or >30% longer than input
  const ratio = repaired.length / rawText.length;
  if (ratio < 0.7 || ratio > 1.4) {
    console.warn(
      `    ⚠ length drift ${(ratio * 100).toFixed(0)}% on ${context.entrySlug}/${context.featureName}; keeping original`,
    );
    return rawText;
  }

  // Also run our deterministic cleaner as a final pass.
  return cleanOcrText(repaired);
}

// ── Repair per book ────────────────────────────────────────────────────────

async function repairSubclassesFile(bookSlug, filePath) {
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  let scanned = 0;
  let repaired = 0;

  for (const entry of data) {
    const features = entry.data?.features_by_level ?? {};
    for (const level of Object.keys(features)) {
      const feats = features[level];
      for (const feature of feats) {
        scanned++;
        const score = brokennessScore(feature.description ?? "");
        if (!force && score < threshold) continue;

        console.log(
          `  ${entry.slug}/L${level}/${(feature.name || "").slice(0, 40)} — score ${score.toFixed(3)}`,
        );
        if (dryRun) {
          repaired++;
          continue;
        }

        const newDesc = await repairString(feature.description, {
          bookSlug,
          kind: "subclass",
          entrySlug: entry.slug,
          entryName: entry.name,
          parentClass: entry.data.parent_class,
          level,
          featureName: feature.name,
        });
        if (newDesc !== feature.description) {
          feature.description = newDesc;
          repaired++;
        }

        // Also repair feature name if it contains weird glyphs
        if (/[<\\|]/.test(feature.name ?? "") || /[A-Z] [a-z]/.test(feature.name ?? "")) {
          const newName = await repairString(feature.name, {
            bookSlug,
            kind: "subclass-name",
            entrySlug: entry.slug,
            entryName: entry.name,
            parentClass: entry.data.parent_class,
            level,
            featureName: feature.name,
          });
          if (newName !== feature.name) {
            feature.name = newName;
          }
        }
      }
    }
  }

  if (!dryRun && repaired > 0) {
    const backup = filePath.replace(/\.json$/, `.pre-llm.json`);
    if (!existsSync(backup)) {
      writeFileSync(backup, readFileSync(filePath, "utf-8"));
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  return { scanned, repaired };
}

async function repairFeatsFile(bookSlug, filePath) {
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  let scanned = 0;
  let repaired = 0;

  for (const entry of data) {
    scanned++;
    const score = brokennessScore(entry.description ?? "");
    if (!force && score < threshold) continue;

    console.log(`  ${entry.slug} — score ${score.toFixed(3)}`);
    if (dryRun) {
      repaired++;
      continue;
    }

    const newDesc = await repairString(entry.description, {
      bookSlug,
      kind: "feat",
      entrySlug: entry.slug,
      entryName: entry.name,
    });
    if (newDesc !== entry.description) {
      entry.description = newDesc;
      repaired++;
    }
  }

  if (!dryRun && repaired > 0) {
    const backup = filePath.replace(/\.json$/, `.pre-llm.json`);
    if (!existsSync(backup)) {
      writeFileSync(backup, readFileSync(filePath, "utf-8"));
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  return { scanned, repaired };
}

async function main() {
  if (!dryRun) {
    const health = await healthCheck({ model });
    if (!health.ok) {
      console.error(`❌ Ollama not ready: ${health.detail}`);
      if (health.available)
        console.error(`   Available models: ${health.available.join(", ")}`);
      console.error("\nInstall + pull a Spanish-capable model (your 4060 can run these):");
      console.error("  curl -fsSL https://ollama.com/install.sh | sh");
      console.error("  ollama pull qwen2.5:14b-instruct   # ~9 GB, best quality/speed on 4060");
      console.error("  ollama pull llama3.1:8b            # ~4 GB, faster, slightly weaker");
      process.exit(1);
    }
    console.log(`✓ Ollama ready · model: ${model}`);
  }

  const books = filterBook
    ? [{ slug: filterBook }]
    : ["phb", "tasha", "xanathar"].map((s) => ({ slug: s }));

  for (const book of books) {
    const bookDir = join(BOOKS_DIR, book.slug);
    if (!existsSync(bookDir)) {
      console.warn(`skip ${book.slug}: no bundle`);
      continue;
    }
    console.log(`\n📖 ${book.slug}`);

    const kinds = filterKind ? [filterKind] : ["subclasses", "feats"];
    for (const kind of kinds) {
      const filePath = join(bookDir, `${kind}.json`);
      if (!existsSync(filePath)) {
        console.log(`  (no ${kind}.json)`);
        continue;
      }
      console.log(`  ${kind}:`);
      const fn =
        kind === "subclasses" ? repairSubclassesFile : repairFeatsFile;
      const result = await fn(book.slug, filePath);
      console.log(
        `  ↳ ${result.repaired}/${result.scanned} entries repaired${dryRun ? " (dry-run)" : ""}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
