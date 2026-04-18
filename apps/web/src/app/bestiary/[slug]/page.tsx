import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { MonsterData } from "@dnd/shared";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CONTENT_ITEMS_QUERY } from "@/lib/graphql";
import { MonsterStatBlock } from "@/components/monster/MonsterStatBlock";
import { GameIcon } from "@/components/ui/GameIcon";
import { StatCard } from "@/components/ui/StatCard";

interface RawContentItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  data: MonsterData;
}

async function getMonster(
  token: string,
  slug: string,
): Promise<RawContentItem | null> {
  try {
    const client = getGqlClient(token);
    const data = await client.request<{ contentItems: RawContentItem[] }>(
      CONTENT_ITEMS_QUERY,
      { type: "monster" },
    );
    return data.contentItems.find((m) => m.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export default async function BestiaryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const monster = await getMonster(token, params.slug);

  if (!monster) notFound();

  const d = monster.data;
  const crLabel = formatCr(d.challenge_rating);

  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Subtle ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-parchment-900/10 via-transparent to-transparent blur-2xl"
      />

      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[11px] text-stone-500">
        <Link
          href="/bestiary"
          className="transition-colors hover:text-parchment-300"
        >
          ← Bestiario
        </Link>
        <span className="text-stone-700">›</span>
        <span className="text-stone-400">{monster.name}</span>
      </nav>

      {/* Tome header */}
      <header className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-parchment-500/80">
          <GameIcon kind="raw" slug="animal-skull" size={18} />
          <span className="font-serif text-[11px] uppercase tracking-[0.35em]">
            Folio del tomo
          </span>
          <GameIcon kind="raw" slug="animal-skull" size={18} />
        </div>
        <h1 className="font-display text-3xl font-semibold text-stone-100 sm:text-4xl">
          {monster.name}
        </h1>
        <p className="mt-1 font-serif text-sm italic text-stone-400">
          {d.size} · {d.type}
          {d.alignment ? ` · ${d.alignment}` : ""}
        </p>
      </header>

      {/* Quick-reference sidebar + stat block */}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 order-2 lg:order-1">
          <MonsterStatBlock name={monster.name} data={monster.data} />
        </div>

        <aside className="order-1 space-y-3 lg:order-2">
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <StatCard
              label="Desafío"
              value={<span className="font-mono">{crLabel}</span>}
              hint={typeof d.xp === "number" ? `${d.xp.toLocaleString()} XP` : undefined}
              icon={<GameIcon kind="raw" slug="animal-skull" size={12} />}
              tone="danger"
            />
            <StatCard
              label="Tipo"
              value={<span className="font-display text-base">{d.type}</span>}
              tone="default"
            />
            <StatCard
              label="Tamaño"
              value={<span className="font-display text-base">{d.size}</span>}
              tone="default"
            />
          </div>
          {d.alignment && (
            <div className="card-compact">
              <div className="label mb-1">Alineamiento</div>
              <div className="font-serif text-sm italic text-stone-300">
                {d.alignment}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function formatCr(cr: number | undefined | null): string {
  if (cr === undefined || cr === null) return "—";
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}
