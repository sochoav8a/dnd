"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MonsterData } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";
import { formatCR } from "@/components/monster/MonsterStatBlock";

export interface MonsterListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  data: MonsterData;
}

interface Props {
  monsters: MonsterListItem[];
}

const SIZE_OPTIONS = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const;

// A selection of common CR values present in the SRD
const CR_OPTIONS = [
  { value: "0", label: "0" },
  { value: "0.125", label: "1/8" },
  { value: "0.25", label: "1/4" },
  { value: "0.5", label: "1/2" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "13", label: "13" },
  { value: "14", label: "14" },
  { value: "15", label: "15" },
  { value: "16", label: "16" },
  { value: "17", label: "17" },
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20", label: "20" },
  { value: "21+", label: "21+" },
];

const RENDER_LIMIT = 120;

export function BestiaryClient({ monsters }: Props) {
  const [search, setSearch] = useState("");
  const [cr, setCr] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [size, setSize] = useState<string>("");

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    for (const m of monsters) {
      if (m.data?.type) set.add(m.data.type.toLowerCase());
    }
    return Array.from(set).sort();
  }, [monsters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monsters.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (type && m.data.type?.toLowerCase() !== type) return false;
      if (size && m.data.size !== size) return false;
      if (cr) {
        if (cr === "21+") {
          if (m.data.challenge_rating < 21) return false;
        } else {
          const crNum = parseFloat(cr);
          if (m.data.challenge_rating !== crNum) return false;
        }
      }
      return true;
    });
  }, [monsters, search, cr, type, size]);

  const visible = filtered.slice(0, RENDER_LIMIT);
  const truncated = filtered.length > RENDER_LIMIT;
  const hasFilters = Boolean(search || cr || type || size);

  return (
    <div className="space-y-4">
      {/* Sticky toolbar */}
      <div className="sticky top-2 z-20">
        <div className="card overflow-visible border-parchment-900/40 shadow-elevated backdrop-blur-md">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
            {/* Search */}
            <div>
              <label className="label mb-1.5" htmlFor="bestiary-search">
                Buscar
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-stone-500">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  id="bestiary-search"
                  className="input pl-8"
                  type="text"
                  placeholder="Nombre de la criatura..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="label mb-1.5" htmlFor="bestiary-type">
                Tipo
              </label>
              <select
                id="bestiary-type"
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Todos</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="label mb-1.5" htmlFor="bestiary-size">
                Tamaño
              </label>
              <select
                id="bestiary-size"
                className="input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="">Todos</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* CR */}
            <div>
              <label className="label mb-1.5" htmlFor="bestiary-cr">
                CR
              </label>
              <select
                id="bestiary-cr"
                className="input"
                value={cr}
                onChange={(e) => setCr(e.target.value)}
              >
                <option value="">Cualquiera</option>
                {CR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost h-[38px] whitespace-nowrap text-xs"
                onClick={() => {
                  setSearch("");
                  setCr("");
                  setType("");
                  setSize("");
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-stone-800/80 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
            <span>
              <span className="font-mono text-parchment-400/90">
                {filtered.length}
              </span>{" "}
              resultado{filtered.length !== 1 ? "s" : ""}
              {truncated && (
                <span className="ml-2 normal-case tracking-normal text-stone-500">
                  (primeros {RENDER_LIMIT})
                </span>
              )}
            </span>
            <span className="font-serif italic normal-case tracking-normal text-stone-600">
              Compendio SRD
            </span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-ghost flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-parchment-400 shadow-inset">
            <GameIcon kind="raw" slug="animal-skull" size={28} />
          </div>
          <h2 className="font-display text-lg text-stone-200">Sin resultados</h2>
          <p className="mt-1 max-w-sm text-sm text-stone-500">
            Ninguna criatura coincide con estos filtros. Prueba a aflojar la
            búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <MonsterCard key={m.id} monster={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MonsterCard({ monster }: { monster: MonsterListItem }) {
  const { data } = monster;
  const subline = [data.size, data.type].filter(Boolean).join(" ");
  const subtype = data.subtype ? ` (${data.subtype})` : "";

  return (
    <Link
      href={`/bestiary/${monster.slug}`}
      className="card group relative block animate-fade-in overflow-hidden border-stone-800/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-900/50 hover:bg-gradient-to-br hover:from-red-950/20 hover:to-stone-900/70"
    >
      {/* CR badge */}
      <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded border border-red-900/40 bg-red-950/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-300/90 shadow-inset">
        <span className="text-[9px] uppercase tracking-wider text-red-400/60">
          CR
        </span>
        {formatCR(data.challenge_rating)}
      </span>

      <div className="flex items-start gap-3 pr-14">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-stone-800 bg-gradient-to-br from-stone-800 to-stone-950 text-parchment-400/90 shadow-inset transition-colors group-hover:text-red-300/90">
          <GameIcon kind="raw" slug="animal-skull" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-parchment-200 transition-colors group-hover:text-parchment-100">
            {monster.name}
          </h3>
          <p className="mt-0.5 truncate font-serif text-xs italic text-stone-400">
            {subline}
            {subtype}
          </p>
        </div>
      </div>

      <div className="divider mt-3 opacity-60" />

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Stat label="PG" value={String(data.hp.average)} />
        <Stat label="CA" value={String(data.ac)} />
        <Stat label="XP" value={formatXp(data.xp)} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-block py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-stone-100">{value}</span>
    </div>
  );
}

function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toLocaleString("es", { maximumFractionDigits: 1 })}k`;
  return xp.toLocaleString("es");
}
