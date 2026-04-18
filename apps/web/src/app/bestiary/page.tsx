import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { MonsterData } from "@dnd/shared";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CONTENT_ITEMS_QUERY } from "@/lib/graphql";
import { BestiaryClient, type MonsterListItem } from "@/components/monster/BestiaryClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameIcon } from "@/components/ui/GameIcon";

interface RawContentItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  data: MonsterData;
}

async function getMonsters(token: string): Promise<MonsterListItem[]> {
  try {
    const client = getGqlClient(token);
    const data = await client.request<{ contentItems: RawContentItem[] }>(
      CONTENT_ITEMS_QUERY,
      { type: "monster" },
    );
    return data.contentItems
      .filter((m) => m.data && typeof m.data === "object")
      .map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        data: m.data,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function BestiaryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const monsters = await getMonsters(token);

  const subtitle = (
    <span className="font-serif italic">
      {monsters.length} criatura{monsters.length !== 1 ? "s" : ""} catalogada
      {monsters.length !== 1 ? "s" : ""} del SRD.
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        variant="hero"
        icon={<GameIcon kind="raw" slug="animal-skull" size={28} />}
        title="Bestiario"
        subtitle={subtitle}
      />

      {monsters.length === 0 ? (
        <EmptyState
          icon={<GameIcon kind="raw" slug="animal-skull" size={32} />}
          title="Sin criaturas"
          description="No se pudieron cargar los monstruos del compendio."
        />
      ) : (
        <BestiaryClient monsters={monsters} />
      )}
    </div>
  );
}
