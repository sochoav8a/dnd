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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { validateContentData } from "@dnd/content";
import * as schema from "./schema/index.js";
import { eq, and } from "drizzle-orm";
import type { ContentSourceType } from "@dnd/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, "../../../.env") });

const DATA_DIR = join(__dirname, "../../../data/srd");
const BOOKS_DIR = join(__dirname, "../../../data/books");

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
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

interface LocalBookManifest {
  name: string;
  type?: ContentSourceType;
}

const LOCAL_BOOK_FILE_MAP = [
  { file: "races.json", type: "race" },
  { file: "subraces.json", type: "subrace" },
  { file: "classes.json", type: "class" },
  { file: "subclasses.json", type: "subclass" },
  { file: "backgrounds.json", type: "background" },
  { file: "spells.json", type: "spell" },
  { file: "items.json", type: "item" },
  { file: "magic-items.json", type: "item" },
  { file: "monsters.json", type: "monster" },
  { file: "conditions.json", type: "condition" },
  { file: "feats.json", type: "feat" },
  { file: "rules.json", type: "rule" },
] as const;

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding SRD 5.1 content...\n");

  async function ensureSource(
    name: string,
    type: ContentSourceType,
  ): Promise<typeof schema.contentSources.$inferSelect> {
    let [source] = await db
      .select()
      .from(schema.contentSources)
      .where(eq(schema.contentSources.name, name))
      .limit(1);

    if (!source) {
      [source] = await db
        .insert(schema.contentSources)
        .values({ name, type })
        .returning();
      console.log(`Created content source: ${name}.`);
    } else {
      console.log(`Content source already exists: ${name}.`);
    }

    if (!source) throw new Error(`Unable to ensure content source "${name}"`);
    return source;
  }

  async function upsertEntries(
    sourceId: string,
    type: (typeof schema.contentTypeEnum.enumValues)[number],
    entries: SrdEntry[],
    label = type,
  ) {
    let created = 0;
    let updated = 0;

    for (const entry of entries) {
      const validation = validateContentData(type, entry.data);
      if (!validation.success) {
        throw new Error(
          `Invalid ${type} "${entry.slug}": ${validation.errors.join("; ")}`,
        );
      }

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
            data: validation.data as Record<string, unknown>,
            metadata: entry.metadata ?? null,
            isActive: entry.isActive ?? true,
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
          data: validation.data as Record<string, unknown>,
          metadata: entry.metadata ?? null,
          isActive: entry.isActive ?? true,
        });
        created++;
      }
    }

    console.log(`  ${label}: ${created} created, ${updated} updated (${entries.length} total)`);
  }

  function readJsonFromPath<T>(filePath: string): T {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  }

  function readJsonIfExistsFromPath<T>(filePath: string): T | null {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  }

  // ── Ensure SRD source exists ─────────────────────────────────────────────
  const source = await ensureSource("SRD 5.1", "official");
  const sourceId = source.id;
  console.log("Seeding SRD 5.1...");

  // ── Load and seed each content type ─────────────────────────────────────
  const racesFile = readJson<SrdEntry[]>("races.json");

  // Entries with parent_race in data are subraces; others are races
  const races = racesFile.filter((r) => !r.data["parent_race"]);
  const subraces = racesFile.filter((r) => !!r.data["parent_race"]);

  await upsertEntries(sourceId, "race", races);
  if (subraces.length > 0) await upsertEntries(sourceId, "subrace", subraces);

  const classes = readJson<SrdEntry[]>("classes.json");
  await upsertEntries(sourceId, "class", classes);

  const subclasses = readJsonIfExists<SrdEntry[]>("subclasses.json");
  if (subclasses && subclasses.length > 0) {
    await upsertEntries(sourceId, "subclass", subclasses);
  }

  const backgrounds = readJson<SrdEntry[]>("backgrounds.json");
  await upsertEntries(sourceId, "background", backgrounds);

  const spells = readJson<SrdEntry[]>("spells.json");

  // Inject extra class→spell associations from books (e.g. Tasha's
  // Artificer spell list, which lives in data/books/<book>/spell-lists.json
  // as { <classSlug>: [spellSlug, ...] }). We mutate in-place so the
  // upsert below persists the merged classes array.
  if (existsSync(BOOKS_DIR)) {
    const bundleDirs = readdirSync(BOOKS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(BOOKS_DIR, d.name));
    const bySlug = new Map(spells.map((s) => [s.slug, s]));
    for (const dir of bundleDirs) {
      const lists = readJsonIfExistsFromPath<Record<string, string[]>>(
        join(dir, "spell-lists.json"),
      );
      if (!lists) continue;
      for (const [classSlug, spellSlugs] of Object.entries(lists)) {
        for (const spellSlug of spellSlugs) {
          const spell = bySlug.get(spellSlug);
          if (!spell) continue;
          const current = (spell.data["classes"] as string[] | undefined) ?? [];
          if (!current.includes(classSlug)) {
            spell.data["classes"] = [...current, classSlug];
          }
        }
      }
    }
  }

  await upsertEntries(sourceId, "spell", spells);

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
  await upsertEntries(sourceId, "item", mergedItems);

  const monsters = readJsonIfExists<SrdEntry[]>("monsters.json");
  if (monsters && monsters.length > 0) {
    await upsertEntries(sourceId, "monster", monsters);
  }

  const conditions = readJsonIfExists<SrdEntry[]>("conditions.json");
  if (conditions && conditions.length > 0) {
    await upsertEntries(sourceId, "condition", conditions);
  }

  const feats = readJson<SrdEntry[]>("feats.json");
  await upsertEntries(sourceId, "feat", feats);

  // ── Seed local book bundles ──────────────────────────────────────────────
  if (!existsSync(BOOKS_DIR)) {
    console.log("\nNo local book bundles found.");
  } else {
    const bundleDirs = readdirSync(BOOKS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(BOOKS_DIR, entry.name))
      .filter((dir) => existsSync(join(dir, "manifest.json")));

    if (bundleDirs.length === 0) {
      console.log("\nNo local book bundles found.");
    } else {
      console.log(`\nSeeding local book bundles (${bundleDirs.length})...`);
    }

    for (const bundleDir of bundleDirs) {
      const manifest = readJsonFromPath<LocalBookManifest>(
        join(bundleDir, "manifest.json"),
      );
      const sourceType = manifest.type ?? "official";
      const bookSource = await ensureSource(manifest.name, sourceType);

      console.log(`\nBundle: ${manifest.name}`);
      let processedFiles = 0;

      for (const { file, type } of LOCAL_BOOK_FILE_MAP) {
        const entries = readJsonIfExistsFromPath<SrdEntry[]>(
          join(bundleDir, file),
        );
        if (!entries || entries.length === 0) continue;

        await upsertEntries(bookSource.id, type, entries, `${manifest.name} :: ${file}`);
        processedFiles++;
      }

      if (processedFiles === 0) {
        console.log("  No seedable JSON files found in this bundle.");
      }
    }
  }

  console.log("\nSeed complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
