"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getGqlClient,
  absoluteUploadUrl,
  ENCOUNTER_QUERY,
  CAMPAIGN_CHARACTERS_QUERY,
  CONTENT_ITEMS_QUERY,
  START_ENCOUNTER_MUTATION,
  END_ENCOUNTER_MUTATION,
  NEXT_ROUND_MUTATION,
  ADD_PARTICIPANT_MUTATION,
  REMOVE_PARTICIPANT_MUTATION,
  UPDATE_INITIATIVE_MUTATION,
  APPLY_DAMAGE_MUTATION,
  APPLY_CONDITION_MUTATION,
  UPDATE_PARTICIPANT_CONCENTRATION_MUTATION,
} from "@/lib/graphql";
import type { MonsterData } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";
import { HpBar } from "@/components/ui/HpBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { MonsterStatBlock } from "@/components/monster/MonsterStatBlock";

type MonsterOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  data: MonsterData;
};

function formatCR(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

const SRD_CONDITIONS = [
  "blinded", "charmed", "deafened", "exhaustion", "frightened",
  "grappled", "incapacitated", "invisible", "paralyzed", "petrified",
  "poisoned", "prone", "restrained", "stunned", "unconscious",
];
const CONDITION_LABELS: Record<string, string> = {
  blinded: "Cegado", charmed: "Encantado", deafened: "Ensordecido",
  exhaustion: "Agotamiento", frightened: "Asustado", grappled: "Aferrado",
  incapacitated: "Incapacitado", invisible: "Invisible", paralyzed: "Paralizado",
  petrified: "Petrificado", poisoned: "Envenenado", prone: "Derribado",
  restrained: "Restringido", stunned: "Aturdido", unconscious: "Inconsciente",
};
// Conditions that typically mean loss of agency / near-incapacitation -> treat as danger.
const LETHAL_CONDITIONS = new Set([
  "paralyzed",
  "petrified",
  "stunned",
  "unconscious",
  "incapacitated",
]);

interface Participant {
  id: string;
  name: string;
  initiative: number | null;
  hpCurrent: number;
  hpMax: number;
  isPlayer: boolean;
  conditions: string[];
  concentratingOn: string | null;
  sortOrder: number;
  character: {
    id: string;
    name: string;
    portraitUrl?: string | null;
    race?: { slug: string; name: string } | null;
    class?: { slug: string; name: string } | null;
    computed?: { ac: number; maxHp: number; passivePerception: number };
    state?: { ability_scores: { CON: number }; concentrating_on?: string | null };
  } | null;
}

// Map monster SRD types to game-icons slugs available in our curated set.
const MONSTER_TYPE_ICON: Record<string, string> = {
  dragon: "dragon-head",
  fiend: "devil-mask",
  humanoid: "orc-head",
  undead: "animal-skull",
  beast: "animal-skull",
  aberration: "warlock-eye",
  celestial: "barbed-sun",
  construct: "stone-bust",
  elemental: "flame",
  fey: "spark-spirit",
  giant: "orc-head",
  monstrosity: "animal-skull",
  ooze: "acid-blob",
  plant: "holy-oak",
};

function monsterIconSlug(monster: MonsterOption | null): string {
  if (!monster) return "animal-skull";
  return MONSTER_TYPE_ICON[monster.data.type.toLowerCase()] ?? "animal-skull";
}

interface CampaignCharacter {
  id: string;
  name: string;
  level: number;
  race: { name: string };
  class: { name: string };
  computed: { ac: number; maxHp: number };
}

interface Encounter {
  id: string;
  name: string;
  status: "prep" | "active" | "completed";
  round: number;
  notes: string | null;
  campaign: { id: string; name: string };
  participants: Participant[];
}

export default function EncounterDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [campaignChars, setCampaignChars] = useState<CampaignCharacter[]>([]);
  const [monsters, setMonsters] = useState<MonsterOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Turn tracker (local — resets on reload, server stores round only)
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);

  // Add participant form
  const [addTab, setAddTab] = useState<"char" | "monster" | "manual">("char");
  const [addForm, setAddForm] = useState({ name: "", hpMax: "", isPlayer: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [charSearch, setCharSearch] = useState("");
  const [monsterSearch, setMonsterSearch] = useState("");
  const [selectedMonster, setSelectedMonster] = useState<MonsterOption | null>(null);
  const [monsterCount, setMonsterCount] = useState<string>("1");

  // Per-participant interaction state
  const [damageInputs, setDamageInputs] = useState<Record<string, string>>({});
  const [activeConditionPicker, setActiveConditionPicker] = useState<string | null>(null);
  const [statBlockMonster, setStatBlockMonster] = useState<MonsterOption | null>(null);
  const [concentrationReminder, setConcentrationReminder] = useState<
    { participant: Participant; damage: number; dc: number } | null
  >(null);

  const reload = useCallback(async () => {
    if (!token || !params.id) return;
    try {
      const data = await getGqlClient(token).request<{ encounter: Encounter }>(
        ENCOUNTER_QUERY, { id: params.id }
      );
      setEncounter(data.encounter);
    } catch {
      setError("Error al cargar el encuentro");
    }
  }, [token, params.id]);

  useEffect(() => { reload(); }, [reload]);

  // Load campaign characters once we have the encounter
  useEffect(() => {
    if (!token || !encounter?.campaign.id) return;
    getGqlClient(token)
      .request<{ campaign: { characters: CampaignCharacter[] } }>(
        CAMPAIGN_CHARACTERS_QUERY,
        { id: encounter.campaign.id },
      )
      .then((d) => setCampaignChars(d.campaign.characters))
      .catch(() => {});
  }, [token, encounter?.campaign.id]);

  // Load SRD monsters for the picker (once)
  useEffect(() => {
    if (!token || monsters.length > 0) return;
    getGqlClient(token)
      .request<{ contentItems: MonsterOption[] }>(CONTENT_ITEMS_QUERY, { type: "monster" })
      .then((d) => setMonsters(d.contentItems))
      .catch(() => {});
  }, [token, monsters.length]);

  async function act<T>(fn: () => Promise<T>) {
    try {
      setError(null);
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  if (!encounter) {
    return (
      <div className="flex h-64 items-center justify-center text-stone-500">
        {error ?? "Cargando..."}
      </div>
    );
  }

  const client = getGqlClient(token);
  const isActive = encounter.status === "active";
  const isPrep = encounter.status === "prep";
  const isCompleted = encounter.status === "completed";
  const totalParticipants = encounter.participants.length;

  async function pasarTurno() {
    const next = currentTurnIdx + 1;
    if (next >= totalParticipants) {
      // End of round — advance round on server and reset turn
      await act(() => client.request(NEXT_ROUND_MUTATION, { id: encounter!.id }));
      setCurrentTurnIdx(0);
    } else {
      setCurrentTurnIdx(next);
    }
  }

  async function addCampaignChar(char: CampaignCharacter) {
    await act(() =>
      client.request(ADD_PARTICIPANT_MUTATION, {
        input: {
          encounterId: encounter!.id,
          characterId: char.id,
          name: char.name,
          hpMax: char.computed.maxHp,
          hpCurrent: char.computed.maxHp,
          isPlayer: true,
        },
      })
    );
    setCharSearch("");
  }

  async function addMonsterCopies(m: MonsterOption, count: number) {
    const hp = m.data.hp.average;
    for (let i = 1; i <= count; i++) {
      const displayName = count > 1 ? `${m.name} #${i}` : m.name;
      await client.request(ADD_PARTICIPANT_MUTATION, {
        input: {
          encounterId: encounter!.id,
          name: displayName,
          hpMax: hp,
          hpCurrent: hp,
          isPlayer: false,
        },
      });
    }
    await reload();
    setSelectedMonster(null);
    setMonsterCount("1");
    setMonsterSearch("");
  }

  async function applyDamageTo(p: Participant, amount: number, heal: boolean) {
    await client.request(APPLY_DAMAGE_MUTATION, {
      input: { participantId: p.id, amount, heal },
    });
    await reload();

    // Concentration check trigger (only on damage, not heal)
    if (!heal && amount > 0 && p.concentratingOn) {
      const dc = Math.max(10, Math.floor(amount / 2));
      setConcentrationReminder({ participant: p, damage: amount, dc });
    }
  }

  async function monsterByParticipant(p: Participant): Promise<MonsterOption | null> {
    // The participant name may include a "#N" suffix; strip it and match by monster name.
    const baseName = p.name.replace(/\s+#\d+$/, "").trim();
    return (
      monsters.find((m) => m.name === baseName) ??
      monsters.find((m) => m.name.toLowerCase() === baseName.toLowerCase()) ??
      null
    );
  }

  async function openStatBlock(p: Participant) {
    const m = await monsterByParticipant(p);
    if (m) setStatBlockMonster(m);
  }

  async function setConcentration(p: Participant, spell: string | null) {
    await client.request(UPDATE_PARTICIPANT_CONCENTRATION_MUTATION, {
      input: { participantId: p.id, concentratingOn: spell },
    });
    await reload();
  }

  const availableChars = campaignChars.filter(
    (c) => !encounter.participants.some((p) => p.character?.id === c.id),
  );
  const filteredChars = charSearch
    ? availableChars.filter((c) =>
        c.name.toLowerCase().includes(charSearch.toLowerCase()),
      )
    : availableChars;

  const filteredMonsters = monsterSearch
    ? monsters
        .filter((m) => m.name.toLowerCase().includes(monsterSearch.toLowerCase()))
        .slice(0, 30)
    : monsters.slice(0, 30);

  const statusBadge = isActive
    ? "badge-success animate-pulse-soft"
    : isPrep
      ? "badge-neutral"
      : "badge-neutral opacity-60";
  const statusLabel = isActive ? "En combate" : isPrep ? "Preparación" : "Completado";

  const headerSubtitle = (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <span className={statusBadge}>
        <GameIcon kind="raw" slug={isActive ? "crossed-swords" : "hourglass"} size={10} />
        {statusLabel}
      </span>
      {isActive && (
        <span className="badge-primary">
          Ronda {encounter.round}
        </span>
      )}
      {isActive && totalParticipants > 0 && (
        <span className="text-stone-500">
          Turno <span className="font-mono text-parchment-300">{currentTurnIdx + 1}</span>
          <span className="text-stone-600">/{totalParticipants}</span>
        </span>
      )}
      <span className="text-stone-600">·</span>
      <span className="text-stone-500">
        {totalParticipants} participante{totalParticipants !== 1 ? "s" : ""}
      </span>
    </span>
  );

  const headerActions = (
    <>
      {isPrep && (
        <button
          onClick={() => act(() => client.request(START_ENCOUNTER_MUTATION, { id: encounter.id }))}
          className="btn-primary"
        >
          <GameIcon kind="raw" slug="crossed-swords" size={14} />
          Iniciar combate
        </button>
      )}
      {isActive && (
        <>
          <button
            onClick={pasarTurno}
            className="btn-primary"
            title="Avanzar al siguiente turno"
          >
            Pasar turno →
          </button>
          <button
            onClick={() => act(() => client.request(END_ENCOUNTER_MUTATION, { id: encounter.id }))}
            className="btn-danger"
          >
            Terminar
          </button>
        </>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <PageHeader
        variant="hero"
        breadcrumbs={[
          { href: "/dm/encounters", label: "Encuentros" },
          { href: `/campaigns/${encounter.campaign.id}`, label: encounter.campaign.name },
        ]}
        icon={
          <GameIcon
            kind="raw"
            slug={isActive ? "crossed-swords" : "hourglass"}
            size={26}
          />
        }
        title={encounter.name}
        subtitle={headerSubtitle}
        actions={headerActions}
      />

      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Party HP summary (sticky under header) */}
      <div className="sticky top-2 z-20">
        <PartyHpSummary participants={encounter.participants} />
      </div>

      {/* Initiative tracker */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title flex items-center gap-2">
            <GameIcon kind="raw" slug="crossed-swords" size={16} className="text-parchment-500" />
            Iniciativa
          </h2>
          {(isPrep || isActive) && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-secondary h-8 px-3 text-xs"
            >
              {showAddForm ? "× Cerrar" : "+ Agregar participante"}
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="card-compact space-y-3 animate-slide-up">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-stone-800">
              {(["char", "monster", "manual"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddTab(t)}
                  className={`font-display -mb-px border-b-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    addTab === t
                      ? "border-parchment-500 text-parchment-300"
                      : "border-transparent text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {t === "char" ? "PJ de campaña" : t === "monster" ? "Monstruo SRD" : "Manual"}
                </button>
              ))}
            </div>

            {/* Campaign character autocomplete */}
            {addTab === "char" && (
              <div className="space-y-2">
                {campaignChars.length === 0 ? (
                  <p className="text-xs text-stone-500">No hay personajes en la campaña.</p>
                ) : availableChars.length === 0 ? (
                  <p className="text-xs text-stone-500">
                    Todos los personajes de la campaña ya están en el encuentro.
                  </p>
                ) : (
                  <>
                    <input
                      className="input h-9 w-full text-sm"
                      value={charSearch}
                      onChange={(e) => setCharSearch(e.target.value)}
                      placeholder={`Filtrar ${availableChars.length} personaje${availableChars.length !== 1 ? "s" : ""}…`}
                    />
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-800 divide-y divide-stone-800/60">
                      {filteredChars.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-stone-500">
                          Sin resultados para “{charSearch}”.
                        </p>
                      ) : (
                        filteredChars.map((char) => (
                          <button
                            key={char.id}
                            onClick={() => addCampaignChar(char)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-stone-800/60"
                          >
                            <div className="flex items-center gap-2">
                              <GameIcon
                                kind="class"
                                slug={char.class.name}
                                size={16}
                                className="text-parchment-400"
                              />
                              <span className="font-medium text-stone-100">{char.name}</span>
                              <span className="text-[11px] text-stone-500">
                                Nv {char.level} · {char.race.name} {char.class.name}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-stone-400">
                              {char.computed.maxHp} HP
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Monster SRD picker */}
            {addTab === "monster" && (
              <div className="space-y-2">
                <input
                  className="input h-9 w-full text-sm"
                  value={monsterSearch}
                  onChange={(e) => setMonsterSearch(e.target.value)}
                  placeholder="Buscar monstruo SRD…"
                />
                <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-800 divide-y divide-stone-800/60">
                  {filteredMonsters.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-stone-500">
                      {monsters.length === 0 ? "Cargando…" : "Sin resultados"}
                    </p>
                  ) : (
                    filteredMonsters.map((m) => {
                      const isSelected = selectedMonster?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMonster(m)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-parchment-600/10 ring-1 ring-inset ring-parchment-600/40"
                              : "hover:bg-stone-800/60"
                          }`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-stone-700 bg-stone-900 text-red-400">
                            <GameIcon kind="raw" slug="animal-skull" size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-stone-100">{m.name}</div>
                            <div className="truncate text-[11px] text-stone-500">
                              {m.data.size} {m.data.type}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5 text-[10px]">
                            <span className="badge-neutral">
                              CR {formatCR(m.data.challenge_rating)}
                            </span>
                            <span className="badge-neutral">
                              {m.data.hp.average} HP
                            </span>
                            <span className="badge-neutral">
                              AC {m.data.ac}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedMonster && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-parchment-700/40 bg-parchment-600/5 px-3 py-2">
                    <div className="flex-1 text-xs text-stone-300">
                      Agregando{" "}
                      <span className="font-medium text-parchment-200">{selectedMonster.name}</span>
                      {" "}
                      <span className="text-stone-500">
                        ({selectedMonster.data.hp.average} HP · AC {selectedMonster.data.ac})
                      </span>
                    </div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-500">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={monsterCount}
                      onChange={(e) => setMonsterCount(e.target.value)}
                      className="input h-9 w-16 text-center text-sm"
                    />
                    <button
                      onClick={() => {
                        const n = Math.max(1, Math.min(20, parseInt(monsterCount) || 1));
                        act(() => addMonsterCopies(selectedMonster, n));
                      }}
                      className="btn-primary h-9 text-sm"
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual NPC entry */}
            {addTab === "manual" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="label mb-1 block">NPC / Enemigo</label>
                  <input
                    className="input h-9 text-sm"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Bandido jefe…"
                  />
                </div>
                <div>
                  <label className="label mb-1 block">HP máximo</label>
                  <input
                    type="number"
                    min={1}
                    className="input h-9 w-24 text-sm"
                    value={addForm.hpMax}
                    onChange={(e) => setAddForm((f) => ({ ...f, hpMax: e.target.value }))}
                  />
                </div>
                <button
                  disabled={!addForm.name.trim() || !addForm.hpMax}
                  onClick={() =>
                    act(async () => {
                      await client.request(ADD_PARTICIPANT_MUTATION, {
                        input: {
                          encounterId: encounter.id,
                          name: addForm.name.trim(),
                          hpMax: parseInt(addForm.hpMax),
                          isPlayer: false,
                        },
                      });
                      setAddForm({ name: "", hpMax: "", isPlayer: false });
                    })
                  }
                  className="btn-primary h-9 text-sm"
                >
                  Agregar
                </button>
              </div>
            )}
          </div>
        )}

        {encounter.participants.length === 0 ? (
          <div className="card-ghost py-12 text-center text-sm text-stone-500">
            No hay participantes. Agregá jugadores y enemigos para armar el encuentro.
          </div>
        ) : (
          <div className="space-y-2">
            {encounter.participants.map((p, idx) => {
              const monster = !p.isPlayer ? monsterByParticipantSync(p, monsters) : null;
              const isCurrent = isActive && idx === currentTurnIdx;
              return (
                <InitiativeCard
                  key={p.id}
                  participant={p}
                  isCurrent={isCurrent}
                  isEditable={isPrep || isActive}
                  monster={monster}
                  onOpenStatBlock={() => openStatBlock(p)}
                  onInitiativeChange={(val) =>
                    act(() =>
                      client.request(UPDATE_INITIATIVE_MUTATION, {
                        input: { participantId: p.id, initiative: val },
                      })
                    )
                  }
                  onRemove={() =>
                    act(() =>
                      client.request(REMOVE_PARTICIPANT_MUTATION, { id: p.id })
                    )
                  }
                  onApplyDamage={(amt, heal) => act(() => applyDamageTo(p, amt, heal))}
                  onToggleCondition={(c, hasIt) =>
                    act(() =>
                      client.request(APPLY_CONDITION_MUTATION, {
                        input: { participantId: p.id, condition: c, remove: hasIt },
                      })
                    )
                  }
                  onSetConcentration={(spell) => act(() => setConcentration(p, spell))}
                  damageInput={damageInputs[p.id] ?? ""}
                  onDamageInputChange={(v) =>
                    setDamageInputs((prev) => ({ ...prev, [p.id]: v }))
                  }
                  onDamageInputClear={() =>
                    setDamageInputs((prev) => ({ ...prev, [p.id]: "" }))
                  }
                  conditionPickerOpen={activeConditionPicker === p.id}
                  onToggleConditionPicker={() =>
                    setActiveConditionPicker(activeConditionPicker === p.id ? null : p.id)
                  }
                  onCloseConditionPicker={() => setActiveConditionPicker(null)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Help text */}
      {isActive && totalParticipants > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-parchment-800/40 bg-parchment-600/5 px-4 py-2 text-[11px] text-stone-400">
          <GameIcon kind="raw" slug="crossed-swords" size={12} className="text-parchment-500" />
          El participante resaltado actúa ahora. Pasá turno cuando termine.
        </div>
      )}
      {isCompleted && (
        <div className="text-center text-xs text-stone-500">Encuentro finalizado.</div>
      )}

      {/* Monster stat block modal */}
      {statBlockMonster && (
        <Modal onClose={() => setStatBlockMonster(null)} title={statBlockMonster.name}>
          <MonsterStatBlock name={statBlockMonster.name} data={statBlockMonster.data} />
        </Modal>
      )}

      {/* Concentration reminder */}
      {concentrationReminder && (
        <Modal
          onClose={() => setConcentrationReminder(null)}
          title="Tirada de concentración"
          accent="info"
        >
          <div className="space-y-3 p-1">
            <p className="text-sm text-stone-300">
              <strong className="text-stone-100">{concentrationReminder.participant.name}</strong> está concentrado en{" "}
              <strong className="text-blue-300">{concentrationReminder.participant.concentratingOn}</strong> y recibió{" "}
              <strong className="text-red-300">{concentrationReminder.damage}</strong> de daño.
            </p>
            <p className="text-sm text-stone-300">
              Debe superar una salvación de CON con CD{" "}
              <strong className="font-mono text-blue-300">{concentrationReminder.dc}</strong>{" "}
              <span className="text-stone-500">(10 o la mitad del daño, lo que sea mayor).</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  const p = concentrationReminder.participant;
                  setConcentrationReminder(null);
                  act(() => setConcentration(p, null));
                }}
                className="btn-danger h-8 px-3 text-xs"
              >
                Perdió concentración
              </button>
              <button
                onClick={() => setConcentrationReminder(null)}
                className="btn h-8 border border-emerald-800 bg-emerald-900/30 px-3 text-xs text-emerald-200 hover:bg-emerald-900/60"
              >
                Mantuvo concentración
              </button>
              <button
                onClick={() => setConcentrationReminder(null)}
                className="btn-ghost ml-auto h-8 px-3 text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Initiative Card ───────────────────────────────────────────────────────────

interface InitiativeCardProps {
  participant: Participant;
  isCurrent: boolean;
  isEditable: boolean;
  monster: MonsterOption | null;
  onOpenStatBlock: () => void;
  onInitiativeChange: (val: number) => void;
  onRemove: () => void;
  onApplyDamage: (amt: number, heal: boolean) => void;
  onToggleCondition: (c: string, hasIt: boolean) => void;
  onSetConcentration: (spell: string | null) => void;
  damageInput: string;
  onDamageInputChange: (v: string) => void;
  onDamageInputClear: () => void;
  conditionPickerOpen: boolean;
  onToggleConditionPicker: () => void;
  onCloseConditionPicker: () => void;
}

function InitiativeCard({
  participant: p,
  isCurrent,
  isEditable,
  monster,
  onOpenStatBlock,
  onInitiativeChange,
  onRemove,
  onApplyDamage,
  onToggleCondition,
  onSetConcentration,
  damageInput,
  onDamageInputChange,
  onDamageInputClear,
  conditionPickerOpen,
  onToggleConditionPicker,
  onCloseConditionPicker,
}: InitiativeCardProps) {
  const isDead = p.hpCurrent <= 0;
  const portrait = p.character?.portraitUrl ?? null;

  const cardClasses = [
    "relative rounded-xl border bg-stone-900/70 p-3 transition-all",
    isCurrent
      ? "border-parchment-500/70 shadow-glow scale-[1.01] ring-1 ring-parchment-500/30"
      : "border-stone-800 shadow-elevated",
    isDead ? "border-hp-down/60 opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const submitDamage = (heal: boolean) => {
    const amt = parseInt(damageInput);
    if (!isNaN(amt) && amt > 0) {
      onApplyDamage(amt, heal);
      onDamageInputClear();
    }
  };

  return (
    <div className={cardClasses}>
      {isCurrent && (
        <div className="absolute -top-2 left-4 z-10">
          <span className="badge-primary animate-pulse-soft shadow-glow">
            <GameIcon kind="raw" slug="crossed-swords" size={10} />
            Turno
          </span>
        </div>
      )}
      {isDead && (
        <div className="absolute -top-2 right-4 z-10">
          <span className="badge-danger">
            <GameIcon kind="raw" slug="animal-skull" size={10} />
            Caído
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        {/* Initiative hex */}
        <div className="flex flex-shrink-0 flex-col items-center">
          <span className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-stone-500">
            Init
          </span>
          {isEditable ? (
            <input
              type="number"
              value={p.initiative ?? ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) onInitiativeChange(val);
              }}
              className={`h-11 w-11 rounded-lg border text-center font-display text-xl font-bold transition-colors focus:outline-none ${
                isCurrent
                  ? "border-parchment-500 bg-parchment-600/10 text-parchment-200 focus:border-parchment-400"
                  : "border-stone-700 bg-stone-900 text-stone-100 focus:border-parchment-500"
              }`}
              aria-label="Iniciativa"
            />
          ) : (
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-lg border font-display text-xl font-bold ${
                isCurrent
                  ? "border-parchment-500 bg-parchment-600/10 text-parchment-200"
                  : "border-stone-700 bg-stone-900 text-stone-100"
              }`}
            >
              {p.initiative ?? "—"}
            </div>
          )}
        </div>

        {/* Portrait / icon */}
        <div className="flex-shrink-0">
          <ParticipantAvatar
            participant={p}
            portrait={portrait}
            monster={monster}
            {...(monster ? { onClick: onOpenStatBlock } : {})}
          />
        </div>

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {!p.isPlayer && monster ? (
              <button
                onClick={onOpenStatBlock}
                className="font-display truncate text-base font-semibold text-parchment-200 underline decoration-dotted decoration-parchment-700/60 underline-offset-4 transition-colors hover:text-parchment-100"
                title="Ver stat block"
              >
                {p.name}
              </button>
            ) : (
              <span className="font-display truncate text-base font-semibold text-stone-100">
                {p.name}
              </span>
            )}
            <span className={p.isPlayer ? "badge-info" : "badge-danger"}>
              {p.isPlayer ? "PJ" : "NPC"}
            </span>
            {p.concentratingOn && (
              <span
                className="badge-magic flex items-center gap-1"
                title={`Concentrado en ${p.concentratingOn}`}
              >
                <GameIcon kind="raw" slug="crystal-ball" size={10} />
                {p.concentratingOn}
                {isEditable && (
                  <button
                    onClick={() => onSetConcentration(null)}
                    className="ml-0.5 text-ink-400 transition-colors hover:text-red-300"
                    title="Romper concentración"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
          </div>

          {/* Conditions */}
          {p.conditions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.conditions.map((c) => {
                const isLethal = LETHAL_CONDITIONS.has(c);
                const badgeClass = isLethal ? "badge-danger" : "badge-warning";
                return (
                  <button
                    key={c}
                    onClick={() => onToggleCondition(c, true)}
                    className={`${badgeClass} transition-opacity hover:opacity-70`}
                    title="Click para quitar"
                  >
                    <GameIcon kind="condition" slug={c} size={11} />
                    {CONDITION_LABELS[c] ?? c}
                    <span className="opacity-60">×</span>
                  </button>
                );
              })}
            </div>
          )}

          {isEditable && !p.concentratingOn && (
            <ConcentrationQuickSet onSet={(spell) => onSetConcentration(spell)} />
          )}
        </div>

        {/* HP + controls */}
        <div className="flex w-full flex-col gap-2 sm:w-[260px] sm:flex-shrink-0">
          <HpBar current={p.hpCurrent} max={p.hpMax} size="md" label />
          {isEditable && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                placeholder="Cant."
                value={damageInput}
                onChange={(e) => onDamageInputChange(e.target.value)}
                className="input h-8 w-16 px-2 text-center text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitDamage(false);
                }}
              />
              <button
                title="Aplicar daño"
                onClick={() => submitDamage(false)}
                className="btn h-8 border border-red-900 bg-red-900/30 px-2 text-xs text-red-200 hover:bg-red-900/60"
              >
                <GameIcon kind="raw" slug="sword-wound" size={12} />
                Dmg
              </button>
              <button
                title="Curar"
                onClick={() => submitDamage(true)}
                className="btn h-8 border border-emerald-800 bg-emerald-900/30 px-2 text-xs text-emerald-200 hover:bg-emerald-900/60"
              >
                <GameIcon kind="raw" slug="hearts" size={12} />
                Cur
              </button>
              <div className="relative">
                <button
                  onClick={onToggleConditionPicker}
                  className="btn-ghost h-8 border border-stone-700 px-2 text-xs"
                  title="Condiciones"
                >
                  +Cond
                </button>
                {conditionPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={onCloseConditionPicker}
                    />
                    <div className="absolute right-0 top-9 z-40 w-48 overflow-hidden rounded-lg border border-stone-700 bg-stone-950 py-1 shadow-scroll">
                      {SRD_CONDITIONS.map((c) => {
                        const hasIt = p.conditions.includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => {
                              onToggleCondition(c, hasIt);
                              onCloseConditionPicker();
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-stone-800 ${
                              hasIt ? "text-amber-300" : "text-stone-300"
                            }`}
                          >
                            <GameIcon kind="condition" slug={c} size={14} />
                            {hasIt ? "✓ " : ""}
                            {CONDITION_LABELS[c]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onRemove}
                className="btn-ghost ml-auto h-8 w-8 px-0 text-stone-600 hover:text-red-400"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function ParticipantAvatar({
  participant,
  portrait,
  monster,
  onClick,
}: {
  participant: Participant;
  portrait: string | null;
  monster: MonsterOption | null;
  onClick?: () => void;
}) {
  const resolved = absoluteUploadUrl(portrait);
  const baseClass = "relative flex h-11 w-11 items-center justify-center rounded-lg border shadow-inset transition-all";

  if (resolved) {
    const Wrapper = onClick ? "button" : "div";
    return (
      <Wrapper
        onClick={onClick}
        {...(onClick ? { title: "Ver stat block", type: "button" as const } : {})}
        className={`${baseClass} overflow-hidden border-parchment-800/50 ${onClick ? "cursor-pointer hover:border-parchment-500 hover:shadow-glow" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={participant.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </Wrapper>
    );
  }

  const isPlayer = participant.isPlayer;

  if (isPlayer) {
    const classSlug = participant.character?.class?.slug;
    return (
      <div className={`${baseClass} border-blue-700/60 bg-gradient-to-br from-blue-900/30 to-stone-950 text-blue-300`}>
        {classSlug ? (
          <GameIcon kind="class" slug={classSlug} size={22} />
        ) : (
          <GameIcon kind="raw" slug="crossed-swords" size={20} />
        )}
      </div>
    );
  }

  // Monster: type-specific icon, clickable to open stat block
  const slug = monsterIconSlug(monster);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      {...(onClick ? { title: "Ver stat block", type: "button" as const } : {})}
      className={`${baseClass} border-red-800/60 bg-gradient-to-br from-red-950/40 to-stone-950 text-red-300 ${onClick ? "cursor-pointer hover:border-red-500 hover:text-red-200 hover:shadow-glow" : ""}`}
    >
      <GameIcon kind="raw" slug={slug} size={22} />
    </Wrapper>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function monsterByParticipantSync(p: Participant, monsters: MonsterOption[]): MonsterOption | null {
  if (p.isPlayer || p.character) return null;
  const baseName = p.name.replace(/\s+#\d+$/, "").trim();
  return (
    monsters.find((m) => m.name === baseName) ??
    monsters.find((m) => m.name.toLowerCase() === baseName.toLowerCase()) ??
    null
  );
}

function Modal({
  children,
  onClose,
  title,
  accent,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  accent?: "info";
}) {
  const borderClass =
    accent === "info"
      ? "border-blue-800/60"
      : "border-parchment-800/60";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border ${borderClass} bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 shadow-scroll animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-4 py-2.5 backdrop-blur">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-parchment-300">
            {title ?? ""}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-500 transition-colors hover:text-stone-200"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConcentrationQuickSet({ onSet }: { onSet: (spell: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-[10px] text-stone-600 transition-colors hover:text-ink-400"
      >
        + concentrar en…
      </button>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nombre del conjuro"
        className="input h-7 px-2 text-[11px]"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSet(value.trim());
            setValue("");
            setOpen(false);
          }
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
      />
      <button
        onClick={() => { if (value.trim()) { onSet(value.trim()); setValue(""); setOpen(false); } }}
        className="text-[10px] text-ink-400 hover:text-ink-300"
      >
        ok
      </button>
      <button
        onClick={() => { setOpen(false); setValue(""); }}
        className="text-[10px] text-stone-500 hover:text-stone-300"
      >
        ×
      </button>
    </div>
  );
}

// ─── Party HP Summary ──────────────────────────────────────────────────────────

function PartyHpSummary({ participants }: { participants: Participant[] }) {
  const players = participants.filter((p) => p.isPlayer);
  const npcs = participants.filter((p) => !p.isPlayer);

  if (participants.length === 0) return null;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/90 p-0.5 shadow-elevated backdrop-blur">
      <div className="grid gap-0.5 sm:grid-cols-2">
        <div className="rounded-l-[10px] border-r border-stone-800/70 bg-blue-950/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
            <GameIcon kind="raw" slug="crossed-swords" size={11} />
            Party <span className="text-blue-500/70">({players.length})</span>
          </div>
          <div className="space-y-1.5">
            {players.length === 0 ? (
              <p className="text-xs text-stone-600">Sin jugadores en el encuentro.</p>
            ) : (
              players.map((p) => <PartyMiniRow key={p.id} participant={p} />)
            )}
          </div>
        </div>
        <div className="rounded-r-[10px] bg-red-950/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">
            <GameIcon kind="raw" slug="animal-skull" size={11} />
            Enemigos <span className="text-red-500/70">({npcs.length})</span>
          </div>
          <div className="space-y-1.5">
            {npcs.length === 0 ? (
              <p className="text-xs text-stone-600">Sin enemigos aún.</p>
            ) : (
              npcs.map((p) => <PartyMiniRow key={p.id} participant={p} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartyMiniRow({ participant }: { participant: Participant }) {
  const isDead = participant.hpCurrent <= 0;
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        isDead ? "opacity-50" : ""
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-stone-200">{participant.name}</span>
      {participant.concentratingOn && (
        <GameIcon
          kind="raw"
          slug="crystal-ball"
          size={10}
          className="text-ink-400"
          label={`Concentrado en ${participant.concentratingOn}`}
        />
      )}
      <HpBar
        current={participant.hpCurrent}
        max={participant.hpMax}
        size="sm"
        className="w-20"
      />
      <span className="w-14 text-right font-mono text-[10px] text-stone-400">
        {isDead ? "—" : `${participant.hpCurrent}/${participant.hpMax}`}
      </span>
    </div>
  );
}
