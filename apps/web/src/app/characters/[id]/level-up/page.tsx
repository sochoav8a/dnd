import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CHARACTER_QUERY, CONTENT_ITEMS_QUERY } from "@/lib/graphql";
import type { Character, ContentItem } from "@dnd/shared";
import { LevelUpWizard } from "@/components/character/LevelUpWizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LevelUpPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const client = getGqlClient(token);

  const [charRes, subRes, featRes, spellRes] = await Promise.all([
    client.request<{ character: Character | null }>(CHARACTER_QUERY, { id }),
    client.request<{ contentItems: ContentItem[] }>(CONTENT_ITEMS_QUERY, { type: "subclass" }),
    client.request<{ contentItems: ContentItem[] }>(CONTENT_ITEMS_QUERY, { type: "feat" }),
    client.request<{ contentItems: ContentItem[] }>(CONTENT_ITEMS_QUERY, { type: "spell" }),
  ]);

  if (!charRes.character) notFound();

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/characters/${id}`}
          className="inline-flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-parchment-300"
        >
          ← Volver a la hoja
        </Link>
      </div>
      <LevelUpWizard
        character={charRes.character}
        subclasses={subRes.contentItems}
        feats={featRes.contentItems}
        spells={spellRes.contentItems}
        token={token}
      />
    </div>
  );
}
