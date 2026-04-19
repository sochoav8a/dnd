#!/usr/bin/env node
/**
 * Adds mechanical `modifiers` arrays to the most common PHB subclass features
 * so the rules engine (and the character sheet) reflect proficiencies,
 * skill/tool bonuses and small numeric effects. Descriptions are untouched;
 * this only augments the existing JSON with structured data.
 *
 * Run multiple times safely — each patch is keyed by source tag and replaced
 * on re-run.
 *
 * Scope: stats that unambiguously apply when the subclass is chosen
 * (no "choose one of X" branches yet — those need UI picker support).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Each patch is keyed by [bookSlug, subclassSlug, level, featureNamePrefix]
// and injects modifiers into that feature's `modifiers` array.
const PATCHES = [
  // ── Cleric domains: heavy armor + martial weapons at level 1 ────────
  {
    book: "phb",
    slug: "war-domain",
    level: "1",
    source: "subclass:war-domain:1",
    modifiers: [
      prof("armor.heavy", "heavy", "war-domain"),
      prof("weapon.martial", "martial", "war-domain"),
    ],
  },
  {
    book: "phb",
    slug: "tempest-domain",
    level: "1",
    source: "subclass:tempest-domain:1",
    modifiers: [
      prof("armor.heavy", "heavy", "tempest-domain"),
      prof("weapon.martial", "martial", "tempest-domain"),
    ],
  },
  {
    book: "phb",
    slug: "nature-domain",
    level: "1",
    source: "subclass:nature-domain:1",
    modifiers: [prof("armor.heavy", "heavy", "nature-domain")],
  },
  // ── Forge Domain (Xanathar) — heavy armor + smith's tools ───────────
  {
    book: "xanathar",
    slug: "forge-domain",
    level: "1",
    source: "subclass:forge-domain:1",
    modifiers: [
      prof("armor.heavy", "heavy", "forge-domain"),
      prof("tool.smiths-tools", "smiths-tools", "forge-domain"),
    ],
  },
  // ── Twilight Domain (Tasha) — heavy armor + martial weapons ─────────
  {
    book: "tasha",
    slug: "twilight-domain",
    level: "1",
    source: "subclass:twilight-domain:1",
    modifiers: [
      prof("armor.heavy", "heavy", "twilight-domain"),
      prof("weapon.martial", "martial", "twilight-domain"),
    ],
  },
  // ── Order Domain (Tasha) — heavy armor + Intimidation/Persuasion ────
  // Skill choice is optional, skip for now.
  {
    book: "tasha",
    slug: "order-domain",
    level: "1",
    source: "subclass:order-domain:1",
    modifiers: [prof("armor.heavy", "heavy", "order-domain")],
  },

  // ── Rogue Assassin: kits at level 3 ─────────────────────────────────
  {
    book: "phb",
    slug: "assassin",
    level: "3",
    source: "subclass:assassin:3",
    modifiers: [
      prof("tool.disguise-kit", "disguise-kit", "assassin"),
      prof("tool.poisoner-kit", "poisoner-kit", "assassin"),
    ],
  },

  // ── Paladin Oath of Devotion (SRD) / Oath of the Ancients: nothing
  //    flat mechanically on top of Aura of Protection (class-level).

  // ── Warlock Archfey: Fey Presence - extra charm DC is class DC. No flat.
  // ── Warlock Great Old One: no flat stat.

  // ── Barbarian Path of the Berserker/Totem: totem choice, no flat yet.

  // ── Fighter Battle Master: tool prof from a guild (one of artisan's
  //    tools — choice needed). Leave alone.

  // ── Wizard Schools: no flat stat.

  // ── Monk Way of Shadow: proficiency with Stealth if not already ──────
  //    (PHB says "you learn" which effectively grants proficiency)
  // Leave alone for now to avoid overruling existing rogue/ranger profs.

  // ── Druid Circle of the Land: bonus cantrip from druid list.
  //    (We don't materialise cantrip grants as modifiers yet.)

  // ── Oath of the Ancients (paladin) — L7 Aura of Warding is resistance
  //    to spell damage within 10 ft. Complex aura, skip for now.

  // ── Cleric Life Domain (SRD) already has heavy armor via other means? ─
  //    Re-apply for safety on non-SRD books only (above only patches non-SRD).

  // ── Paladin Oath of Vengeance — no flat; smite bonus is class-level.

  // ── Knowledge Domain: 2 extra languages + 2 skill profs (choice). Skip
  //    choice-based ones (need UI picker).

  // ── Ranger Hunter: at L3 pick one of three defensive/offensive features
  //    (Hunter's Prey, etc.) — choice-based.
];

function prof(target, value, sourceSuffix) {
  return {
    target,
    type: "proficiency",
    value,
    source: `subclass:${sourceSuffix}`,
    priority: 10,
  };
}

function patchBook(bookSlug) {
  const filePath = resolve(
    __dirname,
    `../data/books/${bookSlug}/subclasses.json`,
  );
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  let touched = 0;

  for (const patch of PATCHES) {
    if (patch.book !== bookSlug) continue;
    const sc = data.find((x) => x.slug === patch.slug);
    if (!sc) {
      console.warn(`  skip ${patch.slug}: not found in ${bookSlug}`);
      continue;
    }
    const levelFeatures = sc.data.features_by_level?.[patch.level];
    if (!levelFeatures || levelFeatures.length === 0) {
      console.warn(`  skip ${patch.slug}: no features at level ${patch.level}`);
      continue;
    }

    // Inject into the first feature of that level (usually the introductory
    // "proficiencies / bonus" feature for cleric domains, the "Assassin"
    // opener for rogues, etc.).
    const target = levelFeatures[0];
    const existing = target.modifiers ?? [];
    // Drop any prior entries sharing this source to make the patch idempotent.
    const keep = existing.filter(
      (m) =>
        !patch.modifiers.some(
          (n) => n.source === m.source && n.target === m.target,
        ),
    );
    target.modifiers = [...keep, ...patch.modifiers];
    touched++;
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  return touched;
}

const books = ["phb", "tasha", "xanathar"];
for (const b of books) {
  const n = patchBook(b);
  console.log(`${b}: patched ${n} subclass(es)`);
}
