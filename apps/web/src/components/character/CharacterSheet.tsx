"use client";

import { useState } from "react";
import Link from "next/link";
import type { Character, ComputedCharacter } from "@dnd/shared";
import { ABILITIES, ABILITY_NAMES, CONDITIONS, CONDITION_DESCRIPTIONS } from "@dnd/shared";
import type { Skill } from "@dnd/shared";
import { SKILL_NAMES } from "@dnd/shared";
import {
  getGqlClient,
  UPDATE_CHARACTER_STATE_MUTATION,
  CONTENT_ITEMS_QUERY,
  SHORT_REST_MUTATION,
  LONG_REST_MUTATION,
  DELETE_CHARACTER_MUTATION,
  ADD_INVENTORY_ITEM_MUTATION,
  REMOVE_INVENTORY_ITEM_MUTATION,
  EQUIP_ITEM_MUTATION,
} from "@/lib/graphql";
import { GameIcon } from "@/components/ui/GameIcon";
import { StatCard } from "@/components/ui/StatCard";
import { HpBar } from "@/components/ui/HpBar";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { OrnateDivider } from "@/components/ui/OrnateDivider";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { SpellRow, type SpellLike } from "@/components/character/SpellRow";
import { DownloadPDFButton } from "@/components/character/pdf/DownloadPDFButton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type CharacterWithRelations = Character & {
  race?: { name: string; slug: string };
  subrace?: { name: string } | null;
  class?: { name: string; slug: string };
  subclass?: { name: string } | null;
  background?: { name: string };
  portraitUrl?: string | null;
};

type Tab = "stats" | "spells" | "inventory" | "features" | "notes";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "stats", label: "Estadísticas", icon: "stats" },
  { id: "spells", label: "Hechizos", icon: "spells" },
  { id: "inventory", label: "Inventario", icon: "inventory" },
  { id: "features", label: "Rasgos", icon: "features" },
  { id: "notes", label: "Notas", icon: "notes" },
];

interface Props {
  character: Character;
  token: string;
}

export function CharacterSheet({ character, token }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [localState, setLocalState] = useState(character.state);
  const [editOpen, setEditOpen] = useState(false);
  const computed = character.computed as ComputedCharacter;
  const char = character as unknown as CharacterWithRelations;

  async function saveState(patch: Partial<typeof localState>) {
    const next = { ...localState, ...patch };
    setLocalState(next);
    try {
      await getGqlClient(token).request(UPDATE_CHARACTER_STATE_MUTATION, {
        input: { characterId: character.id, state: next },
      });
    } catch {
      // Revert on failure
      setLocalState(localState);
    }
  }

  async function doShortRest(diceSpent: Array<{ die: number; roll: number }>) {
    const res = await getGqlClient(token).request<{
      shortRest: { state: typeof localState };
    }>(SHORT_REST_MUTATION, {
      input: { characterId: character.id, diceSpent },
    });
    setLocalState(res.shortRest.state);
    router.refresh();
  }

  async function doLongRest() {
    const res = await getGqlClient(token).request<{
      longRest: { state: typeof localState };
    }>(LONG_REST_MUTATION, { characterId: character.id });
    setLocalState(res.longRest.state);
    router.refresh();
  }

  async function deleteCharacter() {
    if (!confirm(`¿Borrar definitivamente ${character.name}? Esta acción no se puede deshacer.`)) return;
    await getGqlClient(token).request(DELETE_CHARACTER_MUTATION, { id: character.id });
    router.push("/characters");
    router.refresh();
  }

  const activeConditions = localState.conditions;
  const hasConcentration = !!localState.concentrating_on;

  return (
    <div className="space-y-5">
      {/* ───────── Hero Header ───────── */}
      <section className="card-hero relative overflow-hidden">
        {/* subtle ambient glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-glow opacity-60" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain opacity-60" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: portrait + identity */}
          <div className="flex items-start gap-5 min-w-0">
            <CharacterPortrait
              characterId={character.id}
              portraitUrl={char.portraitUrl ?? null}
              classSlug={char.class?.slug ?? ""}
              token={token}
              size={112}
            />
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-wide text-stone-100 text-balance">
                {character.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-300">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-parchment-800/50 bg-stone-900/70 px-2 py-0.5 font-display text-[11px] uppercase tracking-[0.14em] text-parchment-300">
                  Nivel {character.level}
                </span>
                {char.race && (
                  <span className="inline-flex items-center gap-1.5">
                    <GameIcon kind="race" slug={char.race.slug} size={14} className="text-stone-400" />
                    <span className="font-serif">
                      {char.race.name}
                      {char.subrace ? ` (${char.subrace.name})` : ""}
                    </span>
                  </span>
                )}
                {char.class && (
                  <span className="inline-flex items-center gap-1.5">
                    <GameIcon kind="class" slug={char.class.slug} size={14} className="text-parchment-400" />
                    <span className="font-serif">
                      {char.class.name}
                      {char.subclass ? <span className="text-stone-500"> — {char.subclass.name}</span> : null}
                    </span>
                  </span>
                )}
                {char.background && (
                  <span className="font-serif italic text-stone-500">· {char.background.name}</span>
                )}
              </div>

              {/* Status chips: concentration + active conditions */}
              {(hasConcentration || activeConditions.length > 0 || localState.exhaustion_level > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {hasConcentration && (
                    <span className="badge-magic animate-pulse-soft">
                      <GameIcon kind="raw" slug="crystal-ball" size={10} />
                      Concentración: {localState.concentrating_on}
                      <button
                        onClick={() => saveState({ concentrating_on: null })}
                        className="ml-1 text-ink-400 hover:text-ink-200"
                        title="Romper"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {activeConditions.map((c) => (
                    <span key={c} className="badge-warning">
                      <GameIcon kind="condition" slug={c} size={10} />
                      {c}
                    </span>
                  ))}
                  {localState.exhaustion_level > 0 && (
                    <span className="badge-danger">
                      Agotamiento · Nv {localState.exhaustion_level}
                    </span>
                  )}
                </div>
              )}

              {/* Action group */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {character.level < 20 && (
                  <Link
                    href={`/characters/${character.id}/level-up`}
                    className="btn-primary text-xs"
                  >
                    Subir a nivel {character.level + 1}
                  </Link>
                )}
                <RestControls
                  hitDice={localState.hit_dice}
                  onShortRest={doShortRest}
                  onLongRest={doLongRest}
                />
                <span className="h-4 w-px bg-stone-700" />
                <button
                  onClick={() => setEditOpen((o) => !o)}
                  className="btn-ghost text-xs"
                >
                  Editar
                </button>
                <DownloadPDFButton
                  character={char}
                  inventory={(character as unknown as { inventory?: Array<{ id: string; name: string; quantity: number; equipped: boolean; notes?: string | null }> }).inventory ?? []}
                  token={token}
                  className="btn-ghost text-xs"
                />
                <button
                  onClick={deleteCharacter}
                  className="btn-ghost text-xs text-red-400 hover:text-red-300"
                >
                  Borrar
                </button>
                {localState.inspiration && (
                  <span className="badge-primary ml-1">
                    <GameIcon kind="raw" slug="barbed-sun" size={10} />
                    Inspiración
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: HP tracker */}
          <div className="w-full max-w-sm lg:w-80 lg:shrink-0">
            <HpTracker
              current={localState.hp.current}
              max={localState.hp.max}
              temp={localState.hp.temp}
              onSave={(hp) => saveState({ hp: { ...localState.hp, ...hp } })}
            />
            {/* Death saves inline when relevant */}
            {(localState.hp.current === 0 ||
              localState.death_saves.successes > 0 ||
              localState.death_saves.failures > 0) && (
              <div className="mt-3">
                <DeathSavesTracker
                  successes={localState.death_saves.successes}
                  failures={localState.death_saves.failures}
                  onSave={(ds) => saveState({ death_saves: ds })}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {editOpen && (
        <EditPanel
          state={localState}
          onSave={(patch: Partial<typeof localState>) => saveState(patch)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* ───────── Core stats bar ───────── */}
      <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCard label="CA" value={computed.ac} />
        <StatCard label="Iniciativa" value={formatBonus(computed.initiative)} tone="primary" />
        <StatCard label="Velocidad" value={`${computed.speed}`} hint="ft" />
        <StatCard label="Prof. Bonus" value={formatBonus(computed.proficiencyBonus)} />
        <StatCard label="Percep. Pasiva" value={computed.passivePerception} />
        {computed.spellcasting ? (
          <StatCard label="DC Conjuro" value={computed.spellcasting.spellSaveDC} tone="magic" />
        ) : (
          <StatCard label="Inspiración" value={localState.inspiration ? "✦" : "—"} tone={localState.inspiration ? "primary" : "default"} />
        )}
      </section>

      {/* ───────── Ability scores ───────── */}
      <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITIES.map((ability) => {
          const mod = computed.abilityModifiers[ability];
          const score = localState.ability_scores[ability];
          const saveProf = computed.savingThrows[ability]?.proficient;
          return (
            <div
              key={ability}
              className="stat-block group relative overflow-hidden transition-all hover:border-parchment-700/60 hover:shadow-glow"
            >
              <div className="flex items-center gap-1 text-stone-500">
                <GameIcon kind="ability" slug={ability} size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {ABILITY_NAMES[ability] ?? ability}
                </span>
              </div>
              <span className="font-display text-3xl leading-none text-stone-100 drop-shadow-sm">
                {formatBonus(mod)}
              </span>
              <span className="font-mono text-[11px] text-stone-500">
                {score}
              </span>
              {saveProf && (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-parchment-400 shadow-glow"
                  title="Proficiente en salvación"
                />
              )}
            </div>
          );
        })}
      </section>

      {/* ───────── Conditions picker (collapsed) ───────── */}
      <ConditionsTracker
        conditions={localState.conditions}
        exhaustionLevel={localState.exhaustion_level}
        onToggle={(c) => {
          const cond = c as (typeof localState.conditions)[number];
          const next = localState.conditions.includes(cond)
            ? localState.conditions.filter((x) => x !== cond)
            : [...localState.conditions, cond];
          saveState({ conditions: next });
        }}
        onExhaustion={(n) => saveState({ exhaustion_level: n })}
      />

      {/* ───────── Tabs ───────── */}
      <div className="border-b border-parchment-800/30">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap border-b-2 px-4 py-2.5 font-display text-[13px] uppercase tracking-[0.14em] transition-all ${
                  active
                    ? "border-parchment-500 text-parchment-300"
                    : "border-transparent text-stone-500 hover:text-stone-200"
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-px left-1/2 h-px w-12 -translate-x-1/2 bg-parchment-400 shadow-glow"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────── Tab content ───────── */}
      <div className="min-h-[320px] animate-fade-in" key={activeTab}>
        {activeTab === "stats" && <StatsTab computed={computed} />}
        {activeTab === "spells" && (
          <SpellsTab
            computed={computed}
            state={localState}
            token={token}
            onSaveSlots={(spell_slots) => saveState({ spell_slots })}
            onLongRest={doLongRest}
            onTogglePrepared={(slug) => {
              const isPrep = localState.prepared_spells.includes(slug);
              const next = isPrep
                ? localState.prepared_spells.filter((s) => s !== slug)
                : [...localState.prepared_spells, slug];
              saveState({ prepared_spells: next });
            }}
          />
        )}
        {activeTab === "inventory" && <InventoryTab character={character} token={token} />}
        {activeTab === "features" && <FeaturesTab computed={computed} />}
        {activeTab === "notes" && (
          <NotesTab
            notes={localState.notes}
            onSave={(notes) => saveState({ notes })}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HpTracker({
  current,
  max,
  temp,
  onSave,
}: {
  current: number;
  max: number;
  temp: number;
  onSave: (hp: { current?: number; max?: number; temp?: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [delta, setDelta] = useState("");
  const [tempEdit, setTempEdit] = useState("");

  function applyDelta(heal: boolean) {
    const amount = parseInt(delta);
    if (isNaN(amount) || amount <= 0) return;
    const next = heal
      ? Math.min(max, current + amount)
      : Math.max(0, current - amount);
    onSave({ current: next });
    setDelta("");
  }

  function applyTemp() {
    const amount = parseInt(tempEdit);
    if (isNaN(amount)) return;
    onSave({ temp: Math.max(0, amount) });
    setTempEdit("");
    setEditing(false);
  }

  const dead = current <= 0;

  return (
    <div
      className={`relative rounded-xl border bg-gradient-to-br from-stone-900 to-stone-950 p-4 shadow-elevated ring-1 ring-inset ring-stone-900/40 ${
        dead ? "border-red-900/60" : current / max < 0.25 ? "border-red-900/40" : "border-stone-800"
      }`}
    >
      {/* HP numeric display */}
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-parchment-400">
          Puntos de Golpe
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl leading-none text-stone-100">
            {current}
          </span>
          <span className="font-mono text-sm text-stone-500">/ {max}</span>
          {temp > 0 && (
            <button
              onClick={() => { setEditing(true); setTempEdit(String(temp)); }}
              className="ml-1 rounded bg-blue-900/40 px-1.5 py-0.5 font-mono text-[11px] text-blue-300 ring-1 ring-inset ring-blue-700/40 hover:bg-blue-900/60"
              title="HP temporales"
            >
              +{temp}
            </button>
          )}
        </div>
      </div>

      <HpBar current={current} max={max} temp={temp} size="md" />

      {/* Damage / Heal controls */}
      <div className="mt-3 flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="±"
          className="w-16 rounded-md border border-stone-700 bg-stone-900 px-2 py-1.5 text-center font-mono text-sm text-stone-100 focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500/40"
          onKeyDown={(e) => { if (e.key === "Enter") applyDelta(false); }}
        />
        <button
          onClick={() => applyDelta(false)}
          disabled={!delta}
          className="flex-1 rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-900/60 disabled:opacity-40"
          title="Aplicar daño"
        >
          Daño
        </button>
        <button
          onClick={() => applyDelta(true)}
          disabled={!delta}
          className="flex-1 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-900/60 disabled:opacity-40"
          title="Curar"
        >
          Curar
        </button>
        <button
          onClick={() => { setEditing(!editing); setTempEdit(String(temp)); }}
          className="rounded-md border border-stone-700 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 hover:border-blue-700 hover:text-blue-300"
          title="HP temporales"
        >
          Tmp
        </button>
      </div>

      {/* Temp HP editor */}
      {editing && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-blue-900/40 bg-blue-950/20 px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">HP temp</span>
          <input
            type="number"
            min={0}
            value={tempEdit}
            onChange={(e) => setTempEdit(e.target.value)}
            className="w-14 rounded border border-blue-900/60 bg-stone-900 px-1.5 py-0.5 text-center font-mono text-xs text-blue-200 focus:border-blue-500 focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && applyTemp()}
          />
          <button onClick={applyTemp} className="text-[11px] font-medium text-blue-300 hover:text-blue-200">OK</button>
          <button onClick={() => setEditing(false)} className="ml-auto text-[11px] text-stone-500 hover:text-stone-300">Cancelar</button>
        </div>
      )}
    </div>
  );
}

function StatsTab({ computed }: { computed: ComputedCharacter }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Saving throws */}
      <div className="card">
        <SectionTitle>Tiradas de Salvación</SectionTitle>
        <OrnateDivider className="my-3" />
        <div className="space-y-1.5">
          {ABILITIES.map((ability) => {
            const save = computed.savingThrows[ability];
            return (
              <div
                key={ability}
                className="flex items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-stone-900/50"
              >
                <div className="flex items-center gap-2">
                  <ProfDot proficient={save.proficient} />
                  <GameIcon kind="ability" slug={ability} size={12} className="text-stone-500" />
                  <span className="font-serif text-sm text-stone-200">{ABILITY_NAMES[ability]}</span>
                </div>
                <span className="font-mono text-base font-semibold text-stone-100">
                  {formatBonus(save.total)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="card">
        <SectionTitle>Habilidades</SectionTitle>
        <OrnateDivider className="my-3" />
        <div className="space-y-0.5">
          {(Object.entries(computed.skills) as [Skill, { total: number; proficient: boolean; expertise: boolean }][]).map(
            ([skill, data]) => (
              <div
                key={skill}
                className="flex items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-stone-900/50"
              >
                <div className="flex items-center gap-2">
                  <ProfDot proficient={data.proficient} expertise={data.expertise} />
                  <span className="font-serif text-sm text-stone-300">{SKILL_NAMES[skill]}</span>
                </div>
                <span className={`font-mono text-sm font-semibold ${data.expertise ? "text-parchment-300" : "text-stone-100"}`}>
                  {formatBonus(data.total)}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function SpellsTab({
  computed,
  state,
  token,
  onSaveSlots,
  onLongRest,
  onTogglePrepared,
}: {
  computed: ComputedCharacter;
  state: Character["state"];
  token: string;
  onSaveSlots: (slots: Character["state"]["spell_slots"]) => void;
  onLongRest: () => Promise<void>;
  onTogglePrepared: (slug: string) => void;
}) {
  const [spells, setSpells] = useState<SpellLike[]>([]);
  useEffect(() => {
    if (!token) return;
    const slugs = new Set([...state.known_spells, ...state.prepared_spells]);
    if (slugs.size === 0) return;
    getGqlClient(token)
      .request<{ contentItems: SpellLike[] }>(CONTENT_ITEMS_QUERY, { type: "spell" })
      .then((res) => setSpells(res.contentItems.filter((sp) => slugs.has(sp.slug))))
      .catch(() => {});
  }, [token, state.known_spells, state.prepared_spells]);

  if (!computed.spellcasting) {
    return (
      <div className="card-ghost py-12 text-center">
        <p className="font-serif italic text-stone-500">Esta clase no tiene hechizos.</p>
      </div>
    );
  }

  const { spellSaveDC, spellAttackBonus, ability } = computed.spellcasting;

  function toggleSlot(level: number, used: boolean) {
    const total = computed.spellSlotsByLevel[level] ?? 0;
    const current = state.spell_slots[level]?.remaining ?? total;
    const next = used
      ? Math.max(0, current - 1)
      : Math.min(total, current + 1);
    onSaveSlots({
      ...state.spell_slots,
      [level]: { total, remaining: next },
    });
  }

  return (
    <div className="space-y-4">
      {/* Spellcasting info */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Habilidad" value={ability} tone="magic" />
        <StatCard label="DC Conjuro" value={spellSaveDC} tone="magic" />
        <StatCard label="Ataque" value={formatBonus(spellAttackBonus)} tone="magic" />
      </div>

      {/* Spell slots */}
      {Object.keys(computed.spellSlotsByLevel).length > 0 && (
        <div className="card">
          <SectionTitle
            action={
              <button
                onClick={async () => {
                  if (!confirm("¿Tomar descanso largo? Restaura HP, slots y regenera dados de golpe.")) return;
                  await onLongRest();
                }}
                className="btn-ghost text-[11px]"
                title="Recuperar todos los slots (descanso largo)"
              >
                ↺ Descanso largo
              </button>
            }
          >
            Espacios de Hechizo
          </SectionTitle>
          <OrnateDivider className="my-3" />
          <div className="space-y-2.5">
            {Object.entries(computed.spellSlotsByLevel).map(([lvl, total]) => {
              const level = parseInt(lvl);
              const remaining = state.spell_slots[level]?.remaining ?? total;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-16 font-display text-[11px] uppercase tracking-wider text-parchment-400">
                    {level === 0 ? "Trucos" : `Nivel ${level}`}
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {Array.from({ length: total }).map((_, i) => {
                      const used = i >= remaining;
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSlot(level, !used)}
                          title={used ? "Recuperar espacio" : "Usar espacio"}
                          className={`h-6 w-6 rounded-full border-2 transition-all ${
                            used
                              ? "border-stone-700 bg-stone-900/70"
                              : "border-parchment-400 bg-parchment-500/30 shadow-glow hover:bg-parchment-500/50"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="font-mono text-xs text-stone-500">{remaining}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SpellList
        title="Hechizos preparados"
        slugs={state.prepared_spells}
        spells={spells}
        emptyMessage="No hay hechizos preparados."
        preparedSet={new Set(state.prepared_spells)}
        onTogglePrepared={onTogglePrepared}
      />

      {state.known_spells.filter((s) => !state.prepared_spells.includes(s)).length > 0 && (
        <SpellList
          title="Hechizos conocidos (no preparados)"
          slugs={state.known_spells.filter((s) => !state.prepared_spells.includes(s))}
          spells={spells}
          emptyMessage=""
          preparedSet={new Set(state.prepared_spells)}
          onTogglePrepared={onTogglePrepared}
        />
      )}
    </div>
  );
}

function SpellList({
  title,
  slugs,
  spells,
  emptyMessage,
  preparedSet,
  onTogglePrepared,
}: {
  title: string;
  slugs: string[];
  spells: SpellLike[];
  emptyMessage: string;
  preparedSet?: Set<string>;
  onTogglePrepared?: (slug: string) => void;
}) {
  if (slugs.length === 0) {
    return emptyMessage ? (
      <p className="font-serif text-sm italic text-stone-500">{emptyMessage}</p>
    ) : null;
  }

  const found = slugs
    .map((slug) => spells.find((sp) => sp.slug === slug))
    .filter((x): x is SpellLike => x !== undefined);

  // Group by spell level
  const byLevel = new Map<number, SpellLike[]>();
  for (const sp of found) {
    const lvl = sp.data.level;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(sp);
  }

  const missing = slugs.filter((slug) => !spells.some((sp) => sp.slug === slug));

  return (
    <div className="card space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <OrnateDivider />
      {Array.from(byLevel.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([level, list]) => (
          <div key={level} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-parchment-400">
                {level === 0 ? "Trucos" : `Nivel ${level}`}
              </h4>
              <span className="text-[10px] text-stone-600">·</span>
              <span className="text-[10px] text-stone-600">{list.length}</span>
            </div>
            <div className="grid gap-1">
              {list.map((sp) => {
                // Cantrips are always "prepared" implicitly — no toggle
                const canToggle = sp.data.level > 0 && !!onTogglePrepared;
                return (
                  <div key={sp.id} className="relative">
                    <SpellRow spell={sp} />
                    {canToggle && (
                      <button
                        onClick={() => onTogglePrepared!(sp.slug)}
                        title={preparedSet?.has(sp.slug) ? "Despreparar" : "Preparar"}
                        className={`absolute right-2 top-1.5 text-sm leading-none transition-colors ${
                          preparedSet?.has(sp.slug)
                            ? "text-parchment-400 hover:text-parchment-300"
                            : "text-stone-600 hover:text-stone-400"
                        }`}
                      >
                        {preparedSet?.has(sp.slug) ? "★" : "☆"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      {missing.length > 0 && (
        <p className="text-[11px] text-stone-600">
          Cargando: {missing.slice(0, 3).join(", ")}
          {missing.length > 3 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

function InventoryTab({ character, token }: { character: Character; token: string }) {
  const router = useRouter();
  const inventory =
    (character as {
      inventory?: Array<{
        id: string;
        name: string;
        quantity: number;
        equipped: boolean;
        notes?: string;
      }>;
    }).inventory ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allItems, setAllItems] = useState<Array<{ id: string; name: string; slug: string; data: unknown }>>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!pickerOpen || allItems.length > 0 || !token) return;
    getGqlClient(token)
      .request<{ contentItems: typeof allItems }>(CONTENT_ITEMS_QUERY, { type: "item" })
      .then((res) => setAllItems(res.contentItems))
      .catch(() => {});
  }, [pickerOpen, allItems.length, token]);

  async function removeItem(id: string) {
    if (!confirm("¿Quitar este objeto del inventario?")) return;
    setBusy(id);
    try {
      await getGqlClient(token).request(REMOVE_INVENTORY_ITEM_MUTATION, { id });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleEquip(id: string, equipped: boolean) {
    setBusy(id);
    try {
      await getGqlClient(token).request(EQUIP_ITEM_MUTATION, { id, equipped: !equipped });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function addFromSrd(itemId: string) {
    setBusy(itemId);
    try {
      await getGqlClient(token).request(ADD_INVENTORY_ITEM_MUTATION, {
        input: { characterId: character.id, contentItemId: itemId, name: "" },
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const filtered = search
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 40)
    : allItems.slice(0, 40);

  // Match the item category to an icon slug (very light heuristic).
  function itemIconSlug(category?: string): { kind: "raw"; slug: string } {
    switch ((category ?? "").toLowerCase()) {
      case "weapon":
      case "martial weapon":
      case "simple weapon":
        return { kind: "raw", slug: "crossed-swords" };
      case "armor":
      case "shield":
        return { kind: "raw", slug: "shield" };
      case "potion":
        return { kind: "raw", slug: "health-potion" };
      case "scroll":
        return { kind: "raw", slug: "scroll-quill" };
      case "wondrous item":
      case "wondrous":
      case "ring":
        return { kind: "raw", slug: "crystal-ball" };
      default:
        return { kind: "raw", slug: "swords-emblem" };
    }
  }

  return (
    <div className="space-y-3">
      <SectionTitle
        action={
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className={pickerOpen ? "btn-ghost text-xs" : "btn-secondary text-xs"}
          >
            {pickerOpen ? "Cerrar" : "+ Añadir desde SRD"}
          </button>
        }
      >
        Objetos <span className="font-mono text-stone-500">({inventory.length})</span>
      </SectionTitle>

      {pickerOpen && (
        <div className="card-compact space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar objeto (armas, armaduras, magic items…)"
            className="input text-sm"
            autoFocus
          />
          <div className="max-h-72 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-800 bg-stone-950/50">
            {allItems.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-500">Cargando…</p>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-500">Sin resultados</p>
            ) : (
              filtered.map((it) => {
                const d = it.data as {
                  category?: string;
                  rarity?: string;
                  cost?: { amount: number; currency: string };
                };
                const icon = itemIconSlug(d.category);
                return (
                  <button
                    key={it.id}
                    onClick={() => addFromSrd(it.id)}
                    disabled={busy === it.id}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-stone-900/70 disabled:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GameIcon kind={icon.kind} slug={icon.slug} size={14} className="text-parchment-500/70" />
                      <span className="truncate text-stone-200">{it.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-stone-500">
                      {d.category}
                      {d.rarity ? ` · ${d.rarity}` : ""}
                      {d.cost ? ` · ${d.cost.amount} ${d.cost.currency}` : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="card-ghost py-10 text-center">
          <p className="font-serif italic text-stone-500">El inventario está vacío.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {inventory.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-lg border bg-stone-900/60 px-3 py-2 transition-colors ${
                item.equipped
                  ? "border-parchment-700/60 shadow-inset"
                  : "border-stone-800 hover:border-stone-700"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <GameIcon
                  kind="raw"
                  slug={item.equipped ? "swords-emblem" : "backup"}
                  size={16}
                  className={item.equipped ? "text-parchment-400" : "text-stone-500"}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-stone-100">{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="font-mono text-[10px] text-stone-500">×{item.quantity}</span>
                    )}
                  </div>
                  {item.notes && <p className="truncate font-serif text-[11px] italic text-stone-500">{item.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleEquip(item.id, item.equipped)}
                  disabled={busy === item.id}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                    item.equipped
                      ? "bg-parchment-600/30 text-parchment-200 ring-1 ring-inset ring-parchment-600/50 hover:bg-parchment-600/40"
                      : "border border-stone-700 text-stone-400 hover:border-stone-500"
                  }`}
                >
                  {item.equipped ? "Equipado" : "Equipar"}
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={busy === item.id}
                  className="text-stone-600 hover:text-red-400 disabled:opacity-50"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturesTab({ computed }: { computed: ComputedCharacter }) {
  if (computed.features.length === 0) {
    return (
      <div className="card-ghost py-10 text-center">
        <p className="font-serif italic text-stone-500">Aún no hay rasgos de clase.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {computed.features.map((feature, i) => (
        <details
          key={i}
          className="group card-compact overflow-hidden transition-colors hover:border-stone-700"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-parchment-500 transition-transform group-open:rotate-90">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1.5l5 3.5-5 3.5z" />
                </svg>
              </span>
              <span className="truncate font-display text-sm font-semibold tracking-wide text-stone-100">
                {feature.name}
              </span>
              <span className="badge-neutral shrink-0">{feature.source}</span>
            </div>
          </summary>
          <div className="mt-2 border-t border-stone-800 pt-2 font-serif text-sm leading-relaxed text-stone-300">
            {feature.description}
          </div>
        </details>
      ))}
    </div>
  );
}

function NotesTab({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(true);

  function handleSave() {
    onSave(value);
    setSaved(true);
  }

  return (
    <div className="card space-y-3">
      <SectionTitle
        action={
          !saved ? (
            <button onClick={handleSave} className="btn-primary text-xs">
              Guardar
            </button>
          ) : value !== notes ? (
            <span className="text-[11px] italic text-stone-600">Sin guardar</span>
          ) : (
            <span className="text-[11px] text-emerald-500/70">Guardado</span>
          )
        }
      >
        Notas
      </SectionTitle>
      <OrnateDivider />
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        onBlur={handleSave}
        className="min-h-[260px] w-full resize-y rounded-lg border border-stone-800 bg-stone-950/50 p-4 font-serif text-[15px] leading-relaxed text-stone-200 placeholder-stone-600 shadow-inset focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500/30"
        placeholder="Escribe notas sobre tu personaje, historia, aliados, objetivos..."
      />
    </div>
  );
}

function DeathSavesTracker({
  successes,
  failures,
  onSave,
}: {
  successes: number;
  failures: number;
  onSave: (ds: { successes: number; failures: number }) => void;
}) {
  const dead = failures >= 3;
  const stable = successes >= 3;

  function setSuccess(n: number) {
    onSave({ successes: Math.max(0, Math.min(3, n)), failures });
  }
  function setFailure(n: number) {
    onSave({ successes, failures: Math.max(0, Math.min(3, n)) });
  }
  function reset() {
    onSave({ successes: 0, failures: 0 });
  }

  return (
    <div
      className={`rounded-xl border p-3 shadow-elevated transition-colors ${
        dead
          ? "border-red-700/70 bg-red-950/50"
          : stable
            ? "border-emerald-700/70 bg-emerald-950/40"
            : "border-stone-800 bg-stone-900/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment-400">
          Salvaciones contra muerte
          {dead && <span className="ml-2 text-red-400">— Muerto</span>}
          {stable && !dead && <span className="ml-2 text-emerald-400">— Estable</span>}
        </h3>
        <button onClick={reset} className="text-[11px] text-stone-500 hover:text-stone-300">
          Reset
        </button>
      </div>
      <div className="flex gap-6">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Éxitos</div>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setSuccess(successes >= i ? i - 1 : i)}
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  successes >= i ? "border-emerald-400 bg-emerald-500 shadow-glow" : "border-stone-600"
                }`}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">Fallos</div>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setFailure(failures >= i ? i - 1 : i)}
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  failures >= i ? "border-red-400 bg-red-500" : "border-stone-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConditionsTracker({
  conditions,
  exhaustionLevel,
  onToggle,
  onExhaustion,
}: {
  conditions: string[];
  exhaustionLevel: number;
  onToggle: (c: string) => void;
  onExhaustion: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = conditions.length + (exhaustionLevel > 0 ? 1 : 0);

  return (
    <div
      className={`rounded-xl border bg-stone-900/60 transition-colors ${
        activeCount > 0 ? "border-amber-900/40" : "border-stone-800"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5"
      >
        <span className="flex items-center gap-2">
          <GameIcon kind="raw" slug="hearts" size={14} className="text-stone-500" />
          <span className="font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-stone-200">
            Condiciones
          </span>
          {activeCount > 0 && (
            <span className="badge-warning">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-stone-500 text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-800 p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {CONDITIONS.filter((c) => c !== "exhaustion").map((cond) => {
              const active = conditions.includes(cond);
              return (
                <button
                  key={cond}
                  onClick={() => onToggle(cond)}
                  title={CONDITION_DESCRIPTIONS[cond]}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-red-800/70 bg-red-950/50 text-red-200 shadow-inset"
                      : "border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200"
                  }`}
                >
                  <GameIcon kind="condition" slug={cond} size={14} className={active ? "text-red-300" : "text-stone-500"} />
                  <span className="capitalize">{cond}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-stone-800 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Agotamiento
              </span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                  const filled = n > 0 && n <= exhaustionLevel;
                  const intensity = exhaustionLevel > 0 ? Math.min(6, exhaustionLevel) : 0;
                  // Scale color intensity with exhaustion level
                  const activeClass =
                    n === exhaustionLevel && n > 0
                      ? intensity >= 5
                        ? "border-red-500 bg-red-600 text-white shadow-glow"
                        : intensity >= 3
                          ? "border-red-600 bg-red-700 text-white"
                          : "border-red-700 bg-red-800 text-white"
                      : filled
                        ? "border-red-800 bg-red-900/70 text-red-200"
                        : n === 0 && exhaustionLevel === 0
                          ? "border-stone-700 bg-stone-800 text-stone-300"
                          : "border-stone-800 bg-stone-900 text-stone-500 hover:border-stone-600";
                  return (
                    <button
                      key={n}
                      onClick={() => onExhaustion(n)}
                      className={`h-6 w-6 rounded-md border text-[10px] font-bold transition-colors ${activeClass}`}
                      title={n === 0 ? "Sin agotamiento" : `Nivel ${n}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            {exhaustionLevel > 0 && (
              <p className="mt-2 font-serif text-[12px] italic text-red-400">
                Nivel {exhaustionLevel}: {EXHAUSTION_EFFECTS[exhaustionLevel]}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EXHAUSTION_EFFECTS: Record<number, string> = {
  1: "Desventaja en tiradas de habilidad",
  2: "Velocidad reducida a la mitad",
  3: "Desventaja en ataques y salvaciones",
  4: "PG máximos reducidos a la mitad",
  5: "Velocidad reducida a 0",
  6: "Muerte",
};

function ProfDot({ proficient, expertise }: { proficient: boolean; expertise?: boolean }) {
  return (
    <span
      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full border ${
        expertise
          ? "border-parchment-300 bg-parchment-400 shadow-glow"
          : proficient
            ? "border-stone-400 bg-stone-400"
            : "border-stone-700 bg-transparent"
      }`}
    />
  );
}

function formatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

// ──────────────────────────────────────────────────────────────────────────
// Rest controls
// ──────────────────────────────────────────────────────────────────────────

function RestControls({
  hitDice,
  onShortRest,
  onLongRest,
}: {
  hitDice: import("@dnd/shared").HitDice[];
  onShortRest: (dice: Array<{ die: number; roll: number }>) => Promise<void>;
  onLongRest: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function longRest() {
    if (!confirm("¿Tomar descanso largo? Restaura HP, slots y regenera dados de golpe.")) return;
    setBusy(true);
    setError(null);
    try {
      await onLongRest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function submitShort() {
    const dice: Array<{ die: number; roll: number }> = [];
    for (const [dieStr, rolls] of Object.entries(draft)) {
      const die = Number(dieStr);
      for (const r of rolls) {
        const n = parseInt(r);
        if (!isNaN(n) && n >= 1 && n <= die) dice.push({ die, roll: n });
      }
    }
    if (dice.length === 0) {
      if (!confirm("No has gastado dados de golpe. ¿Continuar con descanso corto igual? (recarga warlock slots)")) return;
    }
    setBusy(true);
    setError(null);
    try {
      await onShortRest(dice);
      setOpen(false);
      setDraft({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function addDie(die: number) {
    setDraft((d) => {
      const next = { ...d };
      next[die] = [...(next[die] ?? []), ""];
      return next;
    });
  }
  function removeDie(die: number, idx: number) {
    setDraft((d) => {
      const next = { ...d };
      next[die] = (next[die] ?? []).filter((_, i) => i !== idx);
      return next;
    });
  }
  function setRoll(die: number, idx: number, val: string) {
    setDraft((d) => {
      const next = { ...d };
      const arr = [...(next[die] ?? [])];
      arr[idx] = val;
      next[die] = arr;
      return next;
    });
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary text-xs"
      >
        Descanso corto
      </button>
      <button
        onClick={longRest}
        disabled={busy}
        className="btn-secondary text-xs disabled:opacity-50"
      >
        Descanso largo
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-parchment-800/50 bg-stone-900 p-4 shadow-scroll">
          <h4 className="mb-2 font-display text-sm font-semibold tracking-wide text-parchment-300">
            Descanso corto
          </h4>
          <p className="mb-3 font-serif text-[12px] italic text-stone-500">
            Gasta dados de golpe (máx: los que tienes restantes). Ingresa la tirada de cada dado; se sumará tu mod de CON.
          </p>
          {hitDice.length === 0 ? (
            <p className="text-xs text-stone-500">No tienes dados de golpe.</p>
          ) : (
            <div className="space-y-3">
              {hitDice.map((hd) => {
                const rolls = draft[hd.die] ?? [];
                return (
                  <div key={hd.die}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-mono text-stone-300">
                        d{hd.die} · restantes: <strong className="text-stone-100">{hd.remaining - rolls.length}</strong>
                        <span className="text-stone-500">/{hd.total}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => addDie(hd.die)}
                        disabled={rolls.length >= hd.remaining}
                        className="text-[10px] font-medium text-parchment-400 hover:text-parchment-300 disabled:opacity-40"
                      >
                        + gastar
                      </button>
                    </div>
                    {rolls.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {rolls.map((r, i) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min={1}
                              max={hd.die}
                              value={r}
                              onChange={(e) => setRoll(hd.die, i, e.target.value)}
                              className="w-12 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-center font-mono text-xs text-stone-100"
                              placeholder={`1-${hd.die}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeDie(hd.die, i)}
                              className="text-[10px] text-stone-600 hover:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitShort}
              disabled={busy}
              className="btn-primary text-xs"
            >
              {busy ? "Aplicando…" : "Aplicar descanso"}
            </button>
            <button
              onClick={() => { setOpen(false); setDraft({}); }}
              className="btn-ghost text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Edit panel (ability scores, hp max, inspiration)
// ──────────────────────────────────────────────────────────────────────────

function EditPanel({
  state,
  onSave,
  onClose,
}: {
  state: import("@dnd/shared").CharacterState;
  onSave: (patch: Partial<import("@dnd/shared").CharacterState>) => void;
  onClose: () => void;
}) {
  const [scores, setScores] = useState(state.ability_scores);
  const [hpMax, setHpMax] = useState(state.hp.max);
  const [inspiration, setInspiration] = useState(state.inspiration);

  function adjust(ab: keyof typeof scores, delta: number) {
    setScores((s) => ({
      ...s,
      [ab]: Math.max(1, Math.min(30, (s[ab] ?? 0) + delta)),
    }));
  }

  function apply() {
    onSave({
      ability_scores: scores,
      hp: { ...state.hp, max: Math.max(1, hpMax), current: Math.min(state.hp.current, Math.max(1, hpMax)) },
      inspiration,
    });
    onClose();
  }

  return (
    <div className="card animate-slide-up space-y-4">
      <SectionTitle
        action={
          <button onClick={onClose} className="btn-ghost text-xs">
            Cerrar
          </button>
        }
      >
        Editar personaje
      </SectionTitle>
      <OrnateDivider />

      <div>
        <div className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment-400">
          Puntuaciones de habilidad
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => (
            <div
              key={ab}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <GameIcon kind="ability" slug={ab} size={14} className="text-parchment-500/70" />
                <span className="font-display text-sm font-semibold tracking-wide text-stone-200">{ab}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjust(ab, -1)}
                  className="h-6 w-6 rounded bg-stone-800 text-sm text-stone-400 hover:bg-stone-700"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={scores[ab]}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [ab]: Math.max(1, Math.min(30, parseInt(e.target.value) || 0)) }))
                  }
                  className="w-12 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-center font-mono text-sm text-stone-100"
                />
                <button
                  onClick={() => adjust(ab, 1)}
                  className="h-6 w-6 rounded bg-stone-800 text-sm text-stone-400 hover:bg-stone-700"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment-400">HP máx</span>
          <input
            type="number"
            min={1}
            value={hpMax}
            onChange={(e) => setHpMax(parseInt(e.target.value) || 1)}
            className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-center font-mono text-sm text-stone-100"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={inspiration}
            onChange={(e) => setInspiration(e.target.checked)}
            className="accent-parchment-500"
          />
          <span className="font-serif">Inspiración</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={apply} className="btn-primary text-sm">
          Guardar cambios
        </button>
        <button onClick={onClose} className="btn-ghost text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
