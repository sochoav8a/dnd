import type { AbilityScores } from "./ability-scores.js";
import type { Condition } from "../constants/conditions.js";

export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}

export interface HitDice {
  total: number;
  remaining: number;
  die: number; // e.g. 8 for d8
}

export interface SpellSlots {
  [level: number]: { total: number; remaining: number };
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface CharacterState {
  ability_scores: AbilityScores;
  hp: HitPoints;
  hit_dice: HitDice[];
  spell_slots: SpellSlots;
  prepared_spells: string[]; // content_item slugs
  known_spells: string[];
  conditions: Condition[];
  death_saves: DeathSaves;
  inspiration: boolean;
  exhaustion_level: number;
  notes: string;
  custom_modifiers: import("./modifiers.js").Modifier[];
  /** Slug of the spell the character is currently concentrating on, if any. */
  concentrating_on?: string | null;
  /** Warlock: slugs of chosen Eldritch Invocations */
  eldritch_invocations?: string[];
  /** Warlock: chosen Pact Boon (pact-of-the-blade | pact-of-the-chain | pact-of-the-tome) */
  pact_boon?: string | null;
}

export interface Character {
  id: string;
  userId: string;
  campaignId: string | null;
  name: string;
  level: number;
  experience: number;
  raceId: string;
  subraceId: string | null;
  classId: string;
  subclassId: string | null;
  backgroundId: string;
  portraitUrl: string | null;
  state: CharacterState;
  computed: import("./computed.js").ComputedCharacter;
  createdAt: Date;
  updatedAt: Date;
}
