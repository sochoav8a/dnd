import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { campaigns } from "./campaigns";
import { contentItems } from "./content";

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    level: integer("level").notNull().default(1),
    experience: integer("experience").notNull().default(0),

    // Content references
    raceId: uuid("race_id")
      .notNull()
      .references(() => contentItems.id),
    subraceId: uuid("subrace_id").references(() => contentItems.id),
    classId: uuid("class_id")
      .notNull()
      .references(() => contentItems.id),
    subclassId: uuid("subclass_id").references(() => contentItems.id),
    backgroundId: uuid("background_id")
      .notNull()
      .references(() => contentItems.id),

    // User-uploaded portrait URL (served from API /uploads/...)
    portraitUrl: text("portrait_url"),

    // Mutable state (ability scores, HP, spell slots, conditions, etc.)
    state: jsonb("state").notNull().default("{}"),

    // Computed cache (AC, initiative, skill totals, etc.)
    computed: jsonb("computed").notNull().default("{}"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("characters_user_idx").on(t.userId),
    index("characters_campaign_idx").on(t.campaignId),
  ],
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    equipped: jsonb("equipped")
      .notNull()
      .$type<boolean>()
      .default(false as unknown as boolean),
    attunement: jsonb("attunement")
      .notNull()
      .$type<boolean>()
      .default(false as unknown as boolean),
    customData: jsonb("custom_data"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("inventory_character_idx").on(t.characterId)],
);
