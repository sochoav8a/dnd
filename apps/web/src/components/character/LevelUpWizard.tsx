"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ABILITIES, getSpellCaps, getCasterKind } from "@dnd/shared";
import type {
  Character,
  ContentItem,
  ClassData,
  SubclassData,
  SpellData,
  Ability,
} from "@dnd/shared";
import { getGqlClient, LEVEL_UP_MUTATION } from "@/lib/graphql";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { OrnateDivider } from "@/components/ui/OrnateDivider";
import { SpellRow } from "@/components/character/SpellRow";

type Step = "hp" | "subclass" | "asi" | "spells" | "confirm";

interface Props {
  character: Character;
  subclasses: ContentItem[];
  feats: ContentItem[];
  spells: ContentItem[];
  token: string;
}

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

const STEP_LABEL: Record<Step, string> = {
  hp: "Vida",
  subclass: "Arquetipo",
  asi: "ASI / Feat",
  spells: "Hechizos",
  confirm: "Confirmar",
};

export function LevelUpWizard({ character, subclasses, feats, spells, token }: Props) {
  const router = useRouter();

  const classData = (character as unknown as { class: { data: ClassData; slug: string; name: string } }).class.data;
  const classSlug = (character as unknown as { class: { slug: string } }).class.slug;
  const className = (character as unknown as { class: { name: string } }).class.name;
  const currentLevel = character.level;
  const newLevel = currentLevel + 1;
  const hitDie = classData.hit_die;

  const needsSubclass =
    classData.subclass_level === newLevel && !character.subclassId;
  const isAsiLevel = ASI_LEVELS.has(newLevel);
  const isCaster = !!classData.spell_casting;
  const casterKind = getCasterKind(classSlug);

  const currentCaps = useMemo(
    () => getSpellCaps(classData, classSlug, currentLevel, character.state.ability_scores),
    [classData, classSlug, currentLevel, character.state.ability_scores],
  );
  const nextCaps = useMemo(
    () => getSpellCaps(classData, classSlug, newLevel, character.state.ability_scores),
    [classData, classSlug, newLevel, character.state.ability_scores],
  );

  const cantripsDelta = Math.max(0, nextCaps.cantripsKnown - currentCaps.cantripsKnown);
  const spellsDelta = Math.max(0, nextCaps.spellsKnown - currentCaps.spellsKnown);
  const needsSpellsStep = isCaster && (cantripsDelta > 0 || spellsDelta > 0 || casterKind !== "none");

  const steps: Step[] = useMemo(() => {
    const s: Step[] = ["hp"];
    if (needsSubclass) s.push("subclass");
    if (isAsiLevel) s.push("asi");
    if (needsSpellsStep) s.push("spells");
    s.push("confirm");
    return s;
  }, [needsSubclass, isAsiLevel, needsSpellsStep]);

  const [step, setStep] = useState<Step>(steps[0]!);
  const [hpMode, setHpMode] = useState<"average" | "roll">("average");
  const [hpRoll, setHpRoll] = useState<string>("");
  const [selectedSubclass, setSelectedSubclass] = useState<ContentItem | null>(null);
  const [asiMode, setAsiMode] = useState<"asi" | "feat">("asi");
  const [asi, setAsi] = useState<Partial<Record<Ability, number>>>({});
  const [selectedFeat, setSelectedFeat] = useState<ContentItem | null>(null);
  const [featAbilityChoice, setFeatAbilityChoice] = useState<Ability | "">("");
  const [showAllFeats, setShowAllFeats] = useState(false);

  const eligibleFeats = useMemo(() => {
    return feats.filter((f) => {
      const data = f.data as { prerequisites?: unknown };
      return prereqFailureReason(data.prerequisites, character) === null;
    });
  }, [feats, character]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spell state initialised from character's current lists
  const [knownSpells, setKnownSpells] = useState<Set<string>>(
    () => new Set(character.state.known_spells),
  );
  const [preparedSpells, setPreparedSpells] = useState<Set<string>>(
    () => new Set(character.state.prepared_spells),
  );

  const subclassOptions = useMemo(
    () => subclasses.filter((s) => (s.data as SubclassData).parent_class === classSlug),
    [subclasses, classSlug],
  );

  // Filter spells for this class, up to the new max spell level
  const classSpells = useMemo(
    () =>
      spells.filter((sp) => {
        const d = sp.data as SpellData;
        return d?.classes?.includes(classSlug) && d.level <= nextCaps.maxSpellLevel;
      }),
    [spells, classSlug, nextCaps.maxSpellLevel],
  );

  const cantrips = classSpells.filter((s) => (s.data as SpellData).level === 0);
  const leveled = classSpells.filter((s) => (s.data as SpellData).level > 0);

  const selectedCantrips = Array.from(knownSpells).filter((slug) => {
    const sp = spells.find((x) => x.slug === slug);
    return sp && (sp.data as SpellData).level === 0;
  });
  const selectedLeveled = Array.from(knownSpells).filter((slug) => {
    const sp = spells.find((x) => x.slug === slug);
    return sp && (sp.data as SpellData).level >= 1;
  });

  const cantripsRemaining = nextCaps.cantripsKnown - selectedCantrips.length;
  const spellsRemaining = nextCaps.spellsKnown - selectedLeveled.length;

  const asiTotal = Object.values(asi).reduce((a, b) => a + (b ?? 0), 0);
  const asiValid = asiTotal === 2 && Object.values(asi).every((v) => !v || v === 1 || v === 2);

  const currentStepIdx = steps.indexOf(step);
  function goNext() {
    const i = steps.indexOf(step);
    if (i >= 0 && i < steps.length - 1) setStep(steps[i + 1]!);
  }
  function goPrev() {
    const i = steps.indexOf(step);
    if (i > 0) setStep(steps[i - 1]!);
  }

  function setAsiValue(ab: Ability, val: number) {
    setAsi((prev) => {
      const next = { ...prev, [ab]: val };
      if (val === 0) delete next[ab];
      return next;
    });
  }

  function toggleSpell(slug: string) {
    const sp = spells.find((x) => x.slug === slug);
    if (!sp) return;
    const isCantrip = (sp.data as SpellData).level === 0;
    const isSelected = knownSpells.has(slug);
    const next = new Set(knownSpells);

    if (isSelected) {
      next.delete(slug);
      const nextPrep = new Set(preparedSpells);
      nextPrep.delete(slug);
      setPreparedSpells(nextPrep);
    } else {
      // Enforce caps
      if (isCantrip && cantripsRemaining <= 0) return;
      if (!isCantrip && spellsRemaining <= 0) return;
      next.add(slug);
      // Auto-prepare non-cantrips for prepared casters; for known/spellbook, user can still manage separately
      if (!isCantrip && (casterKind === "prepared" || casterKind === "known" || casterKind === "spellbook")) {
        const nextPrep = new Set(preparedSpells);
        nextPrep.add(slug);
        setPreparedSpells(nextPrep);
      }
    }
    setKnownSpells(next);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const client = getGqlClient(token);
      const input: Record<string, unknown> = {
        characterId: character.id,
        newLevel,
      };
      if (hpMode === "roll" && hpRoll) {
        const n = parseInt(hpRoll);
        if (!isNaN(n) && n >= 1 && n <= hitDie) input["hitPointRoll"] = n;
      }
      if (selectedSubclass) input["subclassId"] = selectedSubclass.id;
      if (isAsiLevel) {
        if (asiMode === "asi" && asiValid) {
          input["abilityScoreImprovements"] = asi;
        } else if (asiMode === "feat" && selectedFeat) {
          input["featId"] = selectedFeat.id;
          if (featAbilityChoice) {
            input["featAbilityChoice"] = featAbilityChoice;
          }
        }
      }
      if (needsSpellsStep) {
        input["knownSpellSlugs"] = Array.from(knownSpells);
        input["preparedSpellSlugs"] = Array.from(preparedSpells);
      }
      await client.request(LEVEL_UP_MUTATION, { input });
      router.push(`/characters/${character.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir de nivel");
      setLoading(false);
    }
  }

  const isLast = currentStepIdx === steps.length - 1;

  function canAdvance(): boolean {
    switch (step) {
      case "hp":
        if (hpMode === "average") return true;
        const n = parseInt(hpRoll);
        return !isNaN(n) && n >= 1 && n <= hitDie;
      case "subclass": return !!selectedSubclass;
      case "asi":
        if (asiMode === "asi") return asiValid;
        if (!selectedFeat) return false;
        // If the feat requires an ability choice, user must pick one
        const featData = selectedFeat.data as {
          ability_score_choice?: { amount: number; from: string[] };
        };
        if (featData.ability_score_choice && !featAbilityChoice) return false;
        return true;
      case "spells": return true;
      case "confirm": return !loading;
      default: return true;
    }
  }

  const avgHp = Math.floor(hitDie / 2) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Ritual header */}
      <div className="card-hero text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-parchment-500/80">
          <GameIcon kind="raw" slug="scroll-quill" size={16} />
          <span className="font-serif text-[11px] uppercase tracking-[0.35em]">Rito de ascenso</span>
          <GameIcon kind="raw" slug="scroll-quill" size={16} />
        </div>
        <div className="mt-1 flex items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-stone-800 bg-stone-950 font-display text-2xl text-stone-500">
            {currentLevel}
          </div>
          <div className="font-display text-3xl text-parchment-500">→</div>
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-parchment-500/60 bg-parchment-600/10 font-display text-3xl text-parchment-200 shadow-glow">
            {newLevel}
          </div>
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-stone-100">
          {character.name}
        </h1>
        <p className="mt-1 flex items-center justify-center gap-2 font-serif text-sm italic text-stone-400">
          <GameIcon kind="class" slug={classSlug} size={14} className="text-parchment-400" />
          <span>{className}</span>
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        steps={steps}
        currentIndex={currentStepIdx}
        onJump={(i) => i <= currentStepIdx && setStep(steps[i]!)}
      />

      {/* Ceremony card */}
      <div key={step} className="card-hero animate-fade-in space-y-5">
        {error && (
          <div className="rounded-md border border-red-800 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === "hp" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="hearts" size={18} />}>
                Puntos de Golpe
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Dado de golpe d{hitDie}. El cuerpo se fortalece tras la prueba.
              </p>
            </div>
            <OrnateDivider />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setHpMode("average")}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                  hpMode === "average"
                    ? "border-parchment-500 bg-parchment-600/10 shadow-glow"
                    : "border-stone-800 bg-stone-900/50 hover:border-parchment-800/50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-base text-stone-100">Promedio</span>
                  <span className="badge-neutral">Seguro</span>
                </div>
                <div className="font-display text-3xl text-parchment-300">
                  +{avgHp}
                  <span className="ml-1 text-xs text-stone-500">+ CON</span>
                </div>
                <p className="mt-1 font-serif text-[11px] italic text-stone-500">
                  Sin riesgo. El estándar de los cautos.
                </p>
              </button>
              <button
                onClick={() => setHpMode("roll")}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                  hpMode === "roll"
                    ? "border-parchment-500 bg-parchment-600/10 shadow-glow"
                    : "border-stone-800 bg-stone-900/50 hover:border-parchment-800/50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-base text-stone-100">Tirada</span>
                  <span className="badge-warning">Riesgo</span>
                </div>
                <div className="font-display text-3xl text-parchment-300">
                  d{hitDie}
                  <span className="ml-1 text-xs text-stone-500">+ CON</span>
                </div>
                <p className="mt-1 font-serif text-[11px] italic text-stone-500">
                  Destino de los audaces. Rango 1–{hitDie}.
                </p>
              </button>
            </div>
            {hpMode === "roll" && (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label mb-1 block">Tirada d{hitDie}</label>
                  <input
                    type="number"
                    min={1}
                    max={hitDie}
                    value={hpRoll}
                    onChange={(e) => setHpRoll(e.target.value)}
                    className="input text-center font-display text-xl"
                    placeholder={`1–${hitDie}`}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === "subclass" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="class" slug={classSlug} size={18} />}>
                Jura tu camino
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                A este nivel el {className} define su arquetipo. El pacto es permanente.
              </p>
            </div>
            <OrnateDivider />
            <div className="grid gap-2">
              {subclassOptions.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedSubclass(sc)}
                  className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all ${
                    selectedSubclass?.id === sc.id
                      ? "border-parchment-500 bg-parchment-600/10 shadow-glow"
                      : "border-stone-800 bg-stone-900/50 hover:border-parchment-800/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border shadow-inset ${
                        selectedSubclass?.id === sc.id
                          ? "border-parchment-500/50 bg-parchment-600/10 text-parchment-300"
                          : "border-stone-800 bg-stone-950 text-parchment-400"
                      }`}
                    >
                      <GameIcon kind="class" slug={classSlug} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base text-stone-100 group-hover:text-parchment-200">
                        {(sc.data as SubclassData).flavor_name || sc.name}
                      </div>
                      {sc.description && (
                        <p className="mt-1 text-xs leading-relaxed text-stone-400">
                          {sc.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "asi" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="ability" slug="STR" size={18} />}>
                Mejora o don
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Una chispa de crecimiento: afina tus atributos, o reclama un don único.
              </p>
            </div>
            <OrnateDivider />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAsiMode("asi")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-display transition-colors ${
                  asiMode === "asi"
                    ? "border-parchment-500 bg-parchment-600/15 text-parchment-300 shadow-glow"
                    : "border-stone-800 bg-stone-900/50 text-stone-300 hover:border-parchment-800/50"
                }`}
              >
                +2 a puntuaciones
              </button>
              <button
                onClick={() => setAsiMode("feat")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-display transition-colors ${
                  asiMode === "feat"
                    ? "border-parchment-500 bg-parchment-600/15 text-parchment-300 shadow-glow"
                    : "border-stone-800 bg-stone-900/50 text-stone-300 hover:border-parchment-800/50"
                }`}
              >
                Reclamar un don
              </button>
            </div>

            {asiMode === "asi" && (
              <div className="space-y-3">
                <p className="text-xs text-stone-500">
                  Distribuye 2 puntos: +2 a una puntuación, o +1 a dos distintas. Máximo 20.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ABILITIES.map((ab) => {
                    const current = character.state.ability_scores[ab];
                    const bonus = asi[ab] ?? 0;
                    const remaining = 2 - asiTotal + bonus;
                    const after = current + bonus;
                    return (
                      <div
                        key={ab}
                        className={`card-compact flex items-center gap-3 ${
                          bonus > 0 ? "border-parchment-700/50" : ""
                        }`}
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-parchment-800/40 bg-stone-900 text-parchment-400 shadow-inset">
                          <GameIcon kind="ability" slug={ab} size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="label">{ab}</div>
                          <div className="font-display text-sm text-stone-100">
                            {current}
                            {bonus > 0 && (
                              <>
                                <span className="mx-1 text-stone-600">→</span>
                                <span className="text-parchment-300">{after}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((val) => (
                            <button
                              key={val}
                              onClick={() => setAsiValue(ab, val)}
                              disabled={val > remaining || current + val > 20}
                              className={`h-7 w-7 rounded font-mono text-[11px] font-bold transition-colors ${
                                bonus === val
                                  ? "bg-parchment-500 text-white shadow-glow"
                                  : "border border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500 disabled:opacity-30"
                              }`}
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-[11px] text-stone-500">
                  Total: {asiTotal}/2
                </p>
              </div>
            )}

            {asiMode === "feat" && (
              <div className="space-y-3">
                <FeatFilterToggle
                  showAll={showAllFeats}
                  onToggle={() => setShowAllFeats((v) => !v)}
                  filteredOut={feats.length - eligibleFeats.length}
                />
                <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">
                  {(showAllFeats ? feats : eligibleFeats).map((f) => {
                    const fd = f.data as {
                      ability_score_improvement?: Record<string, number>;
                      ability_score_choice?: { amount: number; from: string[] };
                      prerequisites?: unknown;
                    };
                    const asiHint = fd.ability_score_improvement
                      ? Object.entries(fd.ability_score_improvement)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `+${v} ${k}`)
                          .join(", ")
                      : null;
                    const choiceHint = fd.ability_score_choice
                      ? `+${fd.ability_score_choice.amount} a elegir (${fd.ability_score_choice.from.join("/")})`
                      : null;
                    const prereqFailReason = prereqFailureReason(
                      fd.prerequisites,
                      character,
                    );
                    const disabled = !!prereqFailReason && showAllFeats;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (disabled) return;
                          setSelectedFeat(f);
                          setFeatAbilityChoice("");
                        }}
                        disabled={disabled}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          selectedFeat?.id === f.id
                            ? "border-parchment-500 bg-parchment-600/10 shadow-glow"
                            : disabled
                              ? "border-stone-800 bg-stone-900/30 opacity-50 cursor-not-allowed"
                              : "border-stone-800 bg-stone-900/50 hover:border-parchment-800/50"
                        }`}
                        title={prereqFailReason ?? undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display text-sm text-stone-100">
                            {f.name}
                          </div>
                          <div className="flex items-center gap-1">
                            {prereqFailReason && (
                              <span className="badge-danger text-[9px]">
                                {prereqFailReason}
                              </span>
                            )}
                            {(asiHint || choiceHint) && (
                              <span className="badge-primary text-[9px]">
                                {asiHint ?? choiceHint}
                              </span>
                            )}
                          </div>
                        </div>
                        {f.description && (
                          <p className="mt-1 text-xs leading-relaxed text-stone-400">
                            {f.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Ability choice picker (only when feat requires it) */}
                {selectedFeat &&
                  (() => {
                    const fd = selectedFeat.data as {
                      ability_score_choice?: { amount: number; from: string[] };
                    };
                    if (!fd.ability_score_choice) return null;
                    const { amount, from } = fd.ability_score_choice;
                    return (
                      <div className="rounded-lg border border-parchment-800/50 bg-parchment-600/5 p-3">
                        <p className="mb-2 font-serif text-sm italic text-parchment-300">
                          {selectedFeat.name} otorga +{amount} a una habilidad.
                          Elige cuál:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {from.map((ab) => {
                            const abKey = ab as Ability;
                            const isSelected = featAbilityChoice === abKey;
                            const current = character.state.ability_scores[abKey];
                            return (
                              <button
                                key={ab}
                                type="button"
                                onClick={() => setFeatAbilityChoice(abKey)}
                                className={`flex flex-col items-center gap-0.5 rounded-md border px-3 py-1.5 transition-colors ${
                                  isSelected
                                    ? "border-parchment-500 bg-parchment-600/20 text-parchment-200 shadow-inset"
                                    : "border-stone-700 bg-stone-900 text-stone-400 hover:border-parchment-700/60 hover:text-stone-200"
                                }`}
                              >
                                <span className="font-display text-xs font-semibold">
                                  {ab}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {current} → {Math.min(20, current + amount)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        )}

        {step === "spells" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="crystal-ball" size={18} />}>
                Hechizos
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                {spellsLevelUpNote({
                  casterKind,
                  currentCaps,
                  nextCaps,
                  cantripsDelta,
                  spellsDelta,
                })}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                Nivel máximo de slot: {nextCaps.maxSpellLevel || "—"}
              </p>
            </div>
            <OrnateDivider />

            {cantrips.length > 0 && nextCaps.cantripsKnown > 0 && (
              <>
                <SectionTitle>Cantrips <span className="ml-1 font-mono text-xs text-stone-500">{selectedCantrips.length}/{nextCaps.cantripsKnown}</span></SectionTitle>
                <SpellGroup
                  spells={cantrips}
                  known={knownSpells}
                  disabledIfNotSelected={cantripsRemaining <= 0}
                  onToggle={toggleSpell}
                />
              </>
            )}

            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
              if (lvl > nextCaps.maxSpellLevel) return null;
              const spellsAtLevel = leveled.filter((s) => (s.data as SpellData).level === lvl);
              if (spellsAtLevel.length === 0) return null;
              const countSel = selectedLeveled.filter((slug) => {
                const sp = spells.find((x) => x.slug === slug);
                return sp && (sp.data as SpellData).level === lvl;
              }).length;
              return (
                <div key={lvl} className="space-y-2">
                  <OrnateDivider ornament="fleur" />
                  <SectionTitle>
                    Nivel {lvl}
                    <span className="ml-1 font-mono text-xs text-stone-500">
                      {countSel} elegidos · {spellsRemaining} restantes
                    </span>
                  </SectionTitle>
                  <SpellGroup
                    spells={spellsAtLevel}
                    known={knownSpells}
                    disabledIfNotSelected={spellsRemaining <= 0}
                    onToggle={toggleSpell}
                  />
                </div>
              );
            })}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <div>
              <SectionTitle icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}>
                Sellar el ascenso
              </SectionTitle>
              <p className="mt-2 font-serif text-sm italic text-stone-400">
                Revisa el pacto de nivel antes de firmarlo.
              </p>
            </div>
            <OrnateDivider />
            <dl className="grid gap-3 sm:grid-cols-2">
              <SummaryItem
                icon={<GameIcon kind="raw" slug="scroll-quill" size={18} />}
                label="Nivel"
                value={
                  <span>
                    {currentLevel}{" "}
                    <span className="text-stone-600">→</span>{" "}
                    <span className="text-parchment-400">{newLevel}</span>
                  </span>
                }
              />
              <SummaryItem
                icon={<GameIcon kind="raw" slug="hearts" size={18} />}
                label="HP"
                value={
                  hpMode === "average"
                    ? `+${avgHp} (promedio) + CON`
                    : `Tirada: ${hpRoll || "?"} + CON`
                }
              />
              {selectedSubclass && (
                <SummaryItem
                  icon={<GameIcon kind="class" slug={classSlug} size={18} />}
                  label="Arquetipo"
                  value={selectedSubclass.name}
                />
              )}
              {isAsiLevel && asiMode === "asi" && (
                <SummaryItem
                  icon={<GameIcon kind="ability" slug="STR" size={18} />}
                  label="ASI"
                  value={
                    Object.entries(asi)
                      .filter(([, v]) => v)
                      .map(([ab, v]) => `+${v} ${ab}`)
                      .join(", ") || "—"
                  }
                />
              )}
              {isAsiLevel && asiMode === "feat" && selectedFeat && (
                <SummaryItem
                  icon={<GameIcon kind="raw" slug="swords-emblem" size={18} />}
                  label="Feat"
                  value={selectedFeat.name}
                />
              )}
            </dl>
            {needsSpellsStep && (
              <div className="card-compact">
                <div className="mb-1 flex items-center gap-2">
                  <GameIcon kind="raw" slug="crystal-ball" size={14} className="text-ink-300" />
                  <span className="label">Hechizos conocidos ({knownSpells.size})</span>
                </div>
                <p className="max-h-32 overflow-y-auto text-xs text-stone-400">
                  {Array.from(knownSpells).sort().join(", ") || "—"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-6">
          <OrnateDivider ornament="none" />
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStepIdx === 0}
              className="btn-ghost text-sm disabled:invisible"
            >
              ← Atrás
            </button>
            <div className="font-serif text-[11px] italic tracking-wide text-stone-500">
              Paso {currentStepIdx + 1} de {steps.length}
            </div>
            {isLast ? (
              <button
                onClick={submit}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Aplicando…" : `Ascender a ${newLevel}`}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canAdvance()}
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
    <div className="overflow-x-auto">
      <div className="mx-auto flex min-w-max items-start justify-center gap-1 px-2 pb-2">
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
                  {STEP_LABEL[s]}
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

function SpellGroup({
  spells,
  known,
  disabledIfNotSelected,
  onToggle,
}: {
  spells: ContentItem[];
  known: Set<string>;
  disabledIfNotSelected: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/40 p-2 grid gap-1">
      {spells.map((sp) => {
        const selected = known.has(sp.slug);
        const disabled = !selected && disabledIfNotSelected;
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
            selected={selected}
            disabled={disabled}
            onToggle={() => onToggle(sp.slug)}
          />
        );
      })}
    </div>
  );
}

function spellsLevelUpNote({
  casterKind,
  currentCaps,
  nextCaps,
  cantripsDelta,
  spellsDelta,
}: {
  casterKind: ReturnType<typeof getCasterKind>;
  currentCaps: { cantripsKnown: number; spellsKnown: number };
  nextCaps: { cantripsKnown: number; spellsKnown: number };
  cantripsDelta: number;
  spellsDelta: number;
}): string {
  if (casterKind === "known") {
    const swap = `Tu clase permite cambiar 1 hechizo ya conocido por otro a cada nivel.`;
    if (cantripsDelta === 0 && spellsDelta === 0) return `${swap}`;
    return `Aprendes ${cantripsDelta > 0 ? `+${cantripsDelta} cantrip(s)` : ""}${cantripsDelta > 0 && spellsDelta > 0 ? " y " : ""}${spellsDelta > 0 ? `+${spellsDelta} hechizo(s) conocido(s)` : ""}. ${swap}`;
  }
  if (casterKind === "prepared") {
    return `Conoces todos los hechizos de tu clase. Podrás preparar hasta ${nextCaps.spellsKnown} (antes ${currentCaps.spellsKnown}) tras un descanso largo.${cantripsDelta > 0 ? ` Cantrips nuevos: +${cantripsDelta}.` : ""}`;
  }
  if (casterKind === "spellbook") {
    return `Añades 2 hechizos nuevos al grimorio (cap ${nextCaps.spellsKnown}).${cantripsDelta > 0 ? ` Cantrips nuevos: +${cantripsDelta}.` : ""}`;
  }
  return "Esta clase no lanza hechizos.";
}

// ─── Feat prerequisites ─────────────────────────────────────────────────────

interface FeatPrereqObject {
  ability_scores?: Record<string, number>;
  class?: string;
  race?: string;
  proficiency?: string | string[];
  notes?: string;
}

/**
 * Returns a short failure reason string if the character doesn't meet the feat
 * prerequisites, or null if they qualify. Accepts either the legacy array shape
 * (`["DEX 13"]`) or the structured object shape used by our bundled SRD feats.
 */
function prereqFailureReason(
  prereq: unknown,
  character: Character,
): string | null {
  if (prereq === undefined || prereq === null) return null;

  // String-list form: parse "ABIL NN" entries; ignore anything else.
  if (Array.isArray(prereq)) {
    for (const p of prereq) {
      if (typeof p !== "string") continue;
      const match = p.match(/\b(STR|DEX|CON|INT|WIS|CHA)\b\s*(\d+)/i);
      if (match && match[1] && match[2]) {
        const ab = match[1].toUpperCase() as Ability;
        const required = parseInt(match[2], 10);
        const current = character.state.ability_scores[ab] ?? 0;
        if (current < required) return `${ab} ${required}+`;
      }
    }
    return null;
  }

  if (typeof prereq !== "object") return null;
  const p = prereq as FeatPrereqObject;

  if (p.ability_scores) {
    for (const [ab, req] of Object.entries(p.ability_scores)) {
      if (typeof req !== "number") continue;
      const key = ab.toUpperCase() as Ability;
      const current = character.state.ability_scores[key] ?? 0;
      if (current < req) return `${key} ${req}+`;
    }
  }

  const charWithRelations = character as unknown as {
    class?: { slug?: string };
    race?: { slug?: string };
  };
  if (p.class && charWithRelations.class?.slug !== p.class) {
    return `clase ${p.class}`;
  }
  if (p.race && charWithRelations.race?.slug !== p.race) {
    return `raza ${p.race}`;
  }

  // Proficiency prereqs (e.g. Heavy Armor Master requires heavy armor proficiency)
  const required = Array.isArray(p.proficiency)
    ? p.proficiency
    : p.proficiency
      ? [p.proficiency]
      : [];
  if (required.length > 0) {
    const computed = character.computed as { armorProficiencies?: string[]; weaponProficiencies?: string[] } | null;
    const have = new Set([
      ...(computed?.armorProficiencies ?? []),
      ...(computed?.weaponProficiencies ?? []),
    ]);
    for (const r of required) {
      if (!have.has(r)) return `requiere ${r}`;
    }
  }

  return null;
}

function FeatFilterToggle({
  showAll,
  onToggle,
  filteredOut,
}: {
  showAll: boolean;
  onToggle: () => void;
  filteredOut: number;
}) {
  if (filteredOut === 0 && !showAll) return null;
  return (
    <div className="flex items-center justify-between rounded-md border border-stone-800 bg-stone-900/40 px-3 py-1.5 text-xs">
      <span className="text-stone-400">
        {showAll
          ? `Mostrando todos (${filteredOut} no cumplen requisitos)`
          : `${filteredOut} feat${filteredOut === 1 ? "" : "s"} oculto${filteredOut === 1 ? "" : "s"} por no cumplir requisitos`}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="text-parchment-400 hover:text-parchment-300"
      >
        {showAll ? "Ocultar" : "Mostrar todos"}
      </button>
    </div>
  );
}
