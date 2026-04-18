import { z } from "zod";
import { modifierSchema } from "./modifiers.js";

const weaponPropertiesSchema = z.object({
  damage_dice: z.string().min(1),
  damage_type: z.string().min(1),
  properties: z.array(z.string()),
  range: z
    .object({ normal: z.number().int().positive(), long: z.number().int().positive() })
    .optional(),
});

const armorPropertiesSchema = z.object({
  base_ac: z.number().int().min(1),
  type: z.enum(["light", "medium", "heavy", "shield"]),
  max_dex_bonus: z.number().int().nullable().optional(),
  strength_requirement: z.number().int().optional(),
  stealth_disadvantage: z.boolean().optional(),
});

export const itemDataSchema = z.object({
  category: z.enum(["weapon", "armor", "shield", "gear", "tool", "magic"]),
  cost: z
    .object({ amount: z.number().nonnegative(), currency: z.string() })
    .optional(),
  weight: z.number().nonnegative().optional(),
  weapon: weaponPropertiesSchema.optional(),
  armor: armorPropertiesSchema.optional(),
  rarity: z
    .enum(["common", "uncommon", "rare", "very_rare", "legendary", "artifact"])
    .optional(),
  requires_attunement: z.boolean().optional(),
  modifiers: z.array(modifierSchema).optional(),
});
