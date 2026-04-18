import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CHARACTERS_QUERY } from "@/lib/graphql";
import Link from "next/link";
import { CharacterCard } from "@/components/character/CharacterCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameIcon } from "@/components/ui/GameIcon";
import type { CharacterState, ComputedCharacter } from "@dnd/shared";

interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  portraitUrl: string | null;
  race: { name: string; slug: string };
  class: { name: string; slug: string };
  background: { name: string };
  state: CharacterState;
  computed: ComputedCharacter;
}

async function getCharacters(token: string): Promise<CharacterSummary[]> {
  try {
    const client = getGqlClient(token);
    const data = await client.request<{ characters: CharacterSummary[] }>(CHARACTERS_QUERY);
    return data.characters;
  } catch {
    return [];
  }
}

export default async function CharactersPage() {
  const session = await getServerSession(authOptions);
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const characters = await getCharacters(token);

  const count = characters.length;
  const subtitle = (
    <span className="font-serif italic">
      {count === 0
        ? "El registro aguarda a su primera entrada."
        : `${count} héroe${count !== 1 ? "s" : ""} en tu registro.`}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        variant="hero"
        icon={<GameIcon kind="class" slug="rogue" size={28} />}
        title="Tus personajes"
        subtitle={subtitle}
        actions={
          <Link href="/characters/new" className="btn-primary">
            + Crear personaje
          </Link>
        }
      />

      {characters.length === 0 ? (
        <EmptyState
          icon={<GameIcon kind="class" slug="rogue" size={32} />}
          title="Tu historia empieza aquí"
          description="Crea tu primer personaje y empieza a aventurarte en tierras que aún no tienen nombre."
          action={
            <Link href="/characters/new" className="btn-primary">
              Crear personaje
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}
    </div>
  );
}
