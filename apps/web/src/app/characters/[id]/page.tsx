import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CHARACTER_QUERY } from "@/lib/graphql";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import type { Character } from "@dnd/shared";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCharacter(id: string, token: string): Promise<Character | null> {
  try {
    const client = getGqlClient(token);
    const data = await client.request<{ character: Character | null }>(CHARACTER_QUERY, { id });
    return data.character;
  } catch {
    return null;
  }
}

export default async function CharacterPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const character = await getCharacter(id, token);

  if (!character) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in">
      <CharacterSheet character={character} token={token} />
    </div>
  );
}
