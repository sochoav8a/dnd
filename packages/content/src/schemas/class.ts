import { z } from "zod";
import { modifierSchema } from "./modifiers.js";

const classFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  modifiers: z.array(modifierSchema).optional(),
});

const spellcastingInfoSchema = z.object({
  ability: z.string().min(1),
  type: z.enum(["full", "half", "third", "warlock"]),
  cantrips_known: z.array(z.number().int().nonnegative()).length(20).optional(),
  spells_known: z.array(z.number().int().nonnegative()).length(20).optional(),
  spell_slots: z.array(z.array(z.number().int().nonnegative())).optional(),
});

export const classDataSchema = z.object({
  hit_die: z.number().int().positive(),
  primary_ability: z.array(z.string()).min(1),
  saving_throws: z.array(z.string()).length(2),
  armor_proficiencies: z.array(z.string()),
  weapon_proficiencies: z.array(z.string()),
  tool_proficiencies: z.array(z.string()).optional(),
  skill_choices: z.object({
    count: z.number().int().positive(),
    from: z.array(z.string()).min(1),
  }),
  features_by_level: z.record(
    z.string().regex(/^(?:[1-9]|1\d|20)$/),
    z.array(classFeatureSchema),
  ),
  subclass_level: z.number().int().min(1).max(20),
  spell_casting: spellcastingInfoSchema.nullable(),
  subclasses: z.array(z.string()).optional(),
});

export const subclassDataSchema = z.object({
  parent_class: z.string().min(1),
  flavor_name: z.string().min(1),
  features_by_level: z.record(
    z.string().regex(/^(?:[1-9]|1\d|20)$/),
    z.array(classFeatureSchema),
  ),
  spell_casting: spellcastingInfoSchema.optional(),
  extra_spells: z.record(z.string(), z.array(z.string())).optional(),
});
