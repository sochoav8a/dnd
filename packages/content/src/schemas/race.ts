import { z } from "zod";

const traitSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const raceDataSchema = z.object({
  speed: z.number().int().positive(),
  size: z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]),
  ability_bonuses: z.record(z.string(), z.number().int()),
  traits: z.array(traitSchema),
  languages: z.array(z.string()),
  subraces: z.array(z.string()),
  darkvision: z.number().int().nonnegative().optional(),
  resistances: z.array(z.string()).optional(),
});

export const subraceDataSchema = z.object({
  parent_race: z.string().min(1),
  ability_bonuses: z.record(z.string(), z.number().int()),
  traits: z.array(traitSchema),
  extra_languages: z.array(z.string()).optional(),
  extra_proficiencies: z.array(z.string()).optional(),
  darkvision: z.number().int().nonnegative().optional(),
  resistances: z.array(z.string()).optional(),
});
