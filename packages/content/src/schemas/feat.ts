import { z } from "zod";
import { modifierSchema } from "./modifiers.js";

export const featDataSchema = z.object({
  /**
   * Prerequisites for taking the feat. Accepts either a simple string list
   * (e.g. ["DEX 13"]) or a structured block like
   *   { ability_scores: { DEX: 13 }, class: "cleric" }
   */
  prerequisites: z
    .union([
      z.array(z.string()),
      z
        .object({
          ability_scores: z.record(z.string(), z.number().int()).optional(),
          class: z.string().optional(),
          race: z.string().optional(),
          notes: z.string().optional(),
        })
        .passthrough(),
    ])
    .optional(),
  /** Fixed ability bonus applied automatically when the feat is taken. */
  ability_score_improvement: z.record(z.string(), z.number().int()).optional(),
  /** Feat where player must choose which ability to raise (half-feats). */
  ability_score_choice: z
    .object({
      amount: z.number().int().positive(),
      from: z.array(z.string()).min(1),
    })
    .optional(),
  modifiers: z.array(modifierSchema),
  /** Free-form description. Lives at the SrdEntry wrapper level too; optional here. */
  description: z.string().optional(),
});
