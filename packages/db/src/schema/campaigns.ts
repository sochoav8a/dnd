import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { campaignMemberRoleEnum } from "./enums";
import { users } from "./users";

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    dmId: uuid("dm_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    inviteCode: text("invite_code").unique(),
    settings: jsonb("settings").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("campaigns_dm_idx").on(t.dmId)],
);

export const campaignMembers = pgTable(
  "campaign_members",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: campaignMemberRoleEnum("role").notNull().default("player"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] })],
);
