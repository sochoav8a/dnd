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

/**
 * Stricter normalisation that also collapses consecutive duplicate letters.
 * Catches OCR artifacts where tesseract adds a stray letter in title-case
 * drop-caps, e.g. "COoLEGIO" → "colegio", "MUuCHO" → "mucho".
 */
function normalizeKeyFuzzy(input) {
  return normalizeKey(input).replace(/(.)\1+/g, "$1");
}

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .replace(/\u000c/g, "")
    .replace(/�+/g, " ")
    .replace(/[ ]/g, " ")
    .replace(/\s+$/g, "");
}

function countLetters(line) {
  return [...String(line)].filter((char) => /\p{L}/u.test(char)).length;
}

function isMostlyUpper(line) {
  const letters = [...String(line)].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return false;
  const lower = letters.filter(
    (char) => char === char.toLowerCase() && char !== char.toUpperCase(),
  ).length;
  return lower / letters.length < 0.25;
}

function isNoiseLine(line) {
  const value = cleanLine(line).trim();
  if (!value) return true;

  const key = normalizeKey(value);
  if (!key) return true;
  if (key === "1" || key === "0" || key === "l") return true;
  if (key === "d4" || key === "d6" || key === "d8" || key === "d10") return true;
  if (key.startsWith("capitulo")) return true;
  if (key.includes("opcionesdelospersonajes")) return true;
  if (key.includes("clases")) return true;
  if (/^\d+$/.test(value)) return true;

  const letters = countLetters(value);
  const digits = [...value].filter((char) => /\d/.test(char)).length;
  const weird = [...value].filter((char) => /[\\/_{}[\]<>~`|]/.test(char)).length;
  if (letters === 0 && digits > 0) return true;
  if (letters > 0 && weird / letters > 0.2) return true;

  return false;
}

function reconstructColumns(layoutText, cut = 64) {
  return layoutText
    .split("\f")
    .map((page) => {
      const left = [];
      const right = [];

      for (const rawLine of page.split(/\r?\n/)) {
        const line = cleanLine(rawLine);
        const leftPart = line.slice(0, cut).trimEnd();
        const rightPart = line.slice(cut).trimEnd();

        if (leftPart.trim()) left.push(leftPart);
        if (rightPart.trim()) right.push(rightPart.trimStart());
      }

      return [...left, "", ...right].join("\n");
    })
    .join("\n\n");
}

function paragraphize(lines) {
  const paragraphs = [];
  let current = "";

  for (const rawLine of lines) {
    const line = cleanLine(rawLine).trim();

    if (!line) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      continue;
    }

    if (isNoiseLine(line)) {
      if (current) {
        paragraphs.push(current.trim());
        current = "";
      }
      continue;
    }

    if (current.endsWith("-") || current.endsWith("­")) {
      current = current.slice(0, -1) + line;
    } else if (current) {
      current += ` ${line}`;
    } else {
      current = line;
    }
  }

  if (current) paragraphs.push(current.trim());

  return paragraphs
    .map((paragraph) =>
      paragraph
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\s{2,}/g, " "),
    )
    .filter((paragraph) => countLetters(paragraph) >= 20)
    .join("\n\n")
    .trim();
}

function cleanupDescription(text, minLetters = 60) {
  const cleaned = text
    .replace(/\b[A-ZÁÉÍÓÚÜÑ](?:\s+[A-ZÁÉÍÓÚÜÑ]){2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return countLetters(cleaned) >= minLetters ? cleaned : null;
}

function titleCaseHeading(text) {
  const minorWords = new Set([
    "a",
    "al",
    "con",
    "de",
    "del",
    "el",
    "en",
    "la",
    "las",
    "los",
    "o",
    "para",
    "por",
    "y",
  ]);

  return String(text)
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("es");
      const [base, suffix = ""] = lower.split(/([:;,!.?])/, 2);
      if (minorWords.has(base) && index > 0) return `${base}${suffix}`;
      return `${base.charAt(0).toLocaleUpperCase("es")}${base.slice(1)}${suffix}`;
    })
    .join(" ")
    .replace(/\s+:/g, ":");
}

function lineMatchesAlias(line, aliases) {
  const lineKey = normalizeKey(line);
  if (!lineKey) return false;
  const lineKeyFuzzy = normalizeKeyFuzzy(line);

  return aliases.some((alias) => {
    const aliasKey = normalizeKey(alias);
    if (!aliasKey) return false;
    const aliasKeyFuzzy = normalizeKeyFuzzy(alias);

    // Exact or substring match on raw keys
    if (lineKey === aliasKey) return true;
    if (lineKey.startsWith(aliasKey) && lineKey.length - aliasKey.length <= 6) return true;
    if (
      lineKey.length >= 6
      && aliasKey.startsWith(lineKey)
      && aliasKey.length - lineKey.length <= 2
    ) {
      return true;
    }
    if (lineKey.includes(aliasKey) && lineKey.length - aliasKey.length <= 6) return true;
    if (
      lineKey.length >= 6
      && aliasKey.includes(lineKey)
      && aliasKey.length - lineKey.length <= 2
    ) {
      return true;
    }

    // Fuzzy key (collapsed duplicate letters): same tests, mostly catches
    // OCR drop-cap artifacts like "COoLEGIO DEL CONOCIMIENTO" → "colegiodelconocimiento".
    if (lineKeyFuzzy === aliasKeyFuzzy) return true;
    if (
      lineKeyFuzzy.startsWith(aliasKeyFuzzy)
      && lineKeyFuzzy.length - aliasKeyFuzzy.length <= 6
    ) {
      return true;
    }
    if (
      lineKeyFuzzy.includes(aliasKeyFuzzy)
      && lineKeyFuzzy.length - aliasKeyFuzzy.length <= 6
    ) {
      return true;
    }
    return false;
  });
}

function findTitleIndex(lines, aliases, startIndex, endIndex) {
  for (let index = startIndex; index < endIndex; index++) {
    const line = lines[index];
    const candidates = [
      cleanLine(line).trim(),
      ...cleanLine(line)
        .split(/\s{2,}/)
        .map((part) => part.trim()),
    ].filter(Boolean);

    if (candidates.some((candidate) => isMostlyUpper(candidate) && lineMatchesAlias(candidate, aliases))) {
      return index;
    }
  }

  return -1;
}

function parseFeatureLevel(body) {
  const preview = String(body ?? "")
    .replace(/n\s*i\s*v\s*e\s*[l1I\/]/gi, "nivel")
    .replace(/nive[\/1I]/gi, "nivel")
    .replace(/nive\b/gi, "nivel")
    .replace(/nivel\s+([12])\s+([0-9o])/gi, (_, tens, ones) => {
      const normalizedOnes = String(ones).replace(/[oO]/g, "0");
      return `nivel ${tens}${normalizedOnes}`;
    })
    .replace(/nivel\s+1([oO])/gi, "nivel 10")
    .replace(/\s+/g, " ")
    .slice(0, 420);
  const patterns = [
    /rasgo(?: del?| de la| de los| de las)? [^.]{0,120}? nivel\s+(\d+)/i,
    /a partir(?: del?| de)? nivel\s+(\d+)/i,
    /desde el nivel\s+(\d+)/i,
    /en el nivel\s+(\d+)/i,
    /a nivel\s+(\d+)/i,
    /nivel\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = preview.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

function readHeading(lines, startIndex, endIndex) {
  const parts = [cleanLine(lines[startIndex]).trim()];
  let nextIndex = startIndex + 1;

  while (nextIndex < endIndex) {
    const nextLine = cleanLine(lines[nextIndex]).trim();
    if (!nextLine || !isMostlyUpper(nextLine)) break;

    const current = parts[parts.length - 1] ?? "";
    const shouldJoin = current.endsWith(":")
      || /\b(?:de|del|la|las|el|los|y)$/i.test(current);

    if (!shouldJoin) break;

    parts.push(nextLine);
    nextIndex++;
  }

  return {
    endIndex: nextIndex,
    text: parts.join(" "),
  };
}

function isPotentialFeatureHeading(line, titleAliases) {
  const value = cleanLine(line).trim();
  if (!value) return false;
  if (!isMostlyUpper(value)) return false;
  if (countLetters(value) < 4) return false;
  if (lineMatchesAlias(value, titleAliases)) return false;

  const key = normalizeKey(value);
  if (key.startsWith("capitulo")) return false;
  if (key.includes("opcionesdelospersonajes")) return false;
  if (key.includes("clases")) return false;

  return true;
}

function findNextFeatureHeading(lines, titleAliases, startIndex, endIndex) {
  for (let index = startIndex; index < endIndex; index++) {
    if (isPotentialFeatureHeading(lines[index], titleAliases)) {
      return index;
    }
  }

  return -1;
}

function extractFeatures(lines, titleAliases, startIndex, endIndex) {
  const featuresByLevel = {};
  const extracted = [];
  let firstHeadingIndex = -1;

  for (let index = startIndex; index < endIndex; index++) {
    if (!isPotentialFeatureHeading(lines[index], titleAliases)) continue;

    if (firstHeadingIndex === -1) firstHeadingIndex = index;

    const heading = readHeading(lines, index, endIndex);
    const nextHeadingIndex = findNextFeatureHeading(lines, titleAliases, heading.endIndex, endIndex);
    const bodyEnd = nextHeadingIndex === -1 ? endIndex : nextHeadingIndex;
    const body = paragraphize(lines.slice(heading.endIndex, bodyEnd));
    const level = parseFeatureLevel(body);
    const bodyKey = normalizeKey(body.slice(0, 120));

    if (!body || level === null) continue;
    if (bodyKey.startsWith("requisitos")) continue;

    const feature = {
      level,
      name: titleCaseHeading(heading.text),
      description: body,
    };

    const levelKey = String(level);
    if (!featuresByLevel[levelKey]) featuresByLevel[levelKey] = [];
    featuresByLevel[levelKey].push({
      name: feature.name,
      description: feature.description,
    });
    extracted.push(feature);
    index = bodyEnd - 1;
  }

  return {
    extracted,
    featuresByLevel,
    firstHeadingIndex,
  };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", reject);
  });
}

function loadSrdSubclassMap(projectRoot) {
  const srdPath = path.join(projectRoot, "data", "srd", "subclasses.json");
  const entries = JSON.parse(readFileSync(srdPath, "utf8"));
  return new Map(entries.map((entry) => [entry.slug, entry]));
}

const EXPECTED_SUBCLASS_FEATURE_LEVELS = {
  artificer: [3, 5, 9, 15],
  barbarian: [3, 6, 10, 14],
  bard: [3, 6, 14],
  cleric: [1, 2, 6, 8, 17],
  druid: [2, 6, 10, 14],
  fighter: [3, 7, 10, 15, 18],
  monk: [3, 6, 11, 17],
  paladin: [3, 7, 15, 20],
  ranger: [3, 7, 11, 15],
  rogue: [3, 9, 13, 17],
  sorcerer: [1, 6, 14, 18],
  warlock: [1, 6, 10, 14],
  wizard: [2, 6, 10, 14],
};

function groupFeaturesByLevel(features) {
  const grouped = {};
  for (const feature of features) {
    const levelKey = String(feature.level);
    if (!grouped[levelKey]) grouped[levelKey] = [];
    grouped[levelKey].push({
      name: feature.name,
      description: feature.description,
    });
  }
  return grouped;
}

export async function buildSubclassBundle(config) {
  const {
    classHeaders = [],
    columnCut = 64,
    descriptionMinLetters = 60,
    extractor,
    inheritSrdFields = ["spell_casting", "extra_spells"],
    outputDir,
    outputFile = "subclasses.json",
    projectRoot,
    sourcePdf,
    subclasses,
  } = config;

  const input = await readStdin();
  if (!input.trim()) {
    throw new Error("No recibí texto por stdin.");
  }

  mkdirSync(outputDir, { recursive: true });

  const reconstructed = reconstructColumns(input, columnCut);
  const lines = reconstructed.split(/\r?\n/).map(cleanLine);
  const sections = subclasses.map((subclass) => {
    const aliases = subclass.aliases ?? [subclass.name];
    const titleIndex = findTitleIndex(lines, aliases, 0, lines.length);
    if (titleIndex === -1) {
      throw new Error(`No pude ubicar el título de "${subclass.name}"`);
    }

    return {
      ...subclass,
      aliases,
      titleIndex,
    };
  });

  sections.sort((a, b) => a.titleIndex - b.titleIndex);

  const headerIndexes = classHeaders
    .map((header) => ({
      classSlug: header.classSlug,
      headerIndex: findTitleIndex(lines, header.aliases, 0, lines.length),
    }))
    .filter((header) => header.headerIndex !== -1)
    .sort((a, b) => a.headerIndex - b.headerIndex);

  if (process.env["DEBUG_TITLES"] === "1") {
    console.error(
      JSON.stringify(
        sections.map((section) => ({
          index: section.titleIndex + 1,
          name: section.name,
        })),
        null,
        2,
      ),
    );
  }

  const srdBySlug = loadSrdSubclassMap(projectRoot);
  const entries = [];
  const report = [];
  const debugSubclass = process.env["DEBUG_SUBCLASS"] ?? "";

  for (let index = 0; index < sections.length; index++) {
    const subclass = sections[index];
    const titleIndex = subclass.titleIndex;
    const nextSubclassIndex = sections[index + 1]?.titleIndex ?? lines.length;
    const nextClassHeaderIndex = headerIndexes.find((header) => header.headerIndex > titleIndex)?.headerIndex
      ?? lines.length;
    const sectionEnd = Math.min(nextSubclassIndex, nextClassHeaderIndex);
    const titleAliases = subclass.aliases;
    const { extracted, firstHeadingIndex } = extractFeatures(
      lines,
      titleAliases,
      titleIndex + 1,
      sectionEnd,
    );
    const allowedLevels = EXPECTED_SUBCLASS_FEATURE_LEVELS[subclass.parentClass];
    const filteredExtracted = allowedLevels
      ? extracted.filter((feature) => allowedLevels.includes(feature.level))
      : extracted;
    const featuresByLevel = groupFeaturesByLevel(filteredExtracted);

    if (debugSubclass && subclass.name === debugSubclass) {
      console.error(
        JSON.stringify(
          {
            titleIndex: titleIndex + 1,
            sectionEnd: sectionEnd + 1,
            extracted: filteredExtracted.map((feature) => ({
              level: feature.level,
              name: feature.name,
            })),
          },
          null,
          2,
        ),
      );
    }

    if (filteredExtracted.length === 0) {
      if (process.env["STRICT"] === "1") {
        throw new Error(`No pude extraer rasgos para "${subclass.name}"`);
      }
      report.push(`  ⚠ ${subclass.slug}: no se extrajeron rasgos (se omite; usar override o reparar con LLM)`);
      continue;
    }

    // Sanity cap: a real subclass has 4-8 feature levels (up to ~12
    // features total). Anything over 15 means the section boundary was
    // mis-detected and we captured text from another subclass.
    if (filteredExtracted.length > 15) {
      if (process.env["STRICT"] === "1") {
        throw new Error(
          `"${subclass.name}" extrajo ${filteredExtracted.length} rasgos (probable sección mal delimitada)`,
        );
      }
      report.push(
        `  ⚠ ${subclass.slug}: ${filteredExtracted.length} rasgos (sección mal delimitada; se omite para reparar manualmente)`,
      );
      continue;
    }

    const description = cleanupDescription(
      paragraphize(
        lines.slice(
          titleIndex + 1,
          firstHeadingIndex === -1 ? sectionEnd : firstHeadingIndex,
        ),
      ),
      descriptionMinLetters,
    );

    const data = {
      parent_class: subclass.parentClass,
      flavor_name: subclass.name,
      features_by_level: featuresByLevel,
    };

    const srd = srdBySlug.get(subclass.slug);
    if (srd?.data) {
      for (const field of inheritSrdFields) {
        if (srd.data[field] && !data[field]) {
          data[field] = srd.data[field];
        }
      }
    }

    const override = subclass.override ?? {};
    const overrideData = override.data ?? {};
    const finalData = {
      ...data,
      ...overrideData,
      parent_class: overrideData.parent_class ?? data.parent_class,
      flavor_name: overrideData.flavor_name ?? data.flavor_name,
      features_by_level: overrideData.features_by_level ?? data.features_by_level,
    };
    const finalFeatureCount = Object.values(finalData.features_by_level).reduce(
      (total, features) => total + features.length,
      0,
    );

    entries.push({
      slug: override.slug ?? subclass.slug,
      name: override.name ?? subclass.name,
      description: override.description ?? description,
      data: finalData,
      metadata: {
        source_pdf: sourcePdf,
        extractor,
      },
    });

    report.push(`${subclass.slug}: ${finalFeatureCount} rasgos`);
  }

  const outputPath = path.join(outputDir, outputFile);
  // Run OCR cleanup on every string before writing so rebuilt bundles are
  // consistent with the one-shot `clean-book-ocr.mjs` script.
  const cleanedEntries = cleanOcrDeep(entries);
  writeFileSync(outputPath, JSON.stringify(cleanedEntries, null, 2) + "\n", "utf8");

  console.log(`Wrote ${entries.length} subclasses to ${outputPath}`);
  for (const line of report) console.log(`  - ${line}`);
}
