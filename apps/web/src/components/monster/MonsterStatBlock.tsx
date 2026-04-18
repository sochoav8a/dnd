"use client";

import type { MonsterData } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";

interface Props {
  name: string;
  data: MonsterData;
  compact?: boolean;
}

export function formatCR(cr: number): string {
  if (cr === 0) return "0";
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

export function formatMod(v: number): string {
  return v >= 0 ? `+${v}` : String(v);
}

export function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function speedString(speed: MonsterData["speed"]): string {
  const parts: string[] = [];
  if (speed.walk !== undefined && speed.walk > 0) parts.push(`${speed.walk} ft`);
  if (speed.fly !== undefined && speed.fly > 0) parts.push(`volar ${speed.fly} ft${speed.hover ? " (hover)" : ""}`);
  if (speed.swim !== undefined && speed.swim > 0) parts.push(`nadar ${speed.swim} ft`);
  if (speed.climb !== undefined && speed.climb > 0) parts.push(`trepar ${speed.climb} ft`);
  if (speed.burrow !== undefined && speed.burrow > 0) parts.push(`excavar ${speed.burrow} ft`);
  return parts.join(", ") || "—";
}

function sensesString(senses: MonsterData["senses"]): string {
  const parts: string[] = [];
  if (senses.darkvision) parts.push(`visión oscura ${senses.darkvision} ft`);
  if (senses.blindsight) parts.push(`visión ciega ${senses.blindsight} ft`);
  if (senses.tremorsense) parts.push(`sentido de temblores ${senses.tremorsense} ft`);
  if (senses.truesight) parts.push(`visión verdadera ${senses.truesight} ft`);
  parts.push(`percepción pasiva ${senses.passive_perception}`);
  return parts.join(", ");
}

const ABILITY_ORDER: Array<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"> = [
  "STR", "DEX", "CON", "INT", "WIS", "CHA",
];

export function MonsterStatBlock({ name, data, compact }: Props) {
  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-900 ${compact ? "p-3" : "p-5"}`}>
      {/* Header */}
      <div className="border-b-2 border-parchment-500/40 pb-2">
        <h2 className={`font-serif font-bold text-parchment-300 ${compact ? "text-lg" : "text-2xl"}`}>
          {name}
        </h2>
        <p className="text-xs italic text-stone-400">
          {data.size} {data.type}
          {data.subtype ? ` (${data.subtype})` : ""}, {data.alignment}
        </p>
      </div>

      {/* Core stats */}
      <div className="space-y-0.5 border-b-2 border-parchment-500/40 py-2 text-sm text-stone-300">
        <Line label="Clase de armadura" value={`${data.ac}${data.ac_source ? ` (${data.ac_source})` : ""}`} />
        <Line label="Puntos de golpe" value={`${data.hp.average} (${data.hp.roll})`} />
        <Line label="Velocidad" value={speedString(data.speed)} />
      </div>

      {/* Ability scores grid */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 border-b-2 border-parchment-500/40 py-2 text-center text-xs sm:grid-cols-6">
        {ABILITY_ORDER.map((ab) => {
          const score = data.ability_scores[ab];
          const m = mod(score);
          return (
            <div key={ab}>
              <div className="flex items-center justify-center gap-1 font-semibold text-parchment-300">
                <GameIcon kind="ability" slug={ab} size={10} />
                {ab}
              </div>
              <div className="font-mono text-stone-200">
                {score} ({formatMod(m)})
              </div>
            </div>
          );
        })}
      </div>

      {/* Details */}
      <div className="space-y-0.5 border-b-2 border-parchment-500/40 py-2 text-sm text-stone-300">
        {data.saving_throws && Object.keys(data.saving_throws).length > 0 && (
          <Line
            label="Tiradas de salvación"
            value={Object.entries(data.saving_throws)
              .map(([ab, v]) => `${ab} ${formatMod(v)}`)
              .join(", ")}
          />
        )}
        {data.skills && Object.keys(data.skills).length > 0 && (
          <Line
            label="Habilidades"
            value={Object.entries(data.skills)
              .map(([s, v]) => `${s} ${formatMod(v)}`)
              .join(", ")}
          />
        )}
        {data.damage_vulnerabilities && data.damage_vulnerabilities.length > 0 && (
          <Line label="Vulnerabilidades" value={data.damage_vulnerabilities.join(", ")} />
        )}
        {data.damage_resistances && data.damage_resistances.length > 0 && (
          <Line label="Resistencias" value={data.damage_resistances.join(", ")} />
        )}
        {data.damage_immunities && data.damage_immunities.length > 0 && (
          <Line label="Inmunidades a daño" value={data.damage_immunities.join(", ")} />
        )}
        {data.condition_immunities && data.condition_immunities.length > 0 && (
          <Line label="Inmunidades a condición" value={data.condition_immunities.join(", ")} />
        )}
        <Line label="Sentidos" value={sensesString(data.senses)} />
        <Line label="Idiomas" value={data.languages.length > 0 ? data.languages.join(", ") : "—"} />
        <Line
          label="Desafío"
          value={`${formatCR(data.challenge_rating)} (${data.xp.toLocaleString()} PX)`}
        />
        <Line label="Bono de competencia" value={formatMod(data.proficiency_bonus)} />
      </div>

      {/* Special abilities */}
      {data.special_abilities && data.special_abilities.length > 0 && (
        <Section title={null}>
          {data.special_abilities.map((a, i) => (
            <Entry key={i} name={a.name} description={a.description} />
          ))}
        </Section>
      )}

      {/* Actions */}
      {data.actions && data.actions.length > 0 && (
        <Section title="Acciones">
          {data.actions.map((a, i) => (
            <Entry
              key={i}
              name={a.name}
              description={a.description}
              {...(a.attack_bonus !== undefined ? { attack: a.attack_bonus } : {})}
              {...(a.damage !== undefined ? { damage: a.damage } : {})}
            />
          ))}
        </Section>
      )}

      {/* Reactions */}
      {data.reactions && data.reactions.length > 0 && (
        <Section title="Reacciones">
          {data.reactions.map((r, i) => (
            <Entry key={i} name={r.name} description={r.description} />
          ))}
        </Section>
      )}

      {/* Legendary actions */}
      {data.legendary_actions && data.legendary_actions.length > 0 && (
        <Section title="Acciones legendarias">
          {data.legendary_actions.map((a, i) => (
            <Entry
              key={i}
              name={a.name}
              description={a.description}
              {...(a.cost !== undefined ? { cost: a.cost } : {})}
              {...(a.attack_bonus !== undefined ? { attack: a.attack_bonus } : {})}
              {...(a.damage !== undefined ? { damage: a.damage } : {})}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-semibold text-parchment-300">{label}.</span>{" "}
      <span className="text-stone-300">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 py-2">
      {title && (
        <h3 className="border-b border-parchment-500/30 pb-0.5 font-serif text-base font-bold text-parchment-300">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Entry({
  name,
  description,
  attack,
  damage,
  cost,
}: {
  name: string;
  description: string;
  attack?: number;
  damage?: Array<{ damage_dice: string; damage_type: string }>;
  cost?: number;
}) {
  return (
    <div className="text-sm">
      <span className="font-semibold italic text-stone-100">
        {name}
        {cost ? ` (costa ${cost} acciones)` : ""}.
      </span>{" "}
      {attack !== undefined && (
        <span className="text-stone-400">
          <em>Ataque:</em> {formatMod(attack)} al ataque.{" "}
        </span>
      )}
      {damage && damage.length > 0 && (
        <span className="text-stone-400">
          <em>Daño:</em>{" "}
          {damage.map((d, i) => (
            <span key={i}>
              {i > 0 ? " + " : ""}
              {d.damage_dice} <span className="text-stone-500">{d.damage_type}</span>
            </span>
          ))}
          .{" "}
        </span>
      )}
      <span className="text-stone-300 whitespace-pre-wrap">{description}</span>
    </div>
  );
}
