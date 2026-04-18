/**
 * Seeds the database with SRD 5.1 content.
 * Safe to run multiple times — uses upsert on slug+source.
 *
 * Usage: pnpm --filter @dnd/db seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import * as schema from "./schema/index.js";
import { eq, and } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, "../../../.env") });

const DATA_DIR = join(__dirname, "../../../data/srd");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8")) as T;
}

function readJsonIfExists<T>(file: string): T | null {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

interface SrdEntry {
  slug: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
}

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding SRD 5.1 content...\n");

  // ── Ensure SRD source exists ─────────────────────────────────────────────
  let [source] = await db
    .select()
    .from(schema.contentSources)
    .where(eq(schema.contentSources.name, "SRD 5.1"))
    .limit(1);

  if (!source) {
    [source] = await db
      .insert(schema.contentSources)
      .values({ name: "SRD 5.1", type: "official" })
      .returning();
    console.log("Created SRD 5.1 source.");
  } else {
    console.log("SRD 5.1 source already exists.");
  }

  const sourceId = source!.id;

  // ── Helper: upsert a content item ────────────────────────────────────────
  async function upsert(
    type: (typeof schema.contentTypeEnum.enumValues)[number],
    entries: SrdEntry[],
  ) {
    let created = 0;
    let updated = 0;

    for (const entry of entries) {
      const existing = await db
        .select({ id: schema.contentItems.id })
        .from(schema.contentItems)
        .where(
          and(
            eq(schema.contentItems.slug, entry.slug),
            eq(schema.contentItems.sourceId, sourceId),
            eq(schema.contentItems.contentType, type),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.contentItems)
          .set({
            name: entry.name,
            description: entry.description ?? null,
            data: entry.data,
            updatedAt: new Date(),
          })
          .where(eq(schema.contentItems.id, existing[0]!.id));
        updated++;
      } else {
        await db.insert(schema.contentItems).values({
          sourceId,
          contentType: type,
          slug: entry.slug,
          name: entry.name,
          description: entry.description ?? null,
          data: entry.data,
        });
        created++;
      }
    }

    console.log(`  ${type}: ${created} created, ${updated} updated (${entries.length} total)`);
  }

  // ── Load and seed each content type ─────────────────────────────────────
  const racesFile = readJson<SrdEntry[]>("races.json");

  // Entries with parent_race in data are subraces; others are races
  const races = racesFile.filter((r) => !r.data["parent_race"]);
  const subraces = racesFile.filter((r) => !!r.data["parent_race"]);

  await upsert("race", races);
  if (subraces.length > 0) await upsert("subrace", subraces);

  const classes = readJson<SrdEntry[]>("classes.json");
  await upsert("class", classes);

  const subclasses = readJsonIfExists<SrdEntry[]>("subclasses.json");
  if (subclasses && subclasses.length > 0) await upsert("subclass", subclasses);

  const backgrounds = readJson<SrdEntry[]>("backgrounds.json");
  await upsert("background", backgrounds);

  const spells = readJson<SrdEntry[]>("spells.json");
  await upsert("spell", spells);

  // Items + magic items both stored as "item" content type
  const baseItems = readJson<SrdEntry[]>("items.json");
  const magicItems = readJsonIfExists<SrdEntry[]>("magic-items.json") ?? [];
  const seenSlugs = new Set<string>();
  const mergedItems: SrdEntry[] = [];
  for (const entry of [...baseItems, ...magicItems]) {
    if (seenSlugs.has(entry.slug)) continue;
    seenSlugs.add(entry.slug);
    mergedItems.push(entry);
  }
  await upsert("item", mergedItems);

  const monsters = readJsonIfExists<SrdEntry[]>("monsters.json");
  if (monsters && monsters.length > 0) await upsert("monster", monsters);

  const conditions = readJsonIfExists<SrdEntry[]>("conditions.json");
  if (conditions && conditions.length > 0) await upsert("condition", conditions);

  const feats = readJson<SrdEntry[]>("feats.json");
  await upsert("feat", feats);

  console.log("\nSeed complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
