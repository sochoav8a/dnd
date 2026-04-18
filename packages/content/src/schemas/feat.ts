import { z } from "zod";
import { modifierSchema } from "./modifiers.js";

export const featDataSchema = z.object({
  prerequisites: z.array(z.string()).optional(),
  ability_score_improvement: z.record(z.string(), z.number().int()).optional(),
  modifiers: z.array(modifierSchema),
  description: z.string().min(1),
});
