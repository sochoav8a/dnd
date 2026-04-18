import { z } from "zod";

const damageSchema = z.object({
  damage_dice: z.string().min(1),
  damage_type: z.string().min(1),
});

const actionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  attack_bonus: z.number().int().optional(),
  damage: z.array(damageSchema).optional(),
  cost: z.number().int().positive().optional(),
});

const abilityBlockSchema = z.object({
  STR: z.number().int(),
  DEX: z.number().int(),
  CON: z.number().int(),
  INT: z.number().int(),
  WIS: z.number().int(),
  CHA: z.number().int(),
});

export const monsterDataSchema = z.object({
  size: z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]),
  type: z.string().min(1),
  subtype: z.string().optional(),
  alignment: z.string().min(1),
  ac: z.number().int().min(0),
  ac_source: z.string().optional(),
  hp: z.object({
    average: z.number().int().min(1),
    roll: z.string().min(1),
  }),
  speed: z.object({
    walk: z.number().int().nonnegative().optional(),
    fly: z.number().int().nonnegative().optional(),
    swim: z.number().int().nonnegative().optional(),
    climb: z.number().int().nonnegative().optional(),
    burrow: z.number().int().nonnegative().optional(),
    hover: z.boolean().optional(),
  }),
  ability_scores: abilityBlockSchema,
  saving_throws: z.record(z.string(), z.number().int()).optional(),
  skills: z.record(z.string(), z.number().int()).optional(),
  damage_resistances: z.array(z.string()).optional(),
  damage_immunities: z.array(z.string()).optional(),
  damage_vulnerabilities: z.array(z.string()).optional(),
  condition_immunities: z.array(z.string()).optional(),
  senses: z.object({
    passive_perception: z.number().int().min(0),
    darkvision: z.number().int().nonnegative().optional(),
    blindsight: z.number().int().nonnegative().optional(),
    tremorsense: z.number().int().nonnegative().optional(),
    truesight: z.number().int().nonnegative().optional(),
  }),
  languages: z.array(z.string()),
  challenge_rating: z.number().nonnegative(),
  xp: z.number().int().nonnegative(),
  proficiency_bonus: z.number().int().min(2).max(9),
  special_abilities: z
    .array(z.object({ name: z.string().min(1), description: z.string().min(1) }))
    .optional(),
  actions: z.array(actionSchema).optional(),
  legendary_actions: z.array(actionSchema).optional(),
  reactions: z
    .array(z.object({ name: z.string().min(1), description: z.string().min(1) }))
    .optional(),
});
