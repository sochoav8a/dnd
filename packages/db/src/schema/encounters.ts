import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { encounterStatusEnum } from "./enums";
import { campaigns } from "./campaigns";
import { characters } from "./characters";

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: encounterStatusEnum("status").notNull().default("prep"),
    round: integer("round").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("encounters_campaign_idx").on(t.campaignId)],
);

export const encounterParticipants = pgTable(
  "encounter_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    // Null for NPCs/monsters that have no character sheet
    characterId: uuid("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    initiative: integer("initiative"),
    hpCurrent: integer("hp_current").notNull().default(0),
    hpMax: integer("hp_max").notNull().default(0),
    isPlayer: boolean("is_player").notNull().default(true),
    conditions: jsonb("conditions")
      .notNull()
      .$type<string[]>()
      .default([] as unknown as string[]),
    concentratingOn: text("concentrating_on"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("participants_encounter_idx").on(t.encounterId)],
);
