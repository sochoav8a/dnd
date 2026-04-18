import type {
  AbilityScores,
  AbilityModifiers,
  ClassData,
  RaceData,
  SubraceData,
  SubclassData,
  BackgroundData,
  ItemData,
  ComputedCharacter,
  Modifier,
} from "@dnd/shared";
import type { Ability } from "@dnd/shared";
import type { Skill } from "@dnd/shared";

import { computeModifiers } from "./ability-scores.js";
import { getProficiencyBonus } from "./proficiency.js";
import { computeMaxHp, computeMulticlassMaxHp } from "./hp.js";
import { computeAC, type EquippedArmor } from "./ac.js";
import { computeSkills } from "./skills.js";
import { computeSavingThrows } from "./saving-throws.js";
import { computeSpellSlots, computeMulticlassSpellSlots } from "./spell-slots.js";

export interface EquipmentItem {
  name: string;
  slug: string;
  equipped: boolean;
  attunement: boolean;
  data: ItemData;
}

export interface MulticlassEntry {
  classData: ClassData;
  level: number;
  /** Whether this is the primary (first chosen) class — determines which saving throw proficiencies are kept */
  isPrimary: boolean;
}

export interface ComputeInput {
  level: number;
  abilityScores: AbilityScores;
  race: RaceData;
  subrace?: SubraceData;
  classData: ClassData;
  subclass?: SubclassData;
  background: BackgroundData;
  equipment: EquipmentItem[];
  featsModifiers?: Modifier[];
  conditions?: string[];
  customModifiers?: Modifier[];
  expertiseSkills?: Skill[];
  /** Additional classes for multiclass characters. Primary class is always classData above. */
  multiclassEntries?: MulticlassEntry[];
}

/**
 * Main entry point of the rules engine.
 * Pure function: same input always produces same output.
 * No database calls, no side effects.
 */
export function computeCharacter(input: ComputeInput): ComputedCharacter {
  const {
    level,
    abilityScores,
    race,
    subrace,
    classData,
    subclass,
    background,
    equipment,
    featsModifiers = [],
    conditions = [],
    customModifiers = [],
    expertiseSkills = [],
    multiclassEntries = [],
  } = input;

  const isMulticlass = multiclassEntries.length > 0;

  // ── Base calculations ──────────────────────────────────────────────
  const proficiencyBonus = getProficiencyBonus(level);
  const abilityModifiers: AbilityModifiers = computeModifiers(abilityScores);

  // ── Collect all features up to current level ──────────────────────
  // Primary class features
  const activeFeatures: Array<{ name: string; description: string; source: string }> = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    const features = classData.features_by_level[String(lvl)];
    if (features) {
      for (const f of features) {
        activeFeatures.push({ name: f.name, description: f.description, source: `class:${classData.primary_ability[0]}:${lvl}` });
      }
    }
  }

  // Secondary class features
  for (const entry of multiclassEntries) {
    for (let lvl = 1; lvl <= entry.level; lvl++) {
      const features = entry.classData.features_by_level[String(lvl)];
      if (features) {
        for (const f of features) {
          activeFeatures.push({ name: f.name, description: f.description, source: `multiclass:${entry.classData.primary_ability[0]}:${lvl}` });
        }
      }
    }
  }

  // Subclass features
  if (subclass) {
    for (let lvl = 1; lvl <= level; lvl++) {
      const features = subclass.features_by_level[String(lvl)];
      if (features) {
        for (const f of features) {
          activeFeatures.push({ name: f.name, description: f.description, source: `subclass:${subclass.parent_class}:${lvl}` });
        }
      }
    }
  }

  // ── Collect modifiers ─────────────────────────────────────────────
  const allModifiers: Modifier[] = [
    ...featsModifiers,
    ...customModifiers,
    ...collectClassModifiers(classData, level),
    ...multiclassEntries.flatMap((e) => collectClassModifiers(e.classData, e.level)),
    ...(subclass ? collectSubclassModifiers(subclass, level) : []),
  ];

  // ── Proficiencies ─────────────────────────────────────────────────
  // Primary class: full proficiencies
  const armorProficiencies = [...classData.armor_proficiencies];
  const weaponProficiencies = [...classData.weapon_proficiencies];
  const toolProficiencies = [...(classData.tool_proficiencies ?? [])];

  // Secondary classes: only class-specific proficiencies (PHB multiclassing table, p. 164)
  // (simplified: we add armor/weapon profs that the class list grants for multiclassing)
  for (const entry of multiclassEntries) {
    for (const prof of entry.classData.armor_proficiencies) {
      if (!armorProficiencies.includes(prof)) armorProficiencies.push(prof);
    }
    for (const prof of entry.classData.weapon_proficiencies) {
      if (!weaponProficiencies.includes(prof)) weaponProficiencies.push(prof);
    }
  }

  if (subrace?.extra_proficiencies) {
    armorProficiencies.push(...subrace.extra_proficiencies.filter(isArmorProf));
    weaponProficiencies.push(...subrace.extra_proficiencies.filter(isWeaponProf));
  }

  // Languages
  const languages = [
    ...race.languages,
    ...(subrace?.extra_languages ?? []),
  ];

  // ── Skill proficiencies from background ───────────────────────────
  const skillProficiencies = background.skill_proficiencies as Skill[];

  // ── HP ────────────────────────────────────────────────────────────
  const hillDwarfBonus = hasSubraceTrait(subrace, "Dwarven Toughness") ? 1 : 0;
  const maxHp = isMulticlass
    ? computeMulticlassMaxHp({
        classEntries: [
          { hitDie: classData.hit_die, level },
          ...multiclassEntries.map((e) => ({ hitDie: e.classData.hit_die, level: e.level })),
        ],
        abilityScores,
        hpBonusPerLevel: hillDwarfBonus,
      })
    : computeMaxHp({ hitDie: classData.hit_die, level, abilityScores, hpBonusPerLevel: hillDwarfBonus });

  // ── AC ────────────────────────────────────────────────────────────
  const equippedItems = equipment.filter((e) => e.equipped);
  const equippedArmor = resolveEquippedArmor(equippedItems);
  const hasShield = equippedItems.some(
    (e) => e.data.category === "shield" || e.data.armor?.type === "shield",
  );
  const acModifiers = allModifiers.filter((m) => m.target === "ac");
  const ac = computeAC({
    abilityModifiers,
    equippedArmor,
    hasShield,
    acModifiers,
  });

  // ── Speed ─────────────────────────────────────────────────────────
  let speed = race.speed;
  // Subrace speed overrides (e.g. Wood Elf fleet of foot → handled via traits)
  if (hasSubraceTrait(subrace, "Fleet of Foot")) speed = 35;
  const speedModifiers = allModifiers.filter((m) => m.target === "speed");
  for (const mod of speedModifiers) {
    if (mod.type === "bonus" && typeof mod.value === "number") {
      speed += mod.value;
    }
  }

  // ── Initiative ────────────────────────────────────────────────────
  const initiative = abilityModifiers.DEX;

  // ── Saving throws ─────────────────────────────────────────────────
  const proficientSavingThrows = classData.saving_throws as Ability[];

  // Paladin Aura of Protection (lv 6+) — adds CHA to all saves
  const savingThrowBonuses: Partial<Record<Ability, number>> = {};
  if (classData.saving_throws.includes("CHA") && level >= 6) {
    // Detect if class is paladin via features
    const isPaladin = activeFeatures.some((f) => f.name === "Aura of Protection");
    if (isPaladin) {
      const chaBonus = Math.max(1, abilityModifiers.CHA);
      for (const ab of ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as Ability[]) {
        savingThrowBonuses[ab] = (savingThrowBonuses[ab] ?? 0) + chaBonus;
      }
    }
  }

  const savingThrows = computeSavingThrows(
    abilityModifiers,
    proficientSavingThrows,
    proficiencyBonus,
    savingThrowBonuses,
  );

  // ── Skills ────────────────────────────────────────────────────────
  const hasJackOfAllTrades = activeFeatures.some((f) => f.name === "Jack of All Trades");
  const skills = computeSkills(
    abilityModifiers,
    skillProficiencies,
    expertiseSkills,
    proficiencyBonus,
    hasJackOfAllTrades,
  );

  // ── Passive perception ────────────────────────────────────────────
  const passivePerception = 10 + skills.perception.total;

  // ── Spellcasting ──────────────────────────────────────────────────
  const spellcasting = classData.spell_casting
    ? (() => {
        const ability = classData.spell_casting.ability as Ability;
        const abilityMod = abilityModifiers[ability];
        return {
          ability,
          spellSaveDC: 8 + proficiencyBonus + abilityMod,
          spellAttackBonus: proficiencyBonus + abilityMod,
        };
      })()
    : null;

  // ── Spell slots (multiclass combines caster levels, PHB p. 165) ───
  const spellSlotsByLevel = isMulticlass && (classData.spell_casting || multiclassEntries.some((e) => e.classData.spell_casting))
    ? computeMulticlassSpellSlots([
        ...(classData.spell_casting ? [{ type: classData.spell_casting.type, level }] : []),
        ...multiclassEntries
          .filter((e) => e.classData.spell_casting)
          .map((e) => ({ type: e.classData.spell_casting!.type, level: e.level })),
      ])
    : computeSpellSlots(
        classData.spell_casting?.type ?? null,
        level,
        classData.spell_casting?.spell_slots,
      );

  // ── Attacks ───────────────────────────────────────────────────────
  const attacks = computeAttacks(equippedItems, abilityModifiers, proficiencyBonus, weaponProficiencies);

  // ── Resistances ───────────────────────────────────────────────────
  const resistances: string[] = [
    ...(race.resistances ?? []),
    ...(subrace?.resistances ?? []),
  ];

  // Apply condition modifiers to resistances
  if (conditions.includes("raging")) {
    resistances.push("bludgeoning", "piercing", "slashing");
  }

  return {
    proficiencyBonus,
    initiative,
    speed,
    ac,
    passivePerception,
    maxHp,
    abilityModifiers,
    savingThrows,
    skills,
    attacks,
    spellcasting,
    spellSlotsByLevel,
    armorProficiencies,
    weaponProficiencies,
    toolProficiencies,
    languages,
    features: activeFeatures,
    resistances: [...new Set(resistances)],
    immunities: [],
  };
}

// ──── Helpers ──────────────────────────────────────────────────────────────

function hasSubraceTrait(subrace: SubraceData | undefined, traitName: string): boolean {
  return subrace?.traits.some((t) => t.name === traitName) ?? false;
}

function resolveEquippedArmor(equippedItems: EquipmentItem[]): EquippedArmor | null {
  const armorItem = equippedItems.find(
    (e) =>
      e.data.armor &&
      e.data.armor.type !== "shield" &&
      ["light", "medium", "heavy"].includes(e.data.armor.type),
  );

  if (!armorItem?.data.armor) return null;

  return {
    name: armorItem.name,
    armorType: armorItem.data.armor.type as "light" | "medium" | "heavy",
    baseAc: armorItem.data.armor.base_ac,
    maxDexBonus: armorItem.data.armor.max_dex_bonus ?? null,
    ...(armorItem.data.armor.stealth_disadvantage === undefined
      ? {}
      : { stealthDisadvantage: armorItem.data.armor.stealth_disadvantage }),
  };
}

function computeAttacks(
  equippedItems: EquipmentItem[],
  abilityModifiers: AbilityModifiers,
  proficiencyBonus: number,
  weaponProficiencies: string[],
): ComputedCharacter["attacks"] {
  const attacks: ComputedCharacter["attacks"] = [];

  for (const item of equippedItems) {
    if (!item.data.weapon) continue;

    const weapon = item.data.weapon;
    const isFinesse = weapon.properties.some((p) => p.toLowerCase().includes("finesse"));
    const isRanged = weapon.properties.some(
      (p) => p.toLowerCase().includes("ammunition") || p.toLowerCase().includes("thrown"),
    );

    const strMod = abilityModifiers.STR;
    const dexMod = abilityModifiers.DEX;

    let attackAbilityMod: number;
    if (isFinesse) {
      attackAbilityMod = Math.max(strMod, dexMod);
    } else if (isRanged) {
      attackAbilityMod = dexMod;
    } else {
      attackAbilityMod = strMod;
    }

    const isProficient =
      weaponProficiencies.includes("martial") ||
      weaponProficiencies.includes("simple") ||
      weaponProficiencies.includes(item.slug);

    const attackBonus = attackAbilityMod + (isProficient ? proficiencyBonus : 0);
    const damageBonus = attackAbilityMod;

    const attack = {
      name: item.name,
      attackBonus,
      damage: `${weapon.damage_dice}${damageBonus >= 0 ? "+" : ""}${damageBonus}`,
      damageType: weapon.damage_type,
      properties: weapon.properties,
      ...(weapon.range
        ? { range: `${weapon.range.normal}/${weapon.range.long} ft.` }
        : {}),
    };

    attacks.push(attack);
  }

  return attacks;
}

function collectClassModifiers(classData: ClassData, level: number): Modifier[] {
  const modifiers: Modifier[] = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    const features = classData.features_by_level[String(lvl)];
    if (features) {
      for (const f of features) {
        if (f.modifiers) modifiers.push(...f.modifiers);
      }
    }
  }
  return modifiers;
}

function collectSubclassModifiers(subclass: SubclassData, level: number): Modifier[] {
  const modifiers: Modifier[] = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    const features = subclass.features_by_level[String(lvl)];
    if (features) {
      for (const f of features) {
        if (f.modifiers) modifiers.push(...f.modifiers);
      }
    }
  }
  return modifiers;
}

function isArmorProf(prof: string): boolean {
  return ["light", "medium", "heavy", "shields", "light_armor", "medium_armor"].includes(prof);
}

function isWeaponProf(prof: string): boolean {
  return !isArmorProf(prof);
}

// Re-export EquippedArmor type
export type { EquippedArmor };
