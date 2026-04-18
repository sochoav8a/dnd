import { z } from "zod";

export const backgroundDataSchema = z.object({
  skill_proficiencies: z.array(z.string()).min(2).max(2),
  tool_proficiencies: z.array(z.string()).optional(),
  languages: z.number().int().nonnegative().optional(),
  starting_equipment: z.array(z.string()).optional(),
  feature: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  }),
  suggested_characteristics: z
    .object({
      personality_traits: z.array(z.string()).optional(),
      ideals: z.array(z.string()).optional(),
      bonds: z.array(z.string()).optional(),
      flaws: z.array(z.string()).optional(),
    })
    .optional(),
});
