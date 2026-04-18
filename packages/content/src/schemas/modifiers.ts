import { z } from "zod";

export const modifierConditionSchema = z.object({
  armor_type: z.enum(["none", "light", "medium", "heavy", "shield"]).optional(),
  has_feature: z.string().optional(),
  wielding: z.string().optional(),
  class: z.string().optional(),
});

export const modifierSchema = z.object({
  target: z.string().min(1),
  type: z.enum([
    "bonus",
    "set",
    "advantage",
    "disadvantage",
    "proficiency",
    "expertise",
    "resistance",
    "immunity",
    "vulnerability",
  ]),
  value: z.union([z.number(), z.string()]),
  condition: modifierConditionSchema.optional(),
  source: z.string().min(1),
  priority: z.number().int(),
});

export type ModifierSchema = z.infer<typeof modifierSchema>;
