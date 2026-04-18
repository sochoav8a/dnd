import { z } from "zod";

export const spellDataSchema = z.object({
  level: z.number().int().min(0).max(9),
  school: z.enum([
    "abjuration",
    "conjuration",
    "divination",
    "enchantment",
    "evocation",
    "illusion",
    "necromancy",
    "transmutation",
  ]),
  casting_time: z.string().min(1),
  range: z.string().min(1),
  components: z.object({
    V: z.boolean(),
    S: z.boolean(),
    M: z.string().optional(),
  }),
  duration: z.string().min(1),
  concentration: z.boolean(),
  ritual: z.boolean().optional(),
  damage: z
    .object({
      base: z.string(),
      type: z.string(),
      higher_levels: z.string().optional(),
    })
    .optional(),
  healing: z
    .object({
      base: z.string(),
      higher_levels: z.string().optional(),
    })
    .optional(),
  classes: z.array(z.string()).min(1),
  description: z.string().min(1),
});
