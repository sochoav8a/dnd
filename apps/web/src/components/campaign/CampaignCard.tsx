import Link from "next/link";
import { GameIcon } from "@/components/ui/GameIcon";

interface Props {
  campaign: {
    id: string;
    name: string;
    inviteCode: string | null;
    dm: { username: string };
    members: Array<{ user: { username: string }; role: string }>;
    characters: Array<{ name: string; level: number; class: { name: string } }>;
  };
  /** Username of the current viewer — used to decorate the DM line. */
  viewerUsername?: string | undefined;
}

export function CampaignCard({ campaign, viewerUsername }: Props) {
  const playerCount = campaign.members.length;
  const charCount = campaign.characters.length;
  const isDm = viewerUsername && campaign.dm.username === viewerUsername;

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="card group relative block animate-fade-in overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-parchment-600/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-parchment-800/40 bg-gradient-to-br from-stone-800 to-stone-950 text-parchment-400 shadow-inset">
            <GameIcon kind="raw" slug="scroll-quill" size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-stone-100 transition-colors group-hover:text-parchment-300">
              {campaign.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
              <span className="text-stone-500">DM</span>
              <span className="font-medium text-stone-300">
                {campaign.dm.username}
              </span>
              {isDm && (
                <span className="badge-primary px-1.5 py-0 text-[9px]">tú</span>
              )}
            </p>
          </div>
        </div>

        {campaign.inviteCode && (
          <span
            title="Código de invitación"
            className="shrink-0 rounded border border-stone-700 bg-stone-950/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-parchment-400/90 shadow-inset"
          >
            {campaign.inviteCode}
          </span>
        )}
      </div>

      <div className="divider mt-3 opacity-60" />

      {/* Inline stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <GameIcon kind="raw" slug="backup" size={13} className="text-stone-500" />
          <span className="font-mono text-stone-200">{playerCount}</span>
          <span className="text-stone-500">
            jugador{playerCount !== 1 ? "es" : ""}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GameIcon kind="raw" slug="crossed-swords" size={13} className="text-stone-500" />
          <span className="font-mono text-stone-200">{charCount}</span>
          <span className="text-stone-500">
            personaje{charCount !== 1 ? "s" : ""}
          </span>
        </span>
      </div>

      {charCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {campaign.characters.slice(0, 4).map((char, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-stone-700/70 bg-stone-900/80 px-2 py-0.5 text-[11px] text-stone-300"
            >
              <span className="font-medium">{char.name}</span>
              <span className="text-stone-500">
                Nv{char.level} · {char.class.name}
              </span>
            </span>
          ))}
          {charCount > 4 && (
            <span className="self-center text-[11px] italic text-stone-500">
              +{charCount - 4} más
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
