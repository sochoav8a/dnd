"use client";

import { Icon, addCollection } from "@iconify/react";
import curated from "@/lib/icons/curated.json";

// Register the curated subset once at module load. The icons are from
// https://game-icons.net — CC-BY 3.0 (see CREDITS in site footer).
let registered = false;
function ensureRegistered() {
  if (registered) return;
  addCollection(curated as Parameters<typeof addCollection>[0]);
  registered = true;
}

// ── Mappings: semantic slug → iconify icon name ─────────────────────────────

export const CLASS_ICONS: Record<string, string> = {
  barbarian: "barbarian",
  bard: "harp",
  cleric: "holy-symbol",
  druid: "holy-oak",
  fighter: "crossed-swords",
  monk: "fist",
  paladin: "mailed-fist",
  ranger: "bow-string",
  rogue: "rogue",
  sorcerer: "spark-spirit",
  warlock: "warlock-eye",
  wizard: "wizard-staff",
};

export const RACE_ICONS: Record<string, string> = {
  human: "hood",
  elf: "elf-ear",
  "high-elf": "elf-ear",
  "wood-elf": "elf-ear",
  "half-elf": "elf-ear",
  dwarf: "dwarf-face",
  "hill-dwarf": "dwarf-face",
  "mountain-dwarf": "dwarf-face",
  halfling: "hobbit-door",
  "lightfoot-halfling": "hobbit-door",
  "stout-halfling": "hobbit-door",
  gnome: "bad-gnome",
  "forest-gnome": "bad-gnome",
  "rock-gnome": "bad-gnome",
  "half-orc": "orc-head",
  dragonborn: "dragon-head",
  tiefling: "devil-mask",
};

export const CONDITION_ICONS: Record<string, string> = {
  blinded: "blindfold",
  charmed: "charm",
  deafened: "human-ear",
  exhaustion: "sleepy",
  frightened: "terror",
  grappled: "grapple",
  incapacitated: "knockout",
  invisible: "invisible",
  paralyzed: "frozen-body",
  petrified: "stone-bust",
  poisoned: "poison",
  prone: "fall-down",
  restrained: "crossed-chains",
  stunned: "knocked-out-stars",
  unconscious: "night-sleep",
};

export const SCHOOL_ICONS: Record<string, string> = {
  abjuration: "shield",
  conjuration: "magic-gate",
  divination: "crystal-ball",
  enchantment: "charm",
  evocation: "flame",
  illusion: "domino-mask",
  necromancy: "animal-skull",
  transmutation: "transform",
};

export const ABILITY_ICONS: Record<string, string> = {
  STR: "muscle-up",
  DEX: "acrobatic",
  CON: "ball-heart",
  INT: "brain",
  WIS: "wisdom",
  CHA: "theater",
};

export const DAMAGE_ICONS: Record<string, string> = {
  acid: "acid-blob",
  bludgeoning: "flat-hammer",
  cold: "frozen-orb",
  fire: "flame",
  force: "mighty-force",
  lightning: "chain-lightning",
  necrotic: "animal-skull",
  piercing: "piercing-sword",
  poison: "poison",
  psychic: "psychic-waves",
  radiant: "barbed-sun",
  slashing: "crossed-slashes",
  thunder: "thunder-blade",
};

// ── Component ───────────────────────────────────────────────────────────────

type IconKind = "class" | "race" | "condition" | "school" | "ability" | "damage" | "raw";

const MAP_BY_KIND: Record<Exclude<IconKind, "raw">, Record<string, string>> = {
  class: CLASS_ICONS,
  race: RACE_ICONS,
  condition: CONDITION_ICONS,
  school: SCHOOL_ICONS,
  ability: ABILITY_ICONS,
  damage: DAMAGE_ICONS,
};

interface GameIconProps {
  kind: IconKind;
  slug: string;
  className?: string;
  size?: number | string;
  /** Optional aria-label. If omitted, the icon is aria-hidden. */
  label?: string;
}

/**
 * Usage:
 *   <GameIcon kind="class" slug="barbarian" size={24} />
 *   <GameIcon kind="condition" slug="poisoned" className="text-green-400" />
 *   <GameIcon kind="raw" slug="hearts" />
 */
export function GameIcon({ kind, slug, className, size, label }: GameIconProps) {
  ensureRegistered();
  const iconName =
    kind === "raw" ? slug : MAP_BY_KIND[kind][slug.toLowerCase()] ?? null;
  if (!iconName) return null;

  return (
    <Icon
      icon={`dnd:${iconName}`}
      className={className}
      width={size ?? "1em"}
      height={size ?? "1em"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
