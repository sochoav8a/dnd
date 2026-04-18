import Link from "next/link";
import type { CharacterState, ComputedCharacter } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";
import { HpBar } from "@/components/ui/HpBar";
import { absoluteUploadUrl } from "@/lib/graphql";

interface Props {
  character: {
    id: string;
    name: string;
    level: number;
    portraitUrl?: string | null;
    race: { name: string; slug: string };
    class: { name: string; slug: string };
    background: { name: string };
    state?: CharacterState;
    computed: ComputedCharacter;
  };
}

export function CharacterCard({ character }: Props) {
  const { computed, state } = character;
  const portrait = absoluteUploadUrl(character.portraitUrl ?? null);
  const hpMax = computed?.maxHp ?? 0;
  const hpCurrent = state?.hp?.current ?? hpMax;
  const hpTemp = state?.hp?.temp ?? 0;

  return (
    <Link
      href={`/characters/${character.id}`}
      className="card group relative block animate-fade-in overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-parchment-600/40 hover:shadow-glow"
    >
      {/* Level badge — top-right corner */}
      <span className="badge-primary absolute right-3 top-3 z-10 px-2 py-0.5 text-[10px] tracking-wide">
        Nv {character.level}
      </span>

      <div className="flex items-start gap-4">
        {/* Portrait / icon */}
        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-parchment-800/40 bg-gradient-to-br from-stone-800 to-stone-950 text-parchment-400 shadow-inset">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portrait}
              alt={character.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <GameIcon kind="class" slug={character.class.slug} size={30} />
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1 pr-12">
          <h3 className="truncate font-display text-lg font-semibold text-stone-100 transition-colors group-hover:text-parchment-300">
            {character.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[13px] text-stone-400">
            <GameIcon
              kind="race"
              slug={character.race.slug}
              size={13}
              className="text-stone-500"
            />
            <span>{character.race.name}</span>
            <span className="text-stone-700">·</span>
            <span className="text-parchment-400/90">{character.class.name}</span>
          </p>
          <p className="mt-0.5 truncate font-serif text-xs italic text-stone-500">
            {character.background.name}
          </p>
        </div>
      </div>

      {/* HP bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between text-[10px] font-medium uppercase tracking-[0.1em]">
          <span className="text-stone-500">Vida</span>
          <span className="font-mono text-stone-300">
            {hpCurrent}
            <span className="text-stone-600">/{hpMax}</span>
            {hpTemp > 0 && <span className="ml-1 text-blue-300">+{hpTemp}</span>}
          </span>
        </div>
        <HpBar current={hpCurrent} max={hpMax || 1} temp={hpTemp} size="sm" />
      </div>

      {/* Divider */}
      <div className="divider mt-3 opacity-60" />

      {/* Stats */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <StatPill label="CA" value={computed?.ac ?? "—"} />
        <StatPill label="Init" value={formatBonus(computed?.initiative)} />
        <StatPill
          label="Vel"
          value={computed?.speed ? `${computed.speed}` : "—"}
        />
        <StatPill label="Perc" value={computed?.passivePerception ?? "—"} />
      </div>
    </Link>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-block py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-stone-100">{value}</span>
    </div>
  );
}

function formatBonus(value: number | undefined): string {
  if (value === undefined) return "—";
  return value >= 0 ? `+${value}` : String(value);
}
