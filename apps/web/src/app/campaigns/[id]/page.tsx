import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getGqlClient, CAMPAIGN_DETAIL_QUERY } from "@/lib/graphql";
import { CampaignActions } from "@/components/campaign/CampaignActions";
import { AddPlayerPanel } from "@/components/campaign/AddPlayerPanel";
import { RemovePlayerButton } from "@/components/campaign/RemovePlayerButton";
import { QuickCreateCharacterPanel } from "@/components/campaign/QuickCreateCharacterPanel";
import { CharacterCard } from "@/components/character/CharacterCard";
import { GameIcon } from "@/components/ui/GameIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { OrnateDivider } from "@/components/ui/OrnateDivider";

interface Member {
  user: { id: string; username: string; email: string };
  role: string;
  joinedAt: string;
}

interface PartyCharacter {
  id: string;
  name: string;
  level: number;
  portraitUrl: string | null;
  race: { id: string; name: string; slug: string };
  class: { id: string; name: string; slug: string };
  background: { id: string; name: string };
  computed: { ac: number; maxHp: number; initiative: number; passivePerception: number };
}

interface Encounter {
  id: string;
  name: string;
  status: "prep" | "active" | "completed";
  round: number;
  createdAt: string;
  participants: Array<{ id: string }>;
}

interface Campaign {
  id: string;
  name: string;
  inviteCode: string | null;
  createdAt: string;
  dm: { id: string; username: string; email: string };
  members: Member[];
  characters: PartyCharacter[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<Encounter["status"], string> = {
  prep: "Preparación",
  active: "Activo",
  completed: "Completado",
};
const STATUS_BADGE: Record<Encounter["status"], string> = {
  prep: "badge-neutral",
  active: "badge-success",
  completed: "badge-neutral opacity-60",
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const userId = (session.user as { id?: string } | undefined)?.id;

  let campaign: Campaign | null = null;
  let encounters: Encounter[] = [];
  try {
    const data = await getGqlClient(token).request<{
      campaign: Campaign | null;
      encounters: Encounter[];
    }>(CAMPAIGN_DETAIL_QUERY, { id });
    campaign = data.campaign;
    encounters = data.encounters;
  } catch {
    notFound();
  }

  if (!campaign) notFound();

  const isDm = !!userId && campaign.dm.id === userId;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        variant="hero"
        breadcrumbs={[
          { href: "/campaigns", label: "← Campañas" },
        ]}
        icon={<GameIcon kind="raw" slug="scroll-quill" size={28} />}
        title={campaign.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 font-serif italic">
            <GameIcon kind="raw" slug="wizard-staff" size={13} className="text-parchment-500" />
            <span>DM:</span>
            <span className="font-display not-italic text-stone-200">
              {campaign.dm.username}
            </span>
            {isDm && <span className="badge-primary">Tú</span>}
          </span>
        }
        actions={
          <CampaignActions
            campaignId={campaign.id}
            inviteCode={campaign.inviteCode}
            isDm={isDm}
          />
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Jugadores"
          value={campaign.members.length}
          icon={<GameIcon kind="raw" slug="hood" size={12} />}
          tone="default"
        />
        <StatCard
          label="Personajes"
          value={campaign.characters.length}
          icon={<GameIcon kind="raw" slug="swords-emblem" size={12} />}
          tone="primary"
        />
        <StatCard
          label="Encuentros"
          value={encounters.length}
          icon={<GameIcon kind="raw" slug="crossed-swords" size={12} />}
          tone="default"
        />
      </div>

      {/* Party */}
      <section className="space-y-3">
        <SectionTitle icon={<GameIcon kind="raw" slug="swords-emblem" size={16} />}>
          Partida
        </SectionTitle>
        <OrnateDivider />
        {campaign.characters.length === 0 ? (
          <div className="card-ghost py-10 text-center">
            <p className="font-serif text-sm italic text-stone-500">
              El pergamino aún aguarda a sus héroes.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {campaign.characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={{
                  id: c.id,
                  name: c.name,
                  level: c.level,
                  race: c.race,
                  class: c.class,
                  background: c.background,
                  computed: c.computed as unknown as import("@dnd/shared").ComputedCharacter,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section className="card space-y-3">
        <SectionTitle icon={<GameIcon kind="raw" slug="hood" size={16} />}>
          Miembros
        </SectionTitle>
        <ul className="divide-y divide-stone-800">
          {campaign.members.map((m) => (
            <li
              key={m.user.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-stone-800 bg-stone-950 text-parchment-400 shadow-inset">
                  <GameIcon
                    kind="raw"
                    slug={m.role === "dm" ? "wizard-staff" : "hood"}
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm text-stone-100">
                    {m.user.username}
                  </div>
                  <div className="truncate text-[11px] text-stone-500">
                    {m.user.email}
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span
                  className={m.role === "dm" ? "badge-primary" : "badge-neutral"}
                >
                  {m.role === "dm" ? "DM" : "Jugador"}
                </span>
                {isDm && m.role !== "dm" && (
                  <RemovePlayerButton
                    campaignId={campaign.id}
                    userId={m.user.id}
                    username={m.user.username}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* DM-only: add player */}
      {isDm && <AddPlayerPanel campaignId={campaign.id} />}

      {/* DM-only: quick create test character */}
      {isDm && (
        <QuickCreateCharacterPanel
          campaignId={campaign.id}
          members={campaign.members}
        />
      )}

      {/* Encounters */}
      <section className="space-y-3">
        <SectionTitle
          icon={<GameIcon kind="raw" slug="crossed-swords" size={16} />}
          action={
            isDm ? (
              <Link
                href="/dm/encounters"
                className="text-xs text-parchment-400 transition-colors hover:text-parchment-300"
              >
                Administrar →
              </Link>
            ) : undefined
          }
        >
          Encuentros
        </SectionTitle>
        <OrnateDivider />
        {encounters.length === 0 ? (
          <div className="card-ghost py-10 text-center">
            <p className="font-serif text-sm italic text-stone-500">
              {isDm
                ? "El tablero está vacío. Forja el primer encuentro."
                : "El DM aún no ha preparado encuentros."}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {encounters.map((e) => {
              const href = isDm ? `/dm/encounters/${e.id}` : `/campaigns/${campaign.id}`;
              return (
                <Link
                  key={e.id}
                  href={href}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-3 transition-all hover:-translate-y-0.5 hover:border-parchment-800/50 hover:shadow-elevated"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-stone-800 bg-stone-950 text-parchment-400 shadow-inset">
                      <GameIcon kind="raw" slug="crossed-swords" size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm text-stone-100 group-hover:text-parchment-200">
                        {e.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-500">
                        <span>{e.participants.length} participantes</span>
                        {e.status === "active" && (
                          <>
                            <span className="text-stone-700">·</span>
                            <span className="font-mono text-emerald-400">
                              Ronda {e.round}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={STATUS_BADGE[e.status]}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
