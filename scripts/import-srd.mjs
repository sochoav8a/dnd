#!/usr/bin/env node
/**
 * import-srd.mjs
 *
 * Idempotent importer for SRD 5.1 data from the public 5e-bits/5e-database
 * repository (https://github.com/5e-bits/5e-database), transformed into the
 * local content format expected by packages/content/src/schemas.
 *
 * Produces in /home/santiago/dnd/data/srd/:
 *   - subclasses.json     (12 subclasses, features_by_level, casters with slots)
 *   - spells.json         (~319 SRD spells, overwrites existing)
 *   - monsters.json       (~334 SRD monsters, new schema defined in spec)
 *   - conditions.json     (15 SRD conditions)
 *   - magic-items.json    (all SRD magic items)
 *   - items.json          (existing mundane gear + SRD equipment, merged by slug)
 *
 * Dependencies: only Node built-ins (node:fs, node:path, node:child_process, fetch).
 *
 * Usage:
 *   node /home/santiago/dnd/scripts/import-srd.mjs
 *
 * The script prefers cloning the source repo via `git clone --depth 1` into
 * /tmp/5e-db for speed; if git is unavailable or the clone fails, it falls back
 * to HTTPS fetching individual files via the global fetch() in Node >= 18.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

const PROJECT_ROOT = "/home/santiago/dnd";
const DATA_DIR = path.join(PROJECT_ROOT, "data", "srd");
const CLONE_DIR = "/tmp/5e-db";
const REPO_URL = "https://github.com/5e-bits/5e-database.git";
const RAW_BASE =
  "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014";

const SOURCE_FILES = {
  classes: "5e-SRD-Classes.json",
  subclasses: "5e-SRD-Subclasses.json",
  features: "5e-SRD-Features.json",
  levels: "5e-SRD-Levels.json",
  spells: "5e-SRD-Spells.json",
  monsters: "5e-SRD-Monsters.json",
  conditions: "5e-SRD-Conditions.json",
  magicItems: "5e-SRD-Magic-Items.json",
  equipment: "5e-SRD-Equipment.json",
};

// Only these classes exist in the local classes.json. We filter spells so that
// `classes` only contains these slugs.
const KNOWN_CLASS_SLUGS = new Set([
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
]);

// Map subclass slug → canonical parent-class slug.
// (We only keep one SRD subclass per class, matching the project's scope.)
const SUBCLASS_WHITELIST = {
  berserker: "barbarian",
  "lore": "bard",
  "life": "cleric",
  "land": "druid",
  "champion": "fighter",
  "open-hand": "monk",
  "devotion": "paladin",
  "hunter": "ranger",
  "thief": "rogue",
  "draconic": "sorcerer",
  "fiend": "warlock",
  "evocation": "wizard",
};

// Slug remaps: 5e-bits index → our preferred slug in output
const SUBCLASS_SLUG_REMAP = {
  life: "life-domain",
};

// Map parent-class slug → subclass-level (when the subclass features start).
const SUBCLASS_LEVEL = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

const warnings = [];
const errors = [];

function warn(msg) {
  warnings.push(msg);
  console.warn(`[WARN] ${msg}`);
}

function fail(msg) {
  errors.push(msg);
  console.error(`[ERROR] ${msg}`);
}

function kebab(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMd(s) {
  if (!s) return "";
  return String(s)
    .replace(/\*\*/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function joinDesc(arr) {
  if (!arr) return "";
  if (Array.isArray(arr)) return stripMd(arr.join("\n"));
  return stripMd(arr);
}

function truncate(s, n = 280) {
  s = stripMd(s);
  if (s.length <= n) return s;
  const slice = s.slice(0, n - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return slice.slice(0, lastSpace > 80 ? lastSpace : n - 1).trimEnd() + "…";
}

function crToNumber(cr) {
  if (cr === null || cr === undefined) return 0;
  if (typeof cr === "number") return cr;
  const s = String(cr).trim();
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
    return a / b;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function proficiencyBonusForCR(cr) {
  if (cr < 5) return 2;
  if (cr < 9) return 3;
  if (cr < 13) return 4;
  if (cr < 17) return 5;
  if (cr < 21) return 6;
  if (cr < 25) return 7;
  if (cr < 29) return 8;
  return 9;
}

function xpForCR(cr) {
  const table = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
  };
  return table[cr] ?? 0;
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ----------------------------------------------------------------------------
// Source loading: clone → local fs; otherwise fall back to fetch()
// ----------------------------------------------------------------------------

async function loadSource() {
  let usingClone = false;
  try {
    if (existsSync(path.join(CLONE_DIR, "src", "2014"))) {
      console.log(`Reusing existing clone at ${CLONE_DIR}`);
      usingClone = true;
    } else {
      console.log(`Cloning ${REPO_URL} → ${CLONE_DIR} ...`);
      execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, {
        stdio: "inherit",
      });
      usingClone = true;
    }
  } catch (err) {
    warn(`git clone failed (${err.message}); will fall back to HTTPS fetch`);
  }

  const source = {};
  for (const [key, filename] of Object.entries(SOURCE_FILES)) {
    try {
      if (usingClone) {
        const p = path.join(CLONE_DIR, "src", "2014", filename);
        source[key] = JSON.parse(readFileSync(p, "utf8"));
      } else {
        const url = `${RAW_BASE}/${filename}`;
        console.log(`fetching ${url}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        source[key] = await res.json();
      }
      console.log(`  loaded ${key}: ${source[key].length} entries`);
    } catch (err) {
      fail(`Failed to load ${filename}: ${err.message}`);
      source[key] = [];
    }
  }
  return source;
}

// ----------------------------------------------------------------------------
// Transform: Spells
// ----------------------------------------------------------------------------

function transformSpells(spells) {
  const out = [];
  for (const s of spells) {
    try {
      const slug = kebab(s.index || s.name);
      if (!slug) {
        warn(`spell missing slug: ${JSON.stringify(s).slice(0, 80)}`);
        continue;
      }
      const school = String(s.school?.index || s.school?.name || "")
        .toLowerCase();
      const level = Number(s.level ?? 0);
      const components = {
        V: Array.isArray(s.components) && s.components.includes("V"),
        S: Array.isArray(s.components) && s.components.includes("S"),
      };
      if (s.material) components.M = stripMd(s.material);

      const classes = (s.classes || [])
        .map((c) => kebab(c.index || c.name))
        .filter((slug) => KNOWN_CLASS_SLUGS.has(slug));
      if (classes.length === 0) {
        // Spell has no SRD class exposure we track; skip it.
        warn(`spell ${slug} has no known class; skipping`);
        continue;
      }

      const fullDesc = joinDesc(s.desc);
      const higherDesc = joinDesc(s.higher_level);

      const data = {
        level,
        school,
        casting_time: s.casting_time || "1 action",
        range: s.range || "Self",
        components,
        duration: s.duration || "Instantaneous",
        concentration: Boolean(s.concentration),
        classes,
        description: higherDesc
          ? `${fullDesc}\n\nAt Higher Levels. ${higherDesc}`
          : fullDesc,
      };
      if (s.ritual) data.ritual = true;

      // Damage
      if (s.damage?.damage_type) {
        const base =
          s.damage?.damage_at_slot_level?.[String(level)] ||
          s.damage?.damage_at_character_level?.["1"] ||
          s.damage?.damage_at_character_level?.[Object.keys(s.damage?.damage_at_character_level || {})[0]] ||
          "";
        const dtype = kebab(s.damage.damage_type.index || s.damage.damage_type.name);
        const dmg = { base, type: dtype };
        if (higherDesc) dmg.higher_levels = higherDesc;
        if (base) data.damage = dmg;
      }

      // Healing
      if (s.heal_at_slot_level || /regains.*hit points/i.test(fullDesc)) {
        const base = s.heal_at_slot_level?.[String(level)] || "1d8+MOD";
        const healing = { base };
        if (higherDesc) healing.higher_levels = higherDesc;
        data.healing = healing;
      }

      out.push({
        slug,
        name: s.name,
        description: truncate(fullDesc),
        data,
      });
    } catch (err) {
      warn(`spell transform failed for ${s.index || s.name}: ${err.message}`);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Transform: Subclasses
// Combines 5e-SRD-Subclasses.json + 5e-SRD-Features.json (+ Levels.json).
// ----------------------------------------------------------------------------

function buildFeaturesBySubclass(features) {
  // Map: subclass-index → [{ level, name, desc }]
  const bySub = new Map();
  for (const f of features) {
    const sub = f.subclass?.index;
    if (!sub) continue;
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub).push({
      level: Number(f.level) || 1,
      name: f.name,
      description: joinDesc(f.desc),
    });
  }
  return bySub;
}

function buildSubclassSpellsByLevel(levels, subclassIndex) {
  // Extra/domain spells a subclass grants. 5e-bits exposes these in levels
  // entries that have subclass_specific.additional_magical_secrets_max_lvl,
  // or for certain subclasses in `spells` arrays. We scan all levels for
  // the subclass and accumulate `spells` if present.
  const out = {};
  for (const lvl of levels) {
    if (lvl.subclass?.index !== subclassIndex) continue;
    if (Array.isArray(lvl.features)) {
      // features linked elsewhere; spells field (if present) can carry domain spells
    }
  }
  return out;
}

function extractSpellSlotsFromLevels(levels, classIndex) {
  // For full-caster subclasses (cleric, druid, wizard, sorcerer, bard), the
  // slot table lives on the class-level entries, not subclass. We mirror the
  // class spell_slots. Return an array of arrays sized [20][9].
  const slots = Array.from({ length: 20 }, () => Array(9).fill(0));
  for (const lvl of levels) {
    if (lvl.class?.index !== classIndex) continue;
    if (lvl.subclass) continue;
    const level = Number(lvl.level) || 0;
    if (level < 1 || level > 20) continue;
    const sc = lvl.spellcasting || {};
    for (let i = 1; i <= 9; i++) {
      const key = `spell_slots_level_${i}`;
      if (typeof sc[key] === "number") slots[level - 1][i - 1] = sc[key];
    }
  }
  return slots;
}

function warlockSlotsFromLevels(levels) {
  // Warlock uses Pact Magic (single slot level column), stored as
  // spell_slots_level_N on the warlock class levels.
  return extractSpellSlotsFromLevels(levels, "warlock");
}

const CASTER_SPELL_CASTING = {
  bard: { ability: "CHA", type: "full" },
  cleric: { ability: "WIS", type: "full" },
  druid: { ability: "WIS", type: "full" },
  sorcerer: { ability: "CHA", type: "full" },
  wizard: { ability: "INT", type: "full" },
  warlock: { ability: "CHA", type: "warlock" },
  paladin: { ability: "CHA", type: "half" },
  ranger: { ability: "WIS", type: "half" },
};

function transformSubclasses(subclasses, features, levels) {
  const out = [];
  const featMap = buildFeaturesBySubclass(features);

  const slotCache = {};
  function getSlots(classSlug) {
    if (slotCache[classSlug]) return slotCache[classSlug];
    slotCache[classSlug] = extractSpellSlotsFromLevels(levels, classSlug);
    return slotCache[classSlug];
  }

  for (const sc of subclasses) {
    try {
      const slug = kebab(sc.index || sc.name);
      if (!SUBCLASS_WHITELIST[slug]) {
        // Not in project scope; skip.
        continue;
      }
      const parent = SUBCLASS_WHITELIST[slug];
      const flavor = sc.subclass_flavor
        ? `${sc.subclass_flavor} of the ${sc.name}`
        : sc.name;

      // Gather features grouped by level.
      const raw = featMap.get(slug) || [];
      const features_by_level = {};
      for (const f of raw) {
        const lv = String(f.level);
        if (!features_by_level[lv]) features_by_level[lv] = [];
        features_by_level[lv].push({
          name: f.name,
          description: f.description,
        });
      }

      const data = {
        parent_class: parent,
        flavor_name: flavor,
        features_by_level,
      };

      // Casting: only attach when parent class is a caster AND the subclass
      // grants spells (e.g. cleric domain, wizard school etc.)
      if (CASTER_SPELL_CASTING[parent]) {
        const cast = { ...CASTER_SPELL_CASTING[parent] };
        if (cast.type === "full") {
          cast.spell_slots = getSlots(parent);
        } else if (cast.type === "warlock") {
          cast.spell_slots = getSlots(parent);
        }
        data.spell_casting = cast;
      }

      // Domain / extra spells — present for cleric life domain in SRD
      if (Array.isArray(sc.spells) && sc.spells.length > 0) {
        const extra = {};
        for (const entry of sc.spells) {
          const lv = String(entry.prerequisites?.[0]?.index?.match(/\d+/)?.[0] || entry.level || "1");
          const key = Number(lv) || 1;
          if (!extra[key]) extra[key] = [];
          extra[key].push(kebab(entry.spell.index || entry.spell.name));
        }
        if (Object.keys(extra).length > 0) {
          data.extra_spells = Object.fromEntries(
            Object.entries(extra).map(([k, v]) => [String(k), v]),
          );
        }
      }

      const outSlug = SUBCLASS_SLUG_REMAP[slug] ?? slug;
      out.push({
        slug: outSlug,
        name: sc.name,
        description: truncate(
          joinDesc(sc.desc) || `${sc.name} — a subclass of ${parent}.`,
        ),
        data,
      });
    } catch (err) {
      warn(`subclass transform failed for ${sc.index || sc.name}: ${err.message}`);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Transform: Monsters
// ----------------------------------------------------------------------------

function transformMonsters(monsters) {
  const out = [];
  for (const m of monsters) {
    try {
      const slug = kebab(m.index || m.name);
      if (!slug) continue;

      const cr = crToNumber(m.challenge_rating);
      const speed = {};
      for (const [k, v] of Object.entries(m.speed || {})) {
        if (k === "hover") {
          speed.hover = Boolean(v);
          continue;
        }
        const num = parseInt(String(v), 10);
        if (Number.isFinite(num)) speed[k] = num;
      }
      if (Object.keys(speed).length === 0) speed.walk = 30;

      const ability_scores = {
        STR: m.strength ?? 10,
        DEX: m.dexterity ?? 10,
        CON: m.constitution ?? 10,
        INT: m.intelligence ?? 10,
        WIS: m.wisdom ?? 10,
        CHA: m.charisma ?? 10,
      };

      const saving_throws = {};
      for (const p of m.proficiencies || []) {
        if (p.proficiency?.index?.startsWith("saving-throw-")) {
          const ab = p.proficiency.index.replace("saving-throw-", "").toUpperCase();
          saving_throws[ab] = p.value;
        }
      }
      const skills = {};
      for (const p of m.proficiencies || []) {
        if (p.proficiency?.index?.startsWith("skill-")) {
          const sk = p.proficiency.index.replace("skill-", "");
          skills[sk] = p.value;
        }
      }

      let ac = 10;
      let ac_source;
      if (Array.isArray(m.armor_class) && m.armor_class.length > 0) {
        ac = m.armor_class[0].value ?? 10;
        ac_source = m.armor_class[0].type || undefined;
        if (m.armor_class[0].armor && m.armor_class[0].armor.length > 0) {
          ac_source = m.armor_class[0].armor.map((a) => a.name).join(", ");
        }
      } else if (typeof m.armor_class === "number") {
        ac = m.armor_class;
      }

      const senses = { passive_perception: m.senses?.passive_perception ?? 10 };
      if (m.senses?.darkvision)
        senses.darkvision = parseInt(String(m.senses.darkvision), 10);
      if (m.senses?.blindsight)
        senses.blindsight = parseInt(String(m.senses.blindsight), 10);
      if (m.senses?.tremorsense)
        senses.tremorsense = parseInt(String(m.senses.tremorsense), 10);
      if (m.senses?.truesight)
        senses.truesight = parseInt(String(m.senses.truesight), 10);

      const damage_resistances = (m.damage_resistances || []).map(stripMd);
      const damage_immunities = (m.damage_immunities || []).map(stripMd);
      const damage_vulnerabilities = (m.damage_vulnerabilities || []).map(stripMd);
      const condition_immunities = (m.condition_immunities || []).map((c) => c.index || c.name);

      const mapAction = (a) => {
        const out = {
          name: a.name,
          description: joinDesc(a.desc),
        };
        if (typeof a.attack_bonus === "number") out.attack_bonus = a.attack_bonus;
        if (Array.isArray(a.damage)) {
          const dmg = [];
          for (const d of a.damage) {
            if (d.damage_dice && d.damage_type) {
              dmg.push({
                damage_dice: d.damage_dice,
                damage_type: kebab(d.damage_type.index || d.damage_type.name),
              });
            }
          }
          if (dmg.length > 0) out.damage = dmg;
        }
        if (typeof a.cost === "number") out.cost = a.cost;
        return out;
      };

      const data = {
        size: m.size || "Medium",
        type: String(m.type || "humanoid").toLowerCase(),
        alignment: String(m.alignment || "unaligned").toLowerCase(),
        ac,
        hp: {
          average: m.hit_points ?? 0,
          roll: m.hit_points_roll || m.hit_dice || "",
        },
        speed,
        ability_scores,
        senses,
        languages: m.languages
          ? String(m.languages)
              .split(",")
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        challenge_rating: cr,
        xp: m.xp ?? xpForCR(cr),
        proficiency_bonus: m.proficiency_bonus ?? proficiencyBonusForCR(cr),
      };
      if (m.subtype) data.subtype = m.subtype;
      if (ac_source) data.ac_source = ac_source;
      if (Object.keys(saving_throws).length > 0) data.saving_throws = saving_throws;
      if (Object.keys(skills).length > 0) data.skills = skills;
      if (damage_resistances.length > 0) data.damage_resistances = damage_resistances;
      if (damage_immunities.length > 0) data.damage_immunities = damage_immunities;
      if (damage_vulnerabilities.length > 0)
        data.damage_vulnerabilities = damage_vulnerabilities;
      if (condition_immunities.length > 0) data.condition_immunities = condition_immunities;

      if (Array.isArray(m.special_abilities) && m.special_abilities.length > 0) {
        data.special_abilities = m.special_abilities.map((x) => ({
          name: x.name,
          description: joinDesc(x.desc),
        }));
      }
      if (Array.isArray(m.actions) && m.actions.length > 0) {
        data.actions = m.actions.map(mapAction);
      }
      if (Array.isArray(m.legendary_actions) && m.legendary_actions.length > 0) {
        data.legendary_actions = m.legendary_actions.map(mapAction);
      }
      if (Array.isArray(m.reactions) && m.reactions.length > 0) {
        data.reactions = m.reactions.map((r) => ({
          name: r.name,
          description: joinDesc(r.desc),
        }));
      }

      out.push({
        slug,
        name: m.name,
        description: truncate(
          `${data.size} ${data.type}${data.subtype ? ` (${data.subtype})` : ""}, ${data.alignment}. CR ${data.challenge_rating}.`,
        ),
        data,
      });
    } catch (err) {
      warn(`monster transform failed for ${m.index || m.name}: ${err.message}`);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Transform: Conditions
// ----------------------------------------------------------------------------

function transformConditions(conditions) {
  const out = [];
  for (const c of conditions) {
    try {
      const slug = kebab(c.index || c.name);
      if (!slug) continue;
      const effects = Array.isArray(c.desc)
        ? c.desc.map(stripMd)
        : [stripMd(c.desc || "")];
      out.push({
        slug,
        name: c.name,
        description: truncate(effects[0] || c.name),
        data: {
          effects,
          description: effects.join("\n"),
        },
      });
    } catch (err) {
      warn(`condition transform failed for ${c.index}: ${err.message}`);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Transform: Equipment → items, plus Magic-Items
// ----------------------------------------------------------------------------

function rarityToEnum(r) {
  if (!r) return undefined;
  const s = String(r.name || r).toLowerCase().replace(/\s+/g, "_");
  if (s === "very_rare") return "very_rare";
  const allowed = ["common", "uncommon", "rare", "very_rare", "legendary", "artifact"];
  return allowed.includes(s) ? s : undefined;
}

function mapWeapon(e) {
  if (!e.damage && !e.range && !e.weapon_category && !e.weapon_range) return undefined;
  const w = {
    damage_dice: e.damage?.damage_dice || "1d4",
    damage_type: kebab(e.damage?.damage_type?.index || e.damage?.damage_type?.name || "bludgeoning"),
    properties: (e.properties || []).map((p) => p.name || p.index),
  };
  if (e.two_handed_damage?.damage_dice) {
    w.properties.push(`versatile (${e.two_handed_damage.damage_dice})`);
  }
  if (e.range && (e.range.normal || e.range.long)) {
    w.range = {
      normal: e.range.normal || 5,
      long: e.range.long || e.range.normal || 5,
    };
    // schema demands positive ints — drop if zero
    if (w.range.normal <= 0 || w.range.long <= 0) delete w.range;
  }
  return w;
}

function mapArmor(e) {
  if (!e.armor_category || !e.armor_class) return undefined;
  const cat = String(e.armor_category).toLowerCase();
  let type;
  if (cat.includes("light")) type = "light";
  else if (cat.includes("medium")) type = "medium";
  else if (cat.includes("heavy")) type = "heavy";
  else if (cat.includes("shield")) type = "shield";
  else return undefined;
  const a = {
    base_ac: e.armor_class?.base ?? 10,
    type,
  };
  if (!e.armor_class?.dex_bonus) a.max_dex_bonus = 0;
  if (typeof e.str_minimum === "number" && e.str_minimum > 0)
    a.strength_requirement = e.str_minimum;
  if (e.stealth_disadvantage) a.stealth_disadvantage = true;
  return a;
}

function mapCost(cost) {
  if (!cost) return undefined;
  return {
    amount: cost.quantity ?? 0,
    currency: cost.unit || "gp",
  };
}

function transformEquipment(equipment) {
  const out = [];
  for (const e of equipment) {
    try {
      const slug = kebab(e.index || e.name);
      if (!slug) continue;
      const cat = String(e.equipment_category?.index || "").toLowerCase();

      let category;
      if (cat === "weapon" || e.weapon_category) category = "weapon";
      else if (cat === "armor" || e.armor_category) {
        category =
          String(e.armor_category).toLowerCase() === "shield" ? "shield" : "armor";
      } else if (cat === "tools") category = "tool";
      else if (cat === "adventuring-gear") category = "gear";
      else category = "gear";

      const data = { category };
      const cost = mapCost(e.cost);
      if (cost) data.cost = cost;
      if (typeof e.weight === "number") data.weight = e.weight;

      if (category === "weapon") {
        const w = mapWeapon(e);
        if (w) data.weapon = w;
      } else if (category === "armor" || category === "shield") {
        const a = mapArmor(e);
        if (a) data.armor = a;
      }

      const desc = joinDesc(e.desc) || e.name;

      out.push({
        slug,
        name: e.name,
        description: truncate(desc),
        data,
      });
    } catch (err) {
      warn(`equipment transform failed for ${e.index}: ${err.message}`);
    }
  }
  return out;
}

function buildPlus1Modifiers(name, slug) {
  // e.g. "+1 Longsword" → ["attack.bonus"=+1, "damage.bonus"=+1]
  const m = /([+-]?\d+)/.exec(name);
  if (!m) return undefined;
  const val = parseInt(m[1], 10);
  if (!Number.isFinite(val) || val === 0) return undefined;
  return [
    {
      target: "attack.bonus",
      type: "bonus",
      value: val,
      source: `item:${slug}`,
      priority: 20,
    },
    {
      target: "damage.bonus",
      type: "bonus",
      value: val,
      source: `item:${slug}`,
      priority: 20,
    },
  ];
}

function transformMagicItems(magicItems) {
  const out = [];
  for (const mi of magicItems) {
    try {
      const slug = kebab(mi.index || mi.name);
      if (!slug) continue;
      const desc = joinDesc(mi.desc);
      const data = {
        category: "magic",
      };
      const rarity = rarityToEnum(mi.rarity);
      if (rarity) data.rarity = rarity;
      data.requires_attunement = /requires attunement/i.test(desc);

      const mods = buildPlus1Modifiers(mi.name, slug);
      if (mods) data.modifiers = mods;

      out.push({
        slug,
        name: mi.name,
        description: truncate(desc),
        data,
      });
    } catch (err) {
      warn(`magic-item transform failed for ${mi.index}: ${err.message}`);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Merge existing items.json with SRD equipment (by slug, project wins)
// ----------------------------------------------------------------------------

function mergeItems(existingItems, equipmentItems) {
  const bySlug = new Map();
  for (const it of existingItems) bySlug.set(it.slug, it);
  for (const it of equipmentItems) {
    if (!bySlug.has(it.slug)) bySlug.set(it.slug, it);
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log("Loading source data...");
  const src = await loadSource();

  if (
    !src.spells?.length ||
    !src.monsters?.length ||
    !src.conditions?.length ||
    !src.magicItems?.length ||
    !src.equipment?.length ||
    !src.subclasses?.length ||
    !src.features?.length ||
    !src.levels?.length
  ) {
    fail("One or more source datasets failed to load; aborting.");
    process.exit(1);
  }

  console.log("Transforming...");
  const spells = transformSpells(src.spells);
  const subclasses = transformSubclasses(src.subclasses, src.features, src.levels);
  const monsters = transformMonsters(src.monsters);
  const conditions = transformConditions(src.conditions);
  const magicItems = transformMagicItems(src.magicItems);
  const equipmentItems = transformEquipment(src.equipment);

  // Merge with existing items.json.
  const existingItemsPath = path.join(DATA_DIR, "items.json");
  let existingItems = [];
  if (existsSync(existingItemsPath)) {
    try {
      existingItems = JSON.parse(readFileSync(existingItemsPath, "utf8"));
    } catch (err) {
      warn(`failed to parse existing items.json: ${err.message}`);
    }
  }
  const items = mergeItems(existingItems, equipmentItems);

  // Write outputs.
  writeJson(path.join(DATA_DIR, "spells.json"), spells);
  writeJson(path.join(DATA_DIR, "subclasses.json"), subclasses);
  writeJson(path.join(DATA_DIR, "monsters.json"), monsters);
  writeJson(path.join(DATA_DIR, "conditions.json"), conditions);
  writeJson(path.join(DATA_DIR, "magic-items.json"), magicItems);
  writeJson(existingItemsPath, items);

  // Summary + empty-file check.
  const summary =
    `subclasses: ${subclasses.length} | spells: ${spells.length} | ` +
    `monsters: ${monsters.length} | conditions: ${conditions.length} | ` +
    `magic_items: ${magicItems.length} | items: ${items.length}`;
  console.log("\n" + summary);

  if (
    subclasses.length === 0 ||
    spells.length === 0 ||
    monsters.length === 0 ||
    conditions.length === 0 ||
    magicItems.length === 0 ||
    items.length === 0
  ) {
    fail("One or more output files are empty.");
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s) during import.`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
