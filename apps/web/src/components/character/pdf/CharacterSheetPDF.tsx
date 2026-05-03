"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type {
  Character,
  CharacterState,
  ComputedCharacter,
  ClassData,
  SpellData,
} from "@dnd/shared";
import { ABILITIES, SKILL_NAMES, type Skill } from "@dnd/shared";

// Register fonts (paths are served from /public by Next.js).
// Called once at module load.
if (typeof window !== "undefined") {
  try {
    Font.register({
      family: "Cinzel",
      fonts: [
        { src: "/fonts/Cinzel-Regular.woff", fontWeight: "normal" },
        { src: "/fonts/Cinzel-Bold.woff", fontWeight: "bold" },
      ],
    });
    Font.register({
      family: "Crimson",
      fonts: [
        { src: "/fonts/CrimsonText-Regular.woff", fontWeight: "normal" },
        {
          src: "/fonts/CrimsonText-Italic.woff",
          fontWeight: "normal",
          fontStyle: "italic",
        },
        { src: "/fonts/CrimsonText-Bold.woff", fontWeight: "bold" },
      ],
    });
  } catch {
    /* already registered */
  }
}

// Disable hyphenation (looks bad in English names)
Font.registerHyphenationCallback?.((word) => [word]);

// ── Colors ───────────────────────────────────────────────────────────────
const C = {
  parchment: "#fdf8f0",
  parchmentDark: "#f2ddb0",
  ink: "#2b1f12",
  inkMuted: "#5a4a34",
  inkFaded: "#8c7a5a",
  accent: "#85541a",
  accentSoft: "#a87020",
  rule: "#b89360",
  ruleSoft: "#d9c49a",
  danger: "#8b1a1a",
  green: "#1f6b3f",
  blue: "#204a8b",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Crimson",
    fontSize: 9,
    color: C.ink,
    backgroundColor: C.parchment,
    padding: 22,
  },
  bgBorder: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 1.5,
    borderColor: C.accent,
    borderStyle: "solid",
    borderRadius: 4,
  },
  bgBorderInner: {
    position: "absolute",
    top: 13,
    left: 13,
    right: 13,
    bottom: 13,
    borderWidth: 0.5,
    borderColor: C.rule,
    borderStyle: "solid",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
    borderBottomStyle: "solid",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  portrait: {
    width: 54,
    height: 54,
    borderWidth: 1.5,
    borderColor: C.accent,
    borderStyle: "solid",
    borderRadius: 2,
    objectFit: "cover",
  },
  portraitPlaceholder: {
    width: 54,
    height: 54,
    borderWidth: 1.5,
    borderColor: C.accent,
    borderStyle: "solid",
    borderRadius: 2,
    backgroundColor: C.parchmentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 22,
    color: C.ink,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: "Crimson",
    fontStyle: "italic",
    fontSize: 10,
    color: C.inkMuted,
    marginTop: 2,
  },
  headerStats: {
    flexDirection: "row",
    gap: 4,
  },
  headerStatBox: {
    borderWidth: 1,
    borderColor: C.accent,
    borderStyle: "solid",
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    minWidth: 52,
  },
  headerStatLabel: {
    fontFamily: "Cinzel",
    fontSize: 6,
    color: C.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerStatValue: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 16,
    color: C.ink,
    marginTop: 1,
  },

  // Main layout: 3 columns
  grid: { flexDirection: "row", gap: 8 },
  col: { flexDirection: "column", gap: 8 },
  colLeft: { width: "34%" },
  colMid: { width: "36%" },
  colRight: { width: "30%" },

  // Cards / sections
  section: {
    borderWidth: 1,
    borderColor: C.rule,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  sectionTitle: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 8,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: C.ruleSoft,
    borderBottomStyle: "solid",
    paddingBottom: 2,
  },

  // Ability score block
  abilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  abilityBox: {
    width: "31%",
    borderWidth: 1,
    borderColor: C.accent,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: C.parchment,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  abilityLabel: {
    fontFamily: "Cinzel",
    fontSize: 7,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  abilityMod: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 18,
    color: C.ink,
    marginTop: 1,
  },
  abilityScore: {
    fontFamily: "Crimson",
    fontSize: 8,
    color: C.inkMuted,
    marginTop: 1,
  },

  // Skill / save rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: C.accent,
    borderStyle: "solid",
    marginRight: 4,
  },
  dotProf: { backgroundColor: C.accent },
  dotExp: { backgroundColor: C.danger, borderColor: C.danger },
  rowLabel: { flex: 1, fontSize: 8, color: C.ink },
  rowValue: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 9,
    color: C.ink,
    minWidth: 18,
    textAlign: "right",
  },

  // HP Block
  hpBlock: {
    borderWidth: 1.5,
    borderColor: C.danger,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 6,
    backgroundColor: "rgba(139, 26, 26, 0.04)",
    alignItems: "center",
  },
  hpLabel: {
    fontFamily: "Cinzel",
    fontSize: 7,
    color: C.danger,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  hpValue: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 18,
    color: C.ink,
    marginVertical: 2,
  },
  hpSub: { fontSize: 7, color: C.inkMuted },

  // Stat pill (compact)
  pill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 0.3,
    borderBottomColor: C.ruleSoft,
    borderBottomStyle: "solid",
  },
  pillLabel: {
    fontFamily: "Cinzel",
    fontSize: 7,
    color: C.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pillValue: {
    fontFamily: "Cinzel",
    fontWeight: "bold",
    fontSize: 10,
    color: C.ink,
  },

  // Feature / note items
  featureItem: { marginBottom: 4 },
  featureName: {
    fontFamily: "Crimson",
    fontWeight: "bold",
    fontSize: 8.5,
    color: C.ink,
  },
  featureDesc: {
    fontFamily: "Crimson",
    fontSize: 7.5,
    color: C.inkMuted,
    lineHeight: 1.35,
    marginTop: 1,
  },
  featureSource: {
    fontFamily: "Crimson",
    fontStyle: "italic",
    fontSize: 6.5,
    color: C.inkFaded,
    marginLeft: 4,
  },

  // Attack table
  attackHeader: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    borderBottomStyle: "solid",
  },
  attackHeaderCell: {
    fontFamily: "Cinzel",
    fontSize: 6.5,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  attackRow: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.3,
    borderBottomColor: C.ruleSoft,
    borderBottomStyle: "solid",
    alignItems: "center",
  },
  attackCell: { fontFamily: "Crimson", fontSize: 8, color: C.ink },
  attackNameCell: { flex: 2, fontWeight: "bold" },
  attackBonusCell: { flex: 1, textAlign: "center", fontFamily: "Cinzel" },
  attackDmgCell: { flex: 2, textAlign: "right" },

  // Spell slots
  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1,
    gap: 4,
  },
  slotsLabel: {
    fontFamily: "Cinzel",
    fontSize: 7,
    color: C.accent,
    width: 30,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: C.accent,
    borderStyle: "solid",
    marginRight: 2,
  },
  pipUsed: { backgroundColor: "transparent" },
  pipFull: { backgroundColor: C.accent },

  // Footer / pagination
  pageFooter: {
    position: "absolute",
    bottom: 16,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: C.ruleSoft,
    borderTopStyle: "solid",
  },
  pageFooterText: {
    fontFamily: "Crimson",
    fontStyle: "italic",
    fontSize: 7,
    color: C.inkFaded,
  },
});

// ── Static warlock data ──────────────────────────────────────────────────
const PACT_BOONS_PDF: Record<string, { name: string; description: string }> = {
  "pact-of-the-blade": { name: "Pacto de la Hoja", description: "Puedes usar tu acción para crear un arma de pacto en tu mano vacía. Eres competente con ella y la usas como foco arcano. Si sueltas el arma, desaparece al final del turno." },
  "pact-of-the-chain": { name: "Pacto de la Cadena", description: "Aprendes el conjuro Encontrar Familiar y puedes invocar un familiar especial: diablo imp, pseudodragón, quasit o sprite. Tu familiar puede atacar con su reacción cuando tú ataques." },
  "pact-of-the-tome": { name: "Pacto del Tomo", description: "Tu patrón te entrega un Libro de Sombras con 3 trucos adicionales de cualquier lista de clase. Además, en niveles superiores, puedes lanzar rituales de otras clases." },
};

const INVOCATIONS_PDF: Record<string, { name: string; description: string; requires?: string }> = {
  "agonizing-blast": { name: "Explosión Agonizante", description: "Cuando lanzas Explosión Éldrida, añade tu modificador de Carisma al daño en cada impacto.", requires: "Explosión Éldrida" },
  "repelling-blast": { name: "Explosión Repulsora", description: "Cuando impactas a una criatura con Explosión Éldrida, puedes empujarla hasta 10 pies en línea recta.", requires: "Explosión Éldrida" },
  "eldritch-spear": { name: "Lanza Éldrica", description: "El alcance de tu Explosión Éldrida es de 300 pies.", requires: "Explosión Éldrida" },
  "devils-sight": { name: "Vista del Diablo", description: "Puedes ver normalmente en la oscuridad mágica y no mágica hasta 120 pies." },
  "armor-of-shadows": { name: "Armadura de Sombras", description: "Puedes lanzar Armadura de Mago sobre ti mismo sin gastar espacios de hechizo." },
  "fiendish-vigor": { name: "Vigor Infernal", description: "Puedes lanzar Vida Falsa sobre ti mismo a voluntad como hechizo de 1er nivel, sin gastar un espacio de hechizo." },
  "eldritch-sight": { name: "Vista Éldrica", description: "Puedes lanzar Detectar Magia a voluntad, sin gastar espacios de hechizo." },
  "mask-of-many-faces": { name: "Máscara de Mil Rostros", description: "Puedes lanzar Disfrazarse a voluntad, sin gastar espacios de hechizo." },
  "misty-visions": { name: "Visiones Neblinosas", description: "Puedes lanzar Ilusión Silenciosa a voluntad, sin gastar espacios de hechizo." },
  "beguiling-influence": { name: "Influencia Fascinante", description: "Obtienes competencia en las habilidades de Engaño y Persuasión." },
  "eyes-of-the-rune-keeper": { name: "Ojos del Guardián de Runas", description: "Puedes leer cualquier escritura." },
  "beast-speech": { name: "Hablar con Bestias", description: "Puedes lanzar Hablar con Animales a voluntad, sin gastar espacios de hechizo." },
  "gaze-of-two-minds": { name: "Mirada de Dos Mentes", description: "Puedes usar tu acción para tocar a un humanoide voluntario y percibir a través de sus sentidos hasta el inicio de tu próximo turno." },
  "thief-of-five-fates": { name: "Ladrón de Cinco Destinos", description: "Puedes lanzar Perdición una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "mire-the-mind": { name: "Enlodar la Mente", description: "Puedes lanzar Lentitud una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "sign-of-ill-omen": { name: "Señal de Mal Agüero", description: "Puedes lanzar Presagio Funesto una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "one-with-shadows": { name: "Uno con las Sombras", description: "Cuando estás en un área de luz tenue u oscuridad, puedes usar tu acción para volverte invisible hasta que te muevas o realices una acción o reacción." },
  "thirsting-blade": { name: "Hoja Sedienta", description: "Puedes atacar dos veces con tu arma de pacto cuando usas la acción Atacar.", requires: "Pacto de la Hoja" },
  "dreadful-word": { name: "Palabra Horrible", description: "Puedes lanzar Confusión una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "bewitching-whispers": { name: "Susurros Embelesadores", description: "Puedes lanzar Compulsión una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "sculptor-of-flesh": { name: "Escultor de Carne", description: "Puedes lanzar Polimorfar una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "voice-of-the-chain-master": { name: "Voz del Amo de la Cadena", description: "Puedes comunicarte telepáticamente con tu familiar, percibir a través de sus sentidos y hablar a través de él.", requires: "Pacto de la Cadena" },
  "ascendant-step": { name: "Paso Ascendente", description: "Puedes lanzar Levitación sobre ti mismo a voluntad, sin gastar espacios de hechizo." },
  "minions-of-chaos": { name: "Sirvientes del Caos", description: "Puedes lanzar Conjurar Elemental una vez usando un espacio de Magia de Pacto. No puedes volver a hacerlo hasta el siguiente descanso largo." },
  "otherworldly-leap": { name: "Salto de Otro Mundo", description: "Puedes lanzar Salto sobre ti mismo a voluntad, sin gastar espacios de hechizo." },
  "whispers-of-the-grave": { name: "Susurros de la Tumba", description: "Puedes lanzar Hablar con los Muertos a voluntad, sin gastar espacios de hechizo." },
  "lifedrinker": { name: "Bebedor de Vida", description: "Cuando impactas a una criatura con tu arma de pacto, añades 1d6 + tu modificador de Carisma en daño necrótico.", requires: "Pacto de la Hoja" },
  "chains-of-carceri": { name: "Cadenas de Carceri", description: "Puedes lanzar Mantener a una Persona Inmovilizada a voluntad sin gastar espacios de hechizo. Solo funciona contra celestiales, fiends o elementales.", requires: "Pacto de la Cadena" },
  "visions-of-distant-realms": { name: "Visiones de Reinos Lejanos", description: "Puedes lanzar Ojo Arcano a voluntad, sin gastar espacios de hechizo." },
  "witch-sight": { name: "Visión de Bruja", description: "Puedes ver la verdadera forma de cualquier cambiaformas u criatura oculta por magia a 30 pies." },
};

interface SpellLike {
  id: string;
  slug: string;
  name: string;
  data: SpellData;
}

interface Props {
  character: Character & {
    race?: { name: string; slug: string };
    subrace?: { name: string } | null;
    class?: { name: string; slug: string; data?: ClassData };
    subclass?: { name: string } | null;
    background?: { name: string };
    portraitUrl?: string | null;
  };
  portraitDataUrl?: string | null;
  spells?: SpellLike[];
  inventory?: Array<{
    id: string;
    name: string;
    quantity: number;
    equipped: boolean;
    notes?: string | null;
  }>;
}

function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function abilityFromSkill(skillKey: string): string {
  const map: Record<string, string> = {
    athletics: "STR",
    acrobatics: "DEX",
    sleight_of_hand: "DEX",
    stealth: "DEX",
    arcana: "INT",
    history: "INT",
    investigation: "INT",
    nature: "INT",
    religion: "INT",
    animal_handling: "WIS",
    insight: "WIS",
    medicine: "WIS",
    perception: "WIS",
    survival: "WIS",
    deception: "CHA",
    intimidation: "CHA",
    performance: "CHA",
    persuasion: "CHA",
  };
  return map[skillKey] ?? "—";
}

export function CharacterSheetPDF({
  character,
  portraitDataUrl,
  spells = [],
  inventory = [],
}: Props) {
  const state = character.state as CharacterState;
  const computed = character.computed as ComputedCharacter;

  const subtitleParts: string[] = [];
  subtitleParts.push(`Level ${character.level}`);
  if (character.race) {
    const raceLabel =
      character.subrace && character.subrace.name !== character.race.name
        ? `${character.subrace.name} ${character.race.name}`
        : character.race.name;
    subtitleParts.push(raceLabel);
  }
  if (character.class) {
    const classLabel = character.subclass
      ? `${character.class.name} (${character.subclass.name})`
      : character.class.name;
    subtitleParts.push(classLabel);
  }
  if (character.background) subtitleParts.push(character.background.name);
  const subtitle = subtitleParts.join(" · ");

  const skills = computed.skills as ComputedCharacter["skills"];
  const saves = computed.savingThrows as ComputedCharacter["savingThrows"];

  const isCaster = !!computed.spellcasting;

  const knownSet = new Set(state.known_spells ?? []);
  const preparedSet = new Set(state.prepared_spells ?? []);
  const spellsResolved = spells.filter(
    (sp) => knownSet.has(sp.slug) || preparedSet.has(sp.slug),
  );

  const hitDice = state.hit_dice ?? [];

  return (
    <Document
      title={`${character.name} — Character Sheet`}
      author="Arcana"
      creator="Arcana"
    >
      {/* ── PAGE 1 ───────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.bgBorder} fixed />
        <View style={s.bgBorderInner} fixed />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {portraitDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={portraitDataUrl} style={s.portrait} />
            ) : (
              <View style={s.portraitPlaceholder}>
                <Text
                  style={{ fontFamily: "Cinzel", fontSize: 18, color: C.accent }}
                >
                  {character.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={s.name}>{character.name}</Text>
              <Text style={s.subtitle}>{subtitle}</Text>
            </View>
          </View>
          <View style={s.headerStats}>
            <HeaderStat label="AC" value={computed.ac} />
            <HeaderStat label="Init" value={formatBonus(computed.initiative)} />
            <HeaderStat label="Speed" value={`${computed.speed} ft`} />
            <HeaderStat label="Prof" value={formatBonus(computed.proficiencyBonus)} />
          </View>
        </View>

        {/* 3-column grid */}
        <View style={s.grid}>
          {/* LEFT: Ability Scores + Saves */}
          <View style={[s.col, s.colLeft]}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Ability Scores</Text>
              <View style={s.abilityRow}>
                {ABILITIES.map((ab) => {
                  const mod = computed.abilityModifiers[ab];
                  const score = state.ability_scores[ab];
                  return (
                    <View key={ab} style={s.abilityBox}>
                      <Text style={s.abilityLabel}>{ab}</Text>
                      <Text style={s.abilityMod}>{formatBonus(mod)}</Text>
                      <Text style={s.abilityScore}>{score}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Saving Throws</Text>
              {ABILITIES.map((ab) => {
                const save = saves[ab];
                return (
                  <View key={ab} style={s.row}>
                    <View
                      style={[s.dot, save.proficient ? s.dotProf : {}]}
                    />
                    <Text style={s.rowLabel}>{ab}</Text>
                    <Text style={s.rowValue}>{formatBonus(save.total)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Resistances & Immunities</Text>
              <Text style={{ fontSize: 8, color: C.inkMuted }}>
                {computed.resistances.length > 0
                  ? `Res: ${computed.resistances.join(", ")}`
                  : "—"}
              </Text>
              {computed.immunities.length > 0 && (
                <Text style={{ fontSize: 8, color: C.inkMuted, marginTop: 2 }}>
                  Imm: {computed.immunities.join(", ")}
                </Text>
              )}
            </View>
          </View>

          {/* MIDDLE: Skills */}
          <View style={[s.col, s.colMid]}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Skills</Text>
              {(Object.entries(skills) as [Skill, typeof skills[Skill]][]).map(
                ([skill, data]) => (
                  <View key={skill} style={s.row}>
                    <View
                      style={[
                        s.dot,
                        data.expertise
                          ? s.dotExp
                          : data.proficient
                            ? s.dotProf
                            : {},
                      ]}
                    />
                    <Text style={s.rowLabel}>
                      {SKILL_NAMES[skill]}
                      <Text style={{ color: C.inkFaded, fontSize: 7 }}>
                        {" "}
                        ({abilityFromSkill(skill)})
                      </Text>
                    </Text>
                    <Text style={s.rowValue}>{formatBonus(data.total)}</Text>
                  </View>
                ),
              )}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Proficiencies & Languages</Text>
              {computed.armorProficiencies.length > 0 && (
                <ProfLine label="Armor" items={computed.armorProficiencies} />
              )}
              {computed.weaponProficiencies.length > 0 && (
                <ProfLine label="Weapons" items={computed.weaponProficiencies} />
              )}
              {computed.toolProficiencies.length > 0 && (
                <ProfLine label="Tools" items={computed.toolProficiencies} />
              )}
              {computed.languages.length > 0 && (
                <ProfLine label="Languages" items={computed.languages} />
              )}
            </View>
          </View>

          {/* RIGHT: Combat + HP + Core */}
          <View style={[s.col, s.colRight]}>
            {/* HP */}
            <View style={s.hpBlock}>
              <Text style={s.hpLabel}>Hit Points</Text>
              <Text style={s.hpValue}>
                {state.hp.current} / {state.hp.max}
              </Text>
              {state.hp.temp > 0 && (
                <Text style={[s.hpSub, { color: C.blue }]}>
                  +{state.hp.temp} temporary
                </Text>
              )}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Combat</Text>
              <View style={s.pill}>
                <Text style={s.pillLabel}>Passive Perception</Text>
                <Text style={s.pillValue}>{computed.passivePerception}</Text>
              </View>
              {computed.spellcasting && (
                <>
                  <View style={s.pill}>
                    <Text style={s.pillLabel}>Spell Save DC</Text>
                    <Text style={s.pillValue}>
                      {computed.spellcasting.spellSaveDC}
                    </Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillLabel}>Spell Atk</Text>
                    <Text style={s.pillValue}>
                      {formatBonus(computed.spellcasting.spellAttackBonus)}
                    </Text>
                  </View>
                </>
              )}
              {hitDice.length > 0 && (
                <View style={s.pill}>
                  <Text style={s.pillLabel}>Hit Dice</Text>
                  <Text style={s.pillValue}>
                    {hitDice
                      .map((hd) => `${hd.remaining}/${hd.total}d${hd.die}`)
                      .join(" ")}
                  </Text>
                </View>
              )}
              <View style={s.pill}>
                <Text style={s.pillLabel}>Inspiration</Text>
                <Text style={s.pillValue}>{state.inspiration ? "Yes" : "—"}</Text>
              </View>
              {state.exhaustion_level > 0 && (
                <View style={s.pill}>
                  <Text style={s.pillLabel}>Exhaustion</Text>
                  <Text style={[s.pillValue, { color: C.danger }]}>
                    Lv {state.exhaustion_level}
                  </Text>
                </View>
              )}
            </View>

            {/* Attacks */}
            {computed.attacks.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Attacks</Text>
                <View style={s.attackHeader}>
                  <Text style={[s.attackHeaderCell, s.attackNameCell]}>
                    Name
                  </Text>
                  <Text style={[s.attackHeaderCell, s.attackBonusCell]}>
                    Atk
                  </Text>
                  <Text style={[s.attackHeaderCell, s.attackDmgCell]}>
                    Damage
                  </Text>
                </View>
                {computed.attacks.map((atk, i) => (
                  <View key={i} style={s.attackRow}>
                    <Text style={[s.attackCell, s.attackNameCell]}>
                      {atk.name}
                    </Text>
                    <Text style={[s.attackCell, s.attackBonusCell]}>
                      {formatBonus(atk.attackBonus)}
                    </Text>
                    <Text style={[s.attackCell, s.attackDmgCell]}>
                      {atk.damage} {atk.damageType}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Conditions */}
            {state.conditions.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Conditions</Text>
                <Text style={{ fontSize: 8, color: C.danger }}>
                  {state.conditions.join(", ")}
                </Text>
              </View>
            )}
          </View>
        </View>

        <PageFooter characterName={character.name} pageLabel="I" />
      </Page>

      {/* ── PAGE 2 — Features ───────────────────────────────── */}
      {(() => {
        // Build extra warlock features from player choices
        const extraFeatures: Array<{ name: string; source: string; description: string }> = [];
        const pactBoonSlug = (state as CharacterState & { pact_boon?: string | null }).pact_boon;
        const eldritchInvocations = (state as CharacterState & { eldritch_invocations?: string[] }).eldritch_invocations ?? [];

        if (pactBoonSlug && PACT_BOONS_PDF[pactBoonSlug]) {
          const boon = PACT_BOONS_PDF[pactBoonSlug];
          extraFeatures.push({ name: boon.name, source: "Don de Pacto", description: boon.description });
        }
        for (const slug of eldritchInvocations) {
          const inv = INVOCATIONS_PDF[slug];
          if (inv) extraFeatures.push({ name: inv.name, source: "Invocación Éldrica", description: inv.description + (inv.requires ? ` (Requiere: ${inv.requires})` : "") });
        }

        const allFeatures = [...extraFeatures, ...computed.features];
        if (allFeatures.length === 0 && (!state.notes || !state.notes.trim())) return null;

        return (
          <Page size="A4" style={s.page}>
            <View style={s.bgBorder} fixed />
            <View style={s.bgBorderInner} fixed />

            <View style={s.header}>
              <Text style={s.name}>{character.name}</Text>
              <Text style={[s.subtitle, { marginTop: 0 }]}>
                Features & Traits
              </Text>
            </View>

            {allFeatures.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Features & Traits</Text>
                {allFeatures.map((f, i) => (
                  <View key={i} style={s.featureItem} wrap={false}>
                    <Text style={s.featureName}>
                      {f.name}
                      <Text style={s.featureSource}> · {f.source}</Text>
                    </Text>
                    <Text style={s.featureDesc}>{f.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {state.notes && state.notes.trim().length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionTitle}>Notes</Text>
                <Text style={{ fontSize: 9, color: C.ink, lineHeight: 1.35 }}>
                  {state.notes}
                </Text>
              </View>
            )}

            <PageFooter characterName={character.name} pageLabel="II" />
          </Page>
        );
      })()}

      {/* ── PAGE 3 — Spells ────────────────────────────────── */}
      {isCaster && (
        <Page size="A4" style={s.page}>
          <View style={s.bgBorder} fixed />
          <View style={s.bgBorderInner} fixed />

          <View style={s.header}>
            <Text style={s.name}>{character.name}</Text>
            <Text style={[s.subtitle, { marginTop: 0 }]}>Grimoire</Text>
          </View>

          <View style={s.grid}>
            <View style={[s.col, { width: "32%" }]}>
              {computed.spellcasting && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Spellcasting</Text>
                  <View style={s.pill}>
                    <Text style={s.pillLabel}>Ability</Text>
                    <Text style={s.pillValue}>
                      {computed.spellcasting.ability}
                    </Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillLabel}>Save DC</Text>
                    <Text style={s.pillValue}>
                      {computed.spellcasting.spellSaveDC}
                    </Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillLabel}>Attack</Text>
                    <Text style={s.pillValue}>
                      {formatBonus(computed.spellcasting.spellAttackBonus)}
                    </Text>
                  </View>
                </View>
              )}

              {Object.keys(computed.spellSlotsByLevel).length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>{character.class?.slug === "warlock" ? "Pact Magic" : "Spell Slots"}</Text>
                  {character.class?.slug === "warlock" && (
                    <Text style={{ fontSize: 7, color: C.inkFaded, fontStyle: "italic", marginBottom: 3 }}>
                      Slots se recuperan con descanso corto
                    </Text>
                  )}
                  {Object.entries(computed.spellSlotsByLevel)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([lvl, total]) => {
                      const level = Number(lvl);
                      const remaining =
                        state.spell_slots[level]?.remaining ?? total;
                      return (
                        <View key={level} style={s.slotsRow}>
                          <Text style={s.slotsLabel}>Lv {level}</Text>
                          {Array.from({ length: total }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                s.pip,
                                i < remaining ? s.pipFull : s.pipUsed,
                              ]}
                            />
                          ))}
                          <Text
                            style={{ fontSize: 7, color: C.inkFaded, marginLeft: 4 }}
                          >
                            {remaining}/{total}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>

            <View style={[s.col, { width: "68%" }]}>
              <View style={s.section}>
                <Text style={s.sectionTitle}>Spells</Text>
                <SpellsByLevel
                  spells={spellsResolved}
                  preparedSet={preparedSet}
                />
              </View>
            </View>
          </View>

          <PageFooter characterName={character.name} pageLabel="III" />
        </Page>
      )}

      {/* ── PAGE 4 — Inventory ─────────────────────────────── */}
      {inventory.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.bgBorder} fixed />
          <View style={s.bgBorderInner} fixed />

          <View style={s.header}>
            <Text style={s.name}>{character.name}</Text>
            <Text style={[s.subtitle, { marginTop: 0 }]}>Inventory</Text>
          </View>

          <View style={s.section}>
            <View style={s.attackHeader}>
              <Text style={[s.attackHeaderCell, { flex: 3 }]}>Item</Text>
              <Text style={[s.attackHeaderCell, { width: 40, textAlign: "center" }]}>
                Qty
              </Text>
              <Text style={[s.attackHeaderCell, { width: 70, textAlign: "center" }]}>
                Equipped
              </Text>
            </View>
            {inventory.map((item) => (
              <View key={item.id} style={s.attackRow} wrap={false}>
                <View style={{ flex: 3 }}>
                  <Text style={{ fontSize: 8.5, color: C.ink }}>
                    {item.name}
                  </Text>
                  {item.notes && (
                    <Text
                      style={{
                        fontSize: 7,
                        color: C.inkFaded,
                        fontStyle: "italic",
                        marginTop: 1,
                      }}
                    >
                      {item.notes}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    width: 40,
                    textAlign: "center",
                    fontSize: 8,
                    color: C.ink,
                  }}
                >
                  ×{item.quantity}
                </Text>
                <Text
                  style={{
                    width: 70,
                    textAlign: "center",
                    fontSize: 8,
                    color: item.equipped ? C.accent : C.inkFaded,
                  }}
                >
                  {item.equipped ? "●" : "—"}
                </Text>
              </View>
            ))}
          </View>

          <PageFooter characterName={character.name} pageLabel="IV" />
        </Page>
      )}
    </Document>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function HeaderStat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={s.headerStatBox}>
      <Text style={s.headerStatLabel}>{label}</Text>
      <Text style={s.headerStatValue}>{String(value)}</Text>
    </View>
  );
}

function ProfLine({ label, items }: { label: string; items: string[] }) {
  return (
    <Text style={{ fontSize: 8, color: C.inkMuted, marginBottom: 2 }}>
      <Text style={{ color: C.accent, fontWeight: "bold" }}>{label}: </Text>
      {items.join(", ")}
    </Text>
  );
}

function SpellsByLevel({
  spells,
  preparedSet,
}: {
  spells: SpellLike[];
  preparedSet: Set<string>;
}) {
  const byLevel = new Map<number, SpellLike[]>();
  for (const sp of spells) {
    const lvl = sp.data.level;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(sp);
  }
  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  if (levels.length === 0) {
    return (
      <Text
        style={{
          fontSize: 8,
          color: C.inkFaded,
          fontStyle: "italic",
        }}
      >
        No spells learned yet.
      </Text>
    );
  }
  return (
    <>
      {levels.map((lvl) => (
        <View key={lvl} style={{ marginBottom: 6 }}>
          <Text
            style={{
              fontFamily: "Cinzel",
              fontSize: 8,
              color: C.accent,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 2,
              borderBottomWidth: 0.3,
              borderBottomColor: C.ruleSoft,
              borderBottomStyle: "solid",
              paddingBottom: 1,
            }}
          >
            {lvl === 0 ? "Cantrips" : `Level ${lvl}`}
          </Text>
          {byLevel.get(lvl)!.map((sp) => {
            const isPrepared = preparedSet.has(sp.slug);
            return (
              <View key={sp.id} style={{ flexDirection: "row", marginBottom: 1 }} wrap={false}>
                <Text
                  style={{
                    width: 10,
                    fontSize: 9,
                    color: isPrepared || lvl === 0 ? C.accent : C.inkFaded,
                  }}
                >
                  {isPrepared || lvl === 0 ? "●" : "○"}
                </Text>
                <Text
                  style={{
                    fontSize: 8.5,
                    color: C.ink,
                    fontWeight: "bold",
                    marginRight: 4,
                  }}
                >
                  {sp.name}
                </Text>
                <Text style={{ fontSize: 7.5, color: C.inkMuted, flex: 1 }}>
                  {sp.data.school}
                  {sp.data.concentration ? " · C" : ""}
                  {sp.data.ritual ? " · R" : ""}
                  {sp.data.damage
                    ? ` · ${sp.data.damage.base} ${sp.data.damage.type}`
                    : ""}
                  {sp.data.healing ? ` · heal ${sp.data.healing.base}` : ""}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </>
  );
}

function PageFooter({
  characterName,
  pageLabel,
}: {
  characterName: string;
  pageLabel: string;
}) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>{characterName}</Text>
      <Text style={s.pageFooterText}>— {pageLabel} —</Text>
      <Text style={s.pageFooterText}>Arcana · SRD 5.1</Text>
    </View>
  );
}
