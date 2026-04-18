import { pgEnum } from "drizzle-orm/pg-core";

export const encounterStatusEnum = pgEnum("encounter_status", [
  "prep",
  "active",
  "completed",
]);

export const contentSourceTypeEnum = pgEnum("content_source_type", [
  "official",
  "homebrew",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "race",
  "subrace",
  "class",
  "subclass",
  "background",
  "feat",
  "spell",
  "item",
  "monster",
  "condition",
  "rule",
]);

export const userRoleEnum = pgEnum("user_role", ["player", "dm", "admin"]);

export const campaignMemberRoleEnum = pgEnum("campaign_member_role", [
  "dm",
  "player",
]);
