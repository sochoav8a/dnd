import * as dotenv from "dotenv";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import type { ContentType } from "@dnd/shared";
import * as schema from "../schema";

dotenv.config({ path: join(__dirname, "../../../../.env") });

const DATA_DIR = join(__dirname, "../../../../data/srd");
type SeedableContentType = Extract<ContentType, "race" | "class" | "background" | "spell" | "item">;

async function loadJson<T>(filename: string): Promise<T[]> {
  const content = await readFile(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(content) as T[];
}

interface SrdEntry {
  slug: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}

async function seed() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("🌱 Starting seed...");

  // ── 1. Create SRD content source ──────────────────────────────────────────
  let srdSource = await db.query.contentSources.findFirst({
    where: eq(schema.contentSources.name, "SRD 5.1"),
  });

  if (!srdSource) {
    [srdSource] = await db
      .insert(schema.contentSources)
      .values({ name: "SRD 5.1", type: "official", createdBy: null })
      .returning();
    console.log(`  ✓ Created content source: SRD 5.1 (${srdSource!.id})`);
  } else {
    console.log(`  → Content source already exists: SRD 5.1 (${srdSource.id})`);
  }

  const sourceId = srdSource!.id;

  // ── 2. Seed content by type ────────────────────────────────────────────────
  const files: Array<{ file: string; type: SeedableContentType }> = [
    { file: "races.json", type: "race" },
    { file: "classes.json", type: "class" },
    { file: "backgrounds.json", type: "background" },
    { file: "spells.json", type: "spell" },
    { file: "items.json", type: "item" },
  ];

  // Handle subraces separately (they're inside race entries)
  const racesRaw = await loadJson<SrdEntry & {
    data: { subraces?: string[] };
  }>("races.json");

  const subraceEntries: SrdEntry[] = racesRaw.filter(
    (r): r is SrdEntry & { data: { parent_race: string } } =>
      "parent_race" in r.data,
  );

  const raceEntries = racesRaw.filter((r) => !("parent_race" in r.data));

  for (const { file, type } of files) {
    let entries: SrdEntry[];

    if (file === "races.json") {
      entries = raceEntries;
    } else {
      entries = await loadJson<SrdEntry>(file);
    }

    let inserted = 0;
    let skipped = 0;

    for (const entry of entries) {
      const existing = await db.query.contentItems.findFirst({
        where: eq(schema.contentItems.slug, entry.slug),
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(schema.contentItems).values({
        sourceId,
        contentType: type,
        name: entry.name,
        slug: entry.slug,
        description: entry.description ?? null,
        data: entry.data as Record<string, unknown>,
      });

      inserted++;
    }

    console.log(`  ✓ ${type}: ${inserted} inserted, ${skipped} skipped`);
  }

  // ── 3. Seed subraces ──────────────────────────────────────────────────────
  {
    let inserted = 0;
    let skipped = 0;

    for (const entry of subraceEntries) {
      const existing = await db.query.contentItems.findFirst({
        where: eq(schema.contentItems.slug, entry.slug),
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(schema.contentItems).values({
        sourceId,
        contentType: "subrace",
        name: entry.name,
        slug: entry.slug,
        description: entry.description ?? null,
        data: entry.data as Record<string, unknown>,
      });

      inserted++;
    }

    console.log(`  ✓ subrace: ${inserted} inserted, ${skipped} skipped`);
  }

  // ── 4. Create admin user ───────────────────────────────────────────────────
  const adminEmail = process.env["SEED_ADMIN_EMAIL"] ?? "admin@dnd.local";
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"];

  if (adminPassword) {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, adminEmail),
    });

    if (!existing) {
      const { default: bcrypt } = await import("bcryptjs");
      const hash = await bcrypt.hash(adminPassword, 12);

      const [admin] = await db
        .insert(schema.users)
        .values({
          email: adminEmail,
          username: "admin",
          passwordHash: hash,
          role: "admin",
        })
        .returning();

      // Grant admin access to SRD
      await db.insert(schema.entitlements).values({
        userId: admin!.id,
        sourceId,
        grantedBy: null,
      });

      console.log(`  ✓ Created admin user: ${adminEmail}`);
    } else {
      console.log(`  → Admin user already exists: ${adminEmail}`);
    }
  }

  console.log("✅ Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
