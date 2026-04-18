import type { ContentType } from "@dnd/shared";
import { raceDataSchema, subraceDataSchema } from "./schemas/race.js";
import { classDataSchema, subclassDataSchema } from "./schemas/class.js";
import { spellDataSchema } from "./schemas/spell.js";
import { itemDataSchema } from "./schemas/item.js";
import { backgroundDataSchema } from "./schemas/background.js";
import { featDataSchema } from "./schemas/feat.js";
import { monsterDataSchema } from "./schemas/monster.js";
import { conditionDataSchema } from "./schemas/condition.js";

const SCHEMA_MAP = {
  race: raceDataSchema,
  subrace: subraceDataSchema,
  class: classDataSchema,
  subclass: subclassDataSchema,
  spell: spellDataSchema,
  item: itemDataSchema,
  background: backgroundDataSchema,
  feat: featDataSchema,
  monster: monsterDataSchema,
  condition: conditionDataSchema,
  rule: null,
} as const;

export function validateContentData(
  contentType: ContentType,
  data: unknown,
): { success: true; data: unknown } | { success: false; errors: string[] } {
  const schema = SCHEMA_MAP[contentType];
  if (!schema) {
    return { success: true, data };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return { success: false, errors };
}
