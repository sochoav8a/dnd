"use client";

import { useState } from "react";
import type { SpellData } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";

export interface SpellLike {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  data: SpellData;
}

interface Props {
  spell: SpellLike;
  /** If provided, shows a selection circle and handles toggle. */
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  /** Start expanded (for "Hechizos preparados" read-only lists). */
  defaultOpen?: boolean;
}

const SCHOOL_LABEL: Record<string, string> = {
  abjuration: "Abjuración",
  conjuration: "Conjuración",
  divination: "Adivinación",
  enchantment: "Encantamiento",
  evocation: "Evocación",
  illusion: "Ilusión",
  necromancy: "Nigromancia",
  transmutation: "Transmutación",
};

export function SpellRow({ spell, selected, onToggle, disabled, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const d = spell.data;
  const hasToggle = typeof onToggle === "function";

  return (
    <div
      className={`rounded-lg border transition-all ${
        selected
          ? "border-parchment-500/70 bg-parchment-600/10 shadow-inset"
          : disabled
            ? "border-stone-800 opacity-40"
            : "border-stone-800 bg-stone-900/40 hover:border-stone-600 hover:bg-stone-900/70"
      }`}
    >
      {/* Top row: title + meta + expand + circle */}
      <div className="flex items-start gap-2 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-stone-500 hover:text-parchment-300"
          title={open ? "Ocultar descripción" : "Ver descripción"}
          aria-label={open ? "Ocultar descripción" : "Ver descripción"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`transition-transform ${open ? "rotate-90" : ""}`}>
            <path d="M2 1.5l5 3.5-5 3.5z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!disabled && hasToggle) onToggle!();
            else if (!hasToggle) setOpen((o) => !o);
          }}
          disabled={disabled && hasToggle}
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-stone-100">
            <GameIcon kind="school" slug={d.school} size={12} className="text-parchment-500/80" />
            <span className="font-display tracking-wide">{spell.name}</span>
            {d.concentration && (
              <span className="rounded bg-blue-900/50 px-1 text-[9px] font-semibold uppercase tracking-wider text-blue-300 ring-1 ring-inset ring-blue-700/40">C</span>
            )}
            {d.ritual && (
              <span className="rounded bg-purple-900/50 px-1 text-[9px] font-semibold uppercase tracking-wider text-purple-300 ring-1 ring-inset ring-purple-700/40">R</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 truncate text-[10px] text-stone-500">
            <span>{SCHOOL_LABEL[d.school] ?? d.school}</span>
            <span className="text-stone-700">·</span>
            <span>{d.casting_time}</span>
            <span className="text-stone-700">·</span>
            <span>{d.range}</span>
            <span className="text-stone-700">·</span>
            <span>{d.duration}</span>
            {d.damage && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-red-950/60 px-1 py-[1px] text-red-300 ring-1 ring-inset ring-red-900/50">
                <GameIcon kind="damage" slug={d.damage.type} size={9} />
                <strong className="font-mono">{d.damage.base}</strong>
                <span className="uppercase tracking-wide">{d.damage.type}</span>
              </span>
            )}
            {d.healing && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-950/60 px-1 py-[1px] text-emerald-300 ring-1 ring-inset ring-emerald-900/50">
                <strong className="font-mono">{d.healing.base}</strong>
                <span className="uppercase tracking-wide">curar</span>
              </span>
            )}
          </div>
        </button>

        {hasToggle && (
          <button
            type="button"
            onClick={() => !disabled && onToggle!()}
            disabled={disabled}
            className={`mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border transition-colors ${
              selected
                ? "border-parchment-500 bg-parchment-600"
                : disabled
                  ? "border-stone-800"
                  : "border-stone-600 hover:border-parchment-400"
            }`}
            aria-label={selected ? "Quitar hechizo" : "Añadir hechizo"}
          />
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-stone-800 bg-stone-950/70 px-3 py-2 text-xs text-stone-400">
          <div className="mb-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <Detail label="Nivel" value={d.level === 0 ? "Truco" : `Nv ${d.level}`} />
            <Detail label="Escuela" value={SCHOOL_LABEL[d.school] ?? d.school} />
            <Detail label="Lanzamiento" value={d.casting_time} />
            <Detail label="Alcance" value={d.range} />
            <Detail label="Duración" value={d.duration} />
            <Detail
              label="Componentes"
              value={
                [d.components.V ? "V" : null, d.components.S ? "S" : null, d.components.M ? "M" : null]
                  .filter(Boolean)
                  .join(", ") + (d.components.M ? ` (${d.components.M})` : "")
              }
            />
            {d.concentration && <Detail label="Concentración" value="Sí" />}
            {d.ritual && <Detail label="Ritual" value="Sí" />}
          </div>

          {(d.damage || d.healing) && (
            <div className="mt-1 flex flex-wrap gap-3 border-t border-stone-800 pt-1.5">
              {d.damage && (
                <div className="flex items-center gap-1 text-red-300">
                  <GameIcon kind="damage" slug={d.damage.type} size={12} />
                  <span>
                    <strong className="font-mono">{d.damage.base}</strong>{" "}
                    <span className="uppercase tracking-wide text-[10px]">{d.damage.type}</span>
                    {d.damage.higher_levels && (
                      <span className="text-stone-500">
                        {" · "}Niveles superiores: {d.damage.higher_levels}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {d.healing && (
                <div className="text-emerald-300">
                  <strong className="font-mono">{d.healing.base}</strong>{" "}
                  <span className="uppercase tracking-wide text-[10px]">curación</span>
                  {d.healing.higher_levels && (
                    <span className="text-stone-500">
                      {" · "}Niveles superiores: {d.healing.higher_levels}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="mt-2 font-serif leading-relaxed whitespace-pre-wrap text-stone-300">
            {d.description}
          </p>

          {d.classes?.length > 0 && (
            <p className="mt-2 text-[10px] text-stone-600">
              Clases: {d.classes.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-stone-600">{label}:</span>
      <span className="text-stone-300">{value}</span>
    </div>
  );
}
