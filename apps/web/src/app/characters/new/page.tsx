"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getGqlClient, CONTENT_ITEMS_QUERY, CREATE_CHARACTER_MUTATION } from "@/lib/graphql";
import type {
  RaceData,
  SubraceData,
  ClassData,
  SubclassData,
  BackgroundData,
  SpellData,
  ItemData,
} from "@dnd/shared";
import { getSpellCaps, getCasterKind } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { OrnateDivider } from "@/components/ui/OrnateDivider";
import { StatCard } from "@/components/ui/StatCard";
import { SpellRow } from "@/components/character/SpellRow";

type Step =
  | "name"
  | "race"
  | "subrace"
  | "class"
  | "scores"
  | "background"
  | "subclass"
  | "spells"
  | "equipment"
  | "confirm";

interface ContentItemOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  data: unknown;
}

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
type Ability = (typeof ABILITIES)[number];

const ABILITY_LABELS: Record<Ability, string> = {
  STR: "Fuerza", DEX: "Destreza", CON: "Constitución",
  INT: "Inteligencia", WIS: "Sabiduría", CHA: "Carisma",
};

const STEP_LABELS: Record<Step, string> = {
  name: "Nombre",
  race: "Raza",
  subrace: "Sub-raza",
  class: "Clase",
  scores: "Habilidades",
  background: "Trasfondo",
  subclass: "Arquetipo",
  spells: "Hechizos",
  equipment: "Equipo",
  confirm: "Confirmar",
};

export default function NewCharacterPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedRace, setSelectedRace] = useState<ContentItemOption | null>(null);
  const [selectedSubrace, setSelectedSubrace] = useState<ContentItemOption | null>(null);
  const [selectedClass, setSelectedClass] = useState<ContentItemOption | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<ContentItemOption | null>(null);
  const [selectedSubclass, setSelectedSubclass] = useState<ContentItemOption | null>(null);
  const [selectedSpells, setSelectedSpells] = useState<Set<string>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [abilityScores, setAbilityScores] = useState<Record<Ability, number>>({
    STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0,
  });

  const [races, setRaces] = useState<ContentItemOption[]>([]);
  const [subraces, setSubraces] = useState<ContentItemOption[]>([]);
  const [classes, setClasses] = useState<ContentItemOption[]>([]);
  const [backgrounds, setBackgrounds] = useState<ContentItemOption[]>([]);
  const [subclassesAll, setSubclassesAll] = useState<ContentItemOption[]>([]);
  const [spellsAll, setSpellsAll] = useState<ContentItemOption[]>([]);
  const [itemsAll, setItemsAll] = useState<ContentItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const client = getGqlClient(token);
    Promise.all([
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "race" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "subrace" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "class" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "background" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "subclass" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "spell" }),
      client.request<{ contentItems: ContentItemOption[] }>(CONTENT_ITEMS_QUERY, { type: "item" }),
    ]).then(([r, sr, c, b, sc, sp, it]) => {
      setRaces(r.contentItems);
      setSubraces(sr.contentItems);
      setClasses(c.contentItems);
      setBackgrounds(b.contentItems);
      setSubclassesAll(sc.contentItems);
      setSpellsAll(sp.contentItems);
      setItemsAll(it.contentItems);
    }).catch(() => setError("Error al cargar el contenido"));
  }, [token]);

  // Derive dynamic step list based on current selections
  const steps: Step[] = useMemo(() => {
    const base: Step[] = ["name", "race"];
    if (selectedRace && (selectedRace.data as RaceData)?.subraces?.length > 0) {
      base.push("subrace");
    }
    base.push("class", "scores", "background");
    if (selectedClass && (selectedClass.data as ClassData)?.subclass_level === 1) {
      base.push("subclass");
    }
    if (selectedClass && (selectedClass.data as ClassData)?.spell_casting) {
      base.push("spells");
    }
    base.push("equipment", "confirm");
    return base;
  }, [selectedRace, selectedClass]);

  const currentStepIndex = steps.indexOf(step);

  function nextStep() {
    const i = steps.indexOf(step);
    if (i >= 0 && i < steps.length - 1) setStep(steps[i + 1]!);
  }

  function prevStep() {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]!);
  }

  const subraceOptions = useMemo(() => {
    if (!selectedRace) return [];
    return subraces.filter(
      (s) => (s.data as SubraceData)?.parent_race === selectedRace.slug,
    );
  }, [selectedRace, subraces]);

  const subclassOptions = useMemo(() => {
    if (!selectedClass) return [];
    return subclassesAll.filter(
      (s) => (s.data as SubclassData)?.parent_class === selectedClass.slug,
    );
  }, [selectedClass, subclassesAll]);

  const availableSpells = useMemo(() => {
    if (!selectedClass) return [];
    const classSlug = selectedClass.slug;
    return spellsAll.filter((sp) => {
      const d = sp.data as SpellData;
      if (!d?.classes?.includes(classSlug)) return false;
      return d.level <= 1; // cantrips + 1st level at creation
    });
  }, [selectedClass, spellsAll]);

  const spellCaps = useMemo(() => {
    if (!selectedClass) return null;
    const allAssigned = Object.values(abilityScores).every((v) => v > 0);
    if (!allAssigned) return null;
    return getSpellCaps(
      selectedClass.data as ClassData,
      selectedClass.slug,
      1,
      abilityScores,
    );
  }, [selectedClass, abilityScores]);

  const casterKind = useMemo(() => {
    return selectedClass ? getCasterKind(selectedClass.slug) : "none";
  }, [selectedClass]);

  const selectedCantrips = useMemo(
    () =>
      Array.from(selectedSpells).filter((slug) => {
        const sp = spellsAll.find((x) => x.slug === slug);
        return sp && (sp.data as SpellData).level === 0;
      }),
    [selectedSpells, spellsAll],
  );

  const selectedLv1 = useMemo(
    () =>
      Array.from(selectedSpells).filter((slug) => {
        const sp = spellsAll.find((x) => x.slug === slug);
        return sp && (sp.data as SpellData).level === 1;
      }),
    [selectedSpells, spellsAll],
  );

  function tryToggleSpell(slug: string, level: number) {
    if (!spellCaps) return;
    const isSelected = selectedSpells.has(slug);
    if (isSelected) {
      toggleSet(selectedSpells, slug, setSelectedSpells);
      return;
    }
    const cantripCap = spellCaps.cantripsKnown;
    const spellCap = spellCaps.spellsKnown;
    if (level === 0 && selectedCantrips.length >= cantripCap) return;
    if (level >= 1 && selectedLv1.length >= spellCap) return;
    toggleSet(selectedSpells, slug, setSelectedSpells);
  }

  const availableEquipment = useMemo(() => {
    return itemsAll.filter((it) => {
      const d = it.data as ItemData;
      return d?.category && d.category !== "magic";
    });
  }, [itemsAll]);

  const usedValues = Object.values(abilityScores).filter((v) => v > 0);

  function assignScore(ability: Ability, value: number) {
    setAbilityScores((s) => ({ ...s, [ability]: value }));
  }

  function toggleSet(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  }

  async function handleCreate() {
    if (!selectedRace || !selectedClass || !selectedBackground) return;
    setLoading(true);
    setError(null);
    try {
      const client = getGqlClient(token);
      const data = await client.request<{ createCharacter: { id: string } }>(
        CREATE_CHARACTER_MUTATION,
        {
          input: {
            name,
            raceId: selectedRace.id,
            subraceId: selectedSubrace?.id ?? null,
            classId: selectedClass.id,
            subclassId: selectedSubclass?.id ?? null,
            backgroundId: selectedBackground.id,
            abilityScores,
            startingEquipmentIds: Array.from(selectedEquipment),
            knownSpellSlugs: Array.from(selectedSpells),
            preparedSpellSlugs: Array.from(selectedSpells).filter((slug) => {
              const sp = spellsAll.find((x) => x.slug === slug);
              return sp && (sp.data as SpellData).level > 0;
            }),
          },
        },
      );
      router.push(`/characters/${data.createCharacter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear personaje");
      setLoading(false);
    }
  }

  const canGoPrev = currentStepIndex > 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Ritual header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-parchment-500/80">
          <GameIcon kind="raw" slug="scroll-quill" size={18} />
          <span className="font-serif text-xs uppercase tracking-[0.35em]">Rito de creación</span>
          <GameIcon kind="raw" slug="scroll-quill" size={18} />
        </div>
        <h1 className="font-display text-3xl font-semibold text-stone-100 sm:text-4xl">
          Forja tu héroe
        </h1>
        <p className="mt-1 font-serif text-sm italic text-stone-500">
          Cada elección queda grabada en el tomo viviente.
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        steps={steps}
        currentIndex={currentStepIndex}
        onJump={(i) => i < currentStepIndex && setStep(steps[i]!)}
      />

      {/* Main ceremony card */}
      <div key={step} className="card-hero animate-fade-in">
        {error && (
          <div className="mb-4 rounded-md border border-red-800 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === "name" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}>
                El nombre del héroe
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Inscribe el nombre que los bardos cantarán en tabernas lejanas.
              </p>
            </div>
            <OrnateDivider />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-lg font-display tracking-wide"
              placeholder="Nombre del personaje"
              autoFocus
            />
          </div>
        )}

        {step === "race" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="race" slug="human" size={18} />}>
                Elige tu linaje
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                La sangre que corre por tus venas determina los primeros dones.
              </p>
            </div>
            <OrnateDivider />
            <TileGrid>
              {races.map((race) => (
                <Tile
                  key={race.id}
                  selected={selectedRace?.id === race.id}
                  onClick={() => {
                    setSelectedRace(race);
                    setSelectedSubrace(null);
                    const hasSub = (race.data as RaceData).subraces?.length > 0;
                    setStep(hasSub ? "subrace" : "class");
                  }}
                  icon={<GameIcon kind="race" slug={race.slug} size={28} className="text-parchment-400" />}
                  title={race.name}
                  meta={Object.entries((race.data as RaceData).ability_bonuses ?? {})
                    .map(([k, v]) => `+${v} ${k}`)
                    .join(" · ")}
                />
              ))}
            </TileGrid>
          </div>
        )}

        {step === "subrace" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="race" slug={selectedRace?.slug ?? "human"} size={18} />}>
                Elige tu sub-linaje
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Una rama más fina del árbol ancestral.
              </p>
            </div>
            <OrnateDivider />
            <TileGrid columns={2}>
              {subraceOptions.map((sr) => (
                <Tile
                  key={sr.id}
                  selected={selectedSubrace?.id === sr.id}
                  onClick={() => { setSelectedSubrace(sr); setStep("class"); }}
                  title={sr.name}
                  meta={Object.entries((sr.data as SubraceData).ability_bonuses ?? {})
                    .map(([k, v]) => `+${v} ${k}`)
                    .join(" · ")}
                />
              ))}
            </TileGrid>
          </div>
        )}

        {step === "class" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="crossed-swords" size={18} />}>
                Elige tu clase
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                La vocación que marcará tus tiradas y tus cicatrices.
              </p>
            </div>
            <OrnateDivider />
            <TileGrid>
              {classes.map((cls) => {
                const d = cls.data as ClassData;
                return (
                  <Tile
                    key={cls.id}
                    selected={selectedClass?.id === cls.id}
                    onClick={() => {
                      setSelectedClass(cls);
                      setSelectedSubclass(null);
                      setStep("scores");
                    }}
                    icon={<GameIcon kind="class" slug={cls.slug} size={28} className="text-parchment-400" />}
                    title={cls.name}
                    meta={
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono">d{d.hit_die}</span>
                        <span className="text-stone-700">·</span>
                        <span>{d.primary_ability.join("/")}</span>
                        {d.spell_casting && (
                          <>
                            <span className="text-stone-700">·</span>
                            <span className="text-ink-300">magia</span>
                          </>
                        )}
                      </span>
                    }
                  />
                );
              })}
            </TileGrid>
          </div>
        )}

        {step === "scores" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="ability" slug="STR" size={18} />}>
                Distribuye tus dones
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Asigna el array estándar: {STANDARD_ARRAY.join(" · ")}
              </p>
            </div>
            <OrnateDivider />
            <div className="grid gap-3 sm:grid-cols-2">
              {ABILITIES.map((ability) => {
                const score = abilityScores[ability];
                const modifier = Math.floor((score - 10) / 2);
                const modStr = score > 0 ? (modifier >= 0 ? `+${modifier}` : String(modifier)) : "—";
                return (
                  <div
                    key={ability}
                    className={`card-compact flex items-center gap-3 transition-colors ${
                      score > 0 ? "border-parchment-800/50" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-parchment-800/40 bg-stone-900 text-parchment-400 shadow-inset">
                      <GameIcon kind="ability" slug={ability} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                        {ability}
                      </div>
                      <div className="truncate font-display text-sm text-stone-200">
                        {ABILITY_LABELS[ability]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={score}
                        onChange={(e) => assignScore(ability, parseInt(e.target.value))}
                        className="input w-20 text-center font-display text-lg"
                      >
                        <option value={0}>—</option>
                        {STANDARD_ARRAY.map((val) => (
                          <option
                            key={val}
                            value={val}
                            disabled={usedValues.includes(val) && score !== val}
                          >
                            {val}
                          </option>
                        ))}
                      </select>
                      <div
                        className={`w-12 rounded border border-stone-800 bg-stone-950/60 px-1 py-1 text-center font-mono text-sm ${
                          score > 0 ? "text-parchment-300" : "text-stone-600"
                        }`}
                      >
                        {modStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-stone-500">
              {usedValues.length} / 6 puntuaciones asignadas
            </p>
          </div>
        )}

        {step === "background" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}>
                Tu trasfondo
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                La vida vivida antes de la primera aventura.
              </p>
            </div>
            <OrnateDivider />
            <div className="grid gap-2 sm:grid-cols-2">
              {backgrounds.map((bg) => (
                <Tile
                  key={bg.id}
                  selected={selectedBackground?.id === bg.id}
                  onClick={() => { setSelectedBackground(bg); nextStep(); }}
                  title={bg.name}
                  meta={(bg.data as BackgroundData).skill_proficiencies.join(", ")}
                />
              ))}
            </div>
          </div>
        )}

        {step === "subclass" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="class" slug={selectedClass?.slug ?? "wizard"} size={18} />}>
                Camino de {selectedClass?.name}
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                A nivel 1 juras tu senda. Escoge con cuidado.
              </p>
            </div>
            <OrnateDivider />
            <div className="grid gap-2">
              {subclassOptions.map((sc) => (
                <Tile
                  key={sc.id}
                  selected={selectedSubclass?.id === sc.id}
                  onClick={() => { setSelectedSubclass(sc); nextStep(); }}
                  title={(sc.data as SubclassData).flavor_name || sc.name}
                  meta={sc.description ?? undefined}
                />
              ))}
            </div>
          </div>
        )}

        {step === "spells" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="crystal-ball" size={18} />}>
                Hechizos conocidos
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                {spellCapsNote(casterKind, spellCaps)}
              </p>
            </div>
            <OrnateDivider />

            {spellCaps && spellCaps.cantripsKnown > 0 && (
              <SpellPicker
                spells={availableSpells.filter((s) => (s.data as SpellData).level === 0)}
                title={`Cantrips — ${selectedCantrips.length} / ${spellCaps.cantripsKnown}`}
                selected={selectedSpells}
                disabledIfNotSelected={selectedCantrips.length >= spellCaps.cantripsKnown}
                onToggle={(slug) => tryToggleSpell(slug, 0)}
              />
            )}

            {spellCaps && spellCaps.spellsKnown > 0 && (
              <SpellPicker
                spells={availableSpells.filter((s) => (s.data as SpellData).level === 1)}
                title={`Nivel 1 — ${selectedLv1.length} / ${spellCaps.spellsKnown}`}
                selected={selectedSpells}
                disabledIfNotSelected={selectedLv1.length >= spellCaps.spellsKnown}
                onToggle={(slug) => tryToggleSpell(slug, 1)}
              />
            )}
          </div>
        )}

        {step === "equipment" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="crossed-swords" size={18} />}>
                Equipo inicial
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Las herramientas de tu viaje. Podrás ajustarlas más tarde.
              </p>
            </div>
            <OrnateDivider />
            <EquipmentPicker
              items={availableEquipment}
              selected={selectedEquipment}
              onToggle={(id) => toggleSet(selectedEquipment, id, setSelectedEquipment)}
            />
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}>
                Sellar el pergamino
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Revisa el pacto antes de firmarlo con tu sangre.
              </p>
            </div>
            <OrnateDivider />

            {/* Identity summary */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryItem
                icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}
                label="Nombre"
                value={name}
              />
              <SummaryItem
                icon={<GameIcon kind="race" slug={selectedRace?.slug ?? "human"} size={18} />}
                label="Raza"
                value={
                  selectedRace
                    ? selectedSubrace
                      ? `${selectedRace.name} (${selectedSubrace.name})`
                      : selectedRace.name
                    : "—"
                }
              />
              <SummaryItem
                icon={<GameIcon kind="class" slug={selectedClass?.slug ?? "wizard"} size={18} />}
                label="Clase"
                value={
                  selectedClass
                    ? selectedSubclass
                      ? `${selectedClass.name} (${selectedSubclass.name})`
                      : selectedClass.name
                    : "—"
                }
              />
              <SummaryItem
                icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}
                label="Trasfondo"
                value={selectedBackground?.name ?? "—"}
              />
            </div>

            {/* Ability score grid */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ABILITIES.map((ab) => {
                const score = abilityScores[ab];
                const mod = Math.floor((score - 10) / 2);
                const modStr = score > 0 ? (mod >= 0 ? `+${mod}` : String(mod)) : "—";
                return (
                  <StatCard
                    key={ab}
                    label={ab}
                    value={<span className="font-mono">{score || "—"}</span>}
                    hint={modStr}
                    icon={<GameIcon kind="ability" slug={ab} size={12} />}
                    tone="primary"
                  />
                );
              })}
            </div>

            {selectedSpells.size > 0 && (
              <div className="card-compact">
                <div className="mb-1 flex items-center gap-2">
                  <GameIcon kind="raw" slug="crystal-ball" size={14} className="text-ink-300" />
                  <span className="label">Hechizos ({selectedSpells.size})</span>
                </div>
                <p className="text-xs text-stone-400">
                  {Array.from(selectedSpells).join(", ")}
                </p>
              </div>
            )}

            {selectedEquipment.size > 0 && (
              <div className="card-compact">
                <div className="mb-1 flex items-center gap-2">
                  <GameIcon kind="raw" slug="crossed-swords" size={14} className="text-parchment-400" />
                  <span className="label">Equipo ({selectedEquipment.size})</span>
                </div>
                <p className="text-xs text-stone-400">
                  {Array.from(selectedEquipment)
                    .map((id) => itemsAll.find((x) => x.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer with navigation */}
        <div className="mt-6">
          <OrnateDivider ornament="none" />
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevStep}
              disabled={!canGoPrev}
              className="btn-ghost text-sm disabled:invisible"
            >
              ← Atrás
            </button>
            <div className="font-serif text-[11px] italic tracking-wide text-stone-500">
              Paso {currentStepIndex + 1} de {steps.length}
            </div>
            {isLastStep ? (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Forjando…" : "Sellar y crear"}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canAdvance(step, {
                  name,
                  selectedRace,
                  selectedSubrace,
                  selectedClass,
                  selectedBackground,
                  selectedSubclass,
                  usedValues,
                  subraceOptions,
                  subclassOptions,
                })}
                className="btn-primary text-sm"
              >
                Siguiente →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function canAdvance(
  step: Step,
  s: {
    name: string;
    selectedRace: ContentItemOption | null;
    selectedSubrace: ContentItemOption | null;
    selectedClass: ContentItemOption | null;
    selectedBackground: ContentItemOption | null;
    selectedSubclass: ContentItemOption | null;
    usedValues: number[];
    subraceOptions: ContentItemOption[];
    subclassOptions: ContentItemOption[];
  },
): boolean {
  switch (step) {
    case "name": return s.name.trim().length > 0;
    case "race": return !!s.selectedRace;
    case "subrace": return s.subraceOptions.length === 0 || !!s.selectedSubrace;
    case "class": return !!s.selectedClass;
    case "scores": return s.usedValues.length >= 6;
    case "background": return !!s.selectedBackground;
    case "subclass": return s.subclassOptions.length === 0 || !!s.selectedSubclass;
    case "spells": return true;
    case "equipment": return true;
    default: return true;
  }
}

/* ─────────────────────────── Stepper ─────────────────────────── */
function Stepper({
  steps,
  currentIndex,
  onJump,
}: {
  steps: Step[];
  currentIndex: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="relative overflow-x-auto">
      <div className="relative mx-auto flex min-w-max items-start justify-center gap-1 px-2 pb-2">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const upcoming = i > currentIndex;
          return (
            <div key={s} className="flex items-start">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={upcoming}
                className="group flex w-20 flex-col items-center gap-1.5 text-center disabled:cursor-default"
              >
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm transition-all ${
                    done
                      ? "border-parchment-500 bg-parchment-600 text-white shadow-inset"
                      : active
                      ? "border-parchment-400 bg-stone-900 text-parchment-300 shadow-glow"
                      : "border-stone-700 bg-stone-900 text-stone-600"
                  }`}
                >
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                  {active && (
                    <span className="absolute -inset-1 animate-pulse-soft rounded-full border border-parchment-500/40" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${
                    active ? "text-parchment-300" : done ? "text-stone-300" : "text-stone-600"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`mt-4 h-px w-4 sm:w-6 ${
                    done ? "bg-parchment-600/60" : "bg-stone-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── Shared tile primitives ─────────────────────── */
function TileGrid({
  children,
  columns,
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
}) {
  const cls = columns === 2
    ? "grid gap-2 grid-cols-1 sm:grid-cols-2"
    : "grid gap-2 grid-cols-2 sm:grid-cols-3";
  return <div className={cls}>{children}</div>;
}

function Tile({
  selected,
  onClick,
  icon,
  title,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
        selected
          ? "border-parchment-500 bg-parchment-600/10 text-parchment-300 shadow-glow"
          : "border-stone-800 bg-stone-900/50 text-stone-300 hover:border-parchment-800/50 hover:bg-stone-900 hover:shadow-elevated"
      }`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border shadow-inset ${
              selected
                ? "border-parchment-500/50 bg-parchment-600/10"
                : "border-stone-800 bg-stone-950 group-hover:border-parchment-800/40"
            }`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base text-stone-100 group-hover:text-parchment-200">
            {title}
          </div>
          {meta && (
            <div className="mt-0.5 text-[11px] text-stone-500">{meta}</div>
          )}
        </div>
      </div>
    </button>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card-compact flex items-center gap-3">
      {icon && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-stone-800 bg-stone-950 text-parchment-400">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="label">{label}</div>
        <div className="truncate font-display text-sm text-stone-100">{value}</div>
      </div>
    </div>
  );
}

function SpellPicker({
  spells,
  title,
  selected,
  disabledIfNotSelected,
  onToggle,
}: {
  spells: ContentItemOption[];
  title: string;
  selected: Set<string>;
  disabledIfNotSelected?: boolean;
  onToggle: (slug: string) => void;
}) {
  if (spells.length === 0) return null;
  return (
    <details className="card-compact border-stone-800 bg-stone-900/50 p-0 overflow-hidden" open>
      <summary className="cursor-pointer border-b border-stone-800 px-3 py-2 font-display text-sm text-parchment-300 select-none hover:text-parchment-200">
        {title}
      </summary>
      <div className="max-h-80 overflow-y-auto p-2 grid gap-1">
        {spells.map((sp) => {
          const isSelected = selected.has(sp.slug);
          const isDisabled = !isSelected && !!disabledIfNotSelected;
          return (
            <SpellRow
              key={sp.id}
              spell={{
                id: sp.id,
                slug: sp.slug,
                name: sp.name,
                description: sp.description,
                data: sp.data as SpellData,
              }}
              selected={isSelected}
              disabled={isDisabled}
              onToggle={() => onToggle(sp.slug)}
            />
          );
        })}
      </div>
    </details>
  );
}

function spellCapsNote(kind: ReturnType<typeof getCasterKind>, caps: { cantripsKnown: number; spellsKnown: number } | null): string {
  if (!caps) return "Elige primero raza, clase y puntuaciones para calcular los límites.";
  const c = caps.cantripsKnown;
  const s = caps.spellsKnown;
  if (kind === "known") {
    return `Clase de "hechizos conocidos": al nivel 1 conoces ${c} cantrips y ${s} hechizos de nivel 1. Podrás aprender (y cambiar) hechizos al subir de nivel.`;
  }
  if (kind === "prepared") {
    return `Clase de preparación: conoces todos los hechizos de tu clase. Elige ${c} cantrips y prepara ${s} hechizos de nivel 1 para empezar (puedes rotarlos cada descanso largo).`;
  }
  if (kind === "spellbook") {
    return `Mago: conoces ${c} cantrips y empiezas con ${s} hechizos en tu grimorio. Prepararás INT + nivel al día.`;
  }
  return "Esta clase no lanza hechizos.";
}

function EquipmentPicker({
  items,
  selected,
  onToggle,
}: {
  items: ContentItemOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "weapon" | "armor" | "gear" | "tool">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const d = it.data as ItemData;
      if (filter !== "all") {
        if (filter === "armor" && d.category !== "armor" && d.category !== "shield") return false;
        if (filter !== "armor" && d.category !== filter) return false;
      }
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, search]);

  const FILTER_LABELS: Record<typeof filter, string> = {
    all: "Todo",
    weapon: "Armas",
    armor: "Armadura",
    gear: "Útiles",
    tool: "Herramientas",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar objeto…"
          className="input flex-1 text-sm"
        />
        <div className="flex flex-wrap gap-1 text-xs">
          {(["all", "weapon", "armor", "gear", "tool"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 border transition-colors ${
                filter === f
                  ? "border-parchment-500 bg-parchment-600/15 text-parchment-300"
                  : "border-stone-700 text-stone-400 hover:border-stone-500"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/40 p-2 grid gap-1">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-stone-500 py-6">Sin resultados</p>
        ) : (
          filtered.map((it) => {
            const d = it.data as ItemData;
            const isSelected = selected.has(it.id);
            return (
              <button
                key={it.id}
                onClick={() => onToggle(it.id)}
                className={`flex items-center justify-between gap-2 rounded border px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-parchment-500 bg-parchment-600/15"
                    : "border-stone-800 hover:border-stone-600"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-stone-200">{it.name}</div>
                  <div className="truncate text-[10px] text-stone-500">
                    {d.category}
                    {d.weapon ? ` · ${d.weapon.damage_dice} ${d.weapon.damage_type}` : ""}
                    {d.armor ? ` · CA ${d.armor.base_ac}` : ""}
                    {d.cost ? ` · ${d.cost.amount} ${d.cost.currency}` : ""}
                  </div>
                </div>
                <span className={`h-3 w-3 flex-shrink-0 rounded-full border transition-colors ${
                  isSelected ? "border-parchment-500 bg-parchment-500" : "border-stone-600"
                }`} />
              </button>
            );
          })
        )}
      </div>
      <p className="text-center text-[11px] text-stone-500">
        {selected.size} seleccionados
      </p>
    </div>
  );
}
