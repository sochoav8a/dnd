import { describe, it, expect } from "vitest";
import { computeCharacter } from "../compute.js";
import type { ComputeInput } from "../compute.js";
import type {
  AbilityScores,
  RaceData,
  ClassData,
  BackgroundData,
  SubclassData,
} from "@dnd/shared";

// ── Fixtures ───────────────────────────────────────────────────────────────

const humanRace: RaceData = {
  speed: 30,
  size: "Medium",
  ability_bonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
  traits: [],
  languages: ["Common"],
  subraces: [],
};

const fighterClass: ClassData = {
  hit_die: 10,
  primary_ability: ["STR"],
  saving_throws: ["STR", "CON"],
  armor_proficiencies: ["light", "medium", "heavy", "shields"],
  weapon_proficiencies: ["simple", "martial"],
  skill_choices: { count: 2, from: ["Athletics"] },
  subclass_level: 3,
  spell_casting: null,
  features_by_level: {
    "1": [
      { name: "Fighting Style", description: "You adopt a style of fighting." },
      { name: "Second Wind", description: "You can use a bonus action to regain HP." },
    ],
    "2": [
      { name: "Action Surge", description: "You can take one additional action." },
    ],
    "5": [
      { name: "Extra Attack", description: "You can attack twice." },
    ],
  },
};

const wizardClass: ClassData = {
  hit_die: 6,
  primary_ability: ["INT"],
  saving_throws: ["INT", "WIS"],
  armor_proficiencies: [],
  weapon_proficiencies: ["daggers"],
  skill_choices: { count: 2, from: ["Arcana"] },
  subclass_level: 2,
  spell_casting: { ability: "INT", type: "full" },
  features_by_level: {
    "1": [{ name: "Arcane Recovery", description: "Recover spell slots on short rest." }],
    "2": [{ name: "Arcane Tradition", description: "Choose a tradition." }],
  },
};

const soldierBackground: BackgroundData = {
  skill_proficiencies: ["athletics", "intimidation"],
  feature: { name: "Military Rank", description: "You have a military rank." },
};

const standardScores: AbilityScores = {
  STR: 16, DEX: 14, CON: 12, INT: 10, WIS: 8, CHA: 13,
};

const baseInput: ComputeInput = {
  level: 1,
  abilityScores: standardScores,
  race: humanRace,
  classData: fighterClass,
  background: soldierBackground,
  equipment: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("computeCharacter", () => {
  describe("Fighter level 1", () => {
    const result = computeCharacter(baseInput);

    it("computes correct proficiency bonus", () => {
      expect(result.proficiencyBonus).toBe(2);
    });

    it("computes correct ability modifiers", () => {
      expect(result.abilityModifiers.STR).toBe(3);
      expect(result.abilityModifiers.DEX).toBe(2);
      expect(result.abilityModifiers.CON).toBe(1);
    });

    it("computes correct HP (d10 + CON 1)", () => {
      expect(result.maxHp).toBe(11);
    });

    it("computes correct base AC (no armor: 10 + DEX 2)", () => {
      expect(result.ac).toBe(12);
    });

    it("computes correct initiative (DEX mod)", () => {
      expect(result.initiative).toBe(2);
    });

    it("computes correct speed", () => {
      expect(result.speed).toBe(30);
    });

    it("has proficiency in STR and CON saves", () => {
      expect(result.savingThrows.STR.proficient).toBe(true);
      expect(result.savingThrows.CON.proficient).toBe(true);
      expect(result.savingThrows.DEX.proficient).toBe(false);
    });

    it("has proficient skills from background", () => {
      expect(result.skills.athletics.proficient).toBe(true);
      expect(result.skills.intimidation.proficient).toBe(true);
      expect(result.skills.arcana.proficient).toBe(false);
    });

    it("computes athletics skill total (STR 3 + prof 2 = 5)", () => {
      expect(result.skills.athletics.total).toBe(5);
    });

    it("includes class features from level 1", () => {
      const names = result.features.map((f) => f.name);
      expect(names).toContain("Fighting Style");
      expect(names).toContain("Second Wind");
    });

    it("has correct armor proficiencies", () => {
      expect(result.armorProficiencies).toContain("heavy");
    });
  });

  describe("Fighter level 5", () => {
    const result = computeCharacter({ ...baseInput, level: 5 });

    it("computes proficiency bonus +3", () => {
      expect(result.proficiencyBonus).toBe(3);
    });

    it("includes Extra Attack feature", () => {
      const names = result.features.map((f) => f.name);
      expect(names).toContain("Extra Attack");
    });

    it("computes HP for 5 levels", () => {
      // Level 1: 10+1=11. Levels 2-5: 4×(6+1)=28. Total: 39
      expect(result.maxHp).toBe(39);
    });

    it("has proficiency bonus 3 applied to skills", () => {
      expect(result.skills.athletics.total).toBe(6); // 3 STR + 3 prof
    });
  });

  describe("Wizard level 3 (spellcasting)", () => {
    const sageBackground: BackgroundData = {
      skill_proficiencies: ["arcana", "history"],
      feature: { name: "Researcher", description: "You know where to find info." },
    };

    const wizardInput: ComputeInput = {
      level: 3,
      abilityScores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 },
      race: humanRace,
      classData: wizardClass,
      background: sageBackground,
      equipment: [],
    };

    const result = computeCharacter(wizardInput);

    it("computes spellcasting DC (8 + prof 2 + INT 3 = 13)", () => {
      expect(result.spellcasting?.spellSaveDC).toBe(13);
    });

    it("computes spell attack bonus (prof 2 + INT 3 = 5)", () => {
      expect(result.spellcasting?.spellAttackBonus).toBe(5);
    });

    it("returns full caster spell slots at level 3", () => {
      expect(result.spellSlotsByLevel[1]).toBe(4);
      expect(result.spellSlotsByLevel[2]).toBe(2);
      expect(result.spellSlotsByLevel[3]).toBeUndefined();
    });

    it("has INT as spellcasting ability", () => {
      expect(result.spellcasting?.ability).toBe("INT");
    });
  });

  describe("AC calculation with equipment", () => {
    it("computes AC with chain mail equipped", () => {
      const result = computeCharacter({
        ...baseInput,
        equipment: [
          {
            slug: "chain-mail",
            name: "Chain Mail",
            equipped: true,
            attunement: false,
            data: {
              category: "armor",
              armor: { base_ac: 16, type: "heavy", max_dex_bonus: 0 },
            },
          },
        ],
      });
      expect(result.ac).toBe(16);
    });

    it("computes AC with studded leather + shield", () => {
      const result = computeCharacter({
        ...baseInput,
        equipment: [
          {
            slug: "studded-leather",
            name: "Studded Leather",
            equipped: true,
            attunement: false,
            data: {
              category: "armor",
              armor: { base_ac: 12, type: "light" },
            },
          },
          {
            slug: "shield",
            name: "Shield",
            equipped: true,
            attunement: false,
            data: {
              category: "shield",
              armor: { base_ac: 2, type: "shield" },
            },
          },
        ],
      });
      // 12 (studded) + 2 (DEX) + 2 (shield) = 16
      expect(result.ac).toBe(16);
    });
  });

  describe("Barbarian Unarmored Defense", () => {
    const barbarianClass: ClassData = {
      hit_die: 12,
      primary_ability: ["STR"],
      saving_throws: ["STR", "CON"],
      armor_proficiencies: ["light", "medium", "shields"],
      weapon_proficiencies: ["simple", "martial"],
      skill_choices: { count: 2, from: ["Athletics"] },
      subclass_level: 3,
      spell_casting: null,
      features_by_level: {
        "1": [
          {
            name: "Unarmored Defense",
            description: "AC = 10 + DEX + CON when not wearing armor.",
            modifiers: [
              {
                target: "ac",
                type: "set",
                value: "10+DEX+CON",
                source: "class:barbarian:unarmored_defense",
                priority: 5,
                condition: { armor_type: "none" },
              },
            ],
          },
        ],
      },
    };

    it("uses 10+DEX+CON for AC when unarmored", () => {
      const result = computeCharacter({
        level: 1,
        abilityScores: { STR: 16, DEX: 14, CON: 16, INT: 8, WIS: 10, CHA: 8 },
        race: humanRace,
        classData: barbarianClass,
        background: soldierBackground,
        equipment: [],
      });
      // 10 + 2 (DEX) + 3 (CON) = 15
      expect(result.ac).toBe(15);
    });
  });

  describe("Subclass modifiers", () => {
    it("applies skill, expertise, and speed modifiers from scout", () => {
      const rogueClass: ClassData = {
        hit_die: 8,
        primary_ability: ["DEX"],
        saving_throws: ["DEX", "INT"],
        armor_proficiencies: ["light"],
        weapon_proficiencies: ["simple", "rapier"],
        tool_proficiencies: ["thieves_tools"],
        skill_choices: { count: 4, from: ["stealth", "perception"] },
        subclass_level: 3,
        spell_casting: null,
        features_by_level: {
          "1": [{ name: "Sneak Attack", description: "Deal extra damage once per turn." }],
        },
      };

      const scoutSubclass: SubclassData = {
        parent_class: "rogue",
        flavor_name: "Batidor",
        features_by_level: {
          "3": [
            {
              name: "Superviviente Nato",
              description: "Nature and Survival expertise.",
              modifiers: [
                {
                  target: "skill.nature",
                  type: "proficiency",
                  value: "nature",
                  source: "test:scout:survivalist",
                  priority: 20,
                },
                {
                  target: "skill.survival",
                  type: "proficiency",
                  value: "survival",
                  source: "test:scout:survivalist",
                  priority: 20,
                },
                {
                  target: "skill.nature",
                  type: "expertise",
                  value: "nature",
                  source: "test:scout:survivalist",
                  priority: 30,
                },
                {
                  target: "skill.survival",
                  type: "expertise",
                  value: "survival",
                  source: "test:scout:survivalist",
                  priority: 30,
                },
              ],
            },
          ],
          "9": [
            {
              name: "Movilidad Superior",
              description: "Speed +10.",
              modifiers: [
                {
                  target: "speed",
                  type: "bonus",
                  value: 10,
                  source: "test:scout:superior_mobility",
                  priority: 20,
                },
              ],
            },
          ],
        },
      };

      const result = computeCharacter({
        level: 9,
        abilityScores: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 14, CHA: 8 },
        race: humanRace,
        classData: rogueClass,
        subclass: scoutSubclass,
        background: {
          skill_proficiencies: ["stealth", "perception"],
          tool_proficiencies: ["thieves_tools"],
          feature: { name: "Wanderer", description: "You can find food and water." },
        },
        equipment: [],
      });

      expect(result.speed).toBe(40);
      expect(result.skills.nature.proficient).toBe(true);
      expect(result.skills.nature.expertise).toBe(true);
      expect(result.skills.survival.proficient).toBe(true);
      expect(result.skills.survival.expertise).toBe(true);
    });

    it("applies proficiencies from hexblade", () => {
      const warlockClass: ClassData = {
        hit_die: 8,
        primary_ability: ["CHA"],
        saving_throws: ["WIS", "CHA"],
        armor_proficiencies: ["light"],
        weapon_proficiencies: ["simple"],
        skill_choices: { count: 2, from: ["arcana", "deception"] },
        subclass_level: 1,
        spell_casting: { ability: "CHA", type: "warlock" },
        features_by_level: {
          "1": [{ name: "Otherworldly Patron", description: "Choose a patron." }],
        },
      };

      const hexbladeSubclass: SubclassData = {
        parent_class: "warlock",
        flavor_name: "El Filo Maléfico",
        features_by_level: {
          "1": [
            {
              name: "Guerrero Maléfico",
              description: "Gain medium armor, shields, and martial weapons.",
              modifiers: [
                {
                  target: "armor.medium",
                  type: "proficiency",
                  value: "medium",
                  source: "test:hexblade:hex_warrior",
                  priority: 20,
                },
                {
                  target: "armor.shields",
                  type: "proficiency",
                  value: "shields",
                  source: "test:hexblade:hex_warrior",
                  priority: 20,
                },
                {
                  target: "weapon.martial",
                  type: "proficiency",
                  value: "martial",
                  source: "test:hexblade:hex_warrior",
                  priority: 20,
                },
              ],
            },
          ],
        },
      };

      const result = computeCharacter({
        level: 5,
        abilityScores: { STR: 10, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 16 },
        race: humanRace,
        classData: warlockClass,
        subclass: hexbladeSubclass,
        background: soldierBackground,
        equipment: [],
      });

      expect(result.armorProficiencies).toContain("medium");
      expect(result.armorProficiencies).toContain("shields");
      expect(result.weaponProficiencies).toContain("martial");
    });

    it("applies language, initiative, resistance, and immunity modifiers", () => {
      const warMageSubclass: SubclassData = {
        parent_class: "wizard",
        flavor_name: "Magia de Guerra",
        features_by_level: {
          "2": [
            {
              name: "Ingenio Táctico",
              description: "Add INT to initiative.",
              modifiers: [
                {
                  target: "initiative",
                  type: "bonus",
                  value: "INT",
                  source: "test:war_magic:tactical_wit",
                  priority: 20,
                },
              ],
            },
          ],
        },
      };

      const stormSubclass: SubclassData = {
        parent_class: "sorcerer",
        flavor_name: "Hechicería de Tormenta",
        features_by_level: {
          "1": [
            {
              name: "Portavoz del Viento",
              description: "Learn Primordial.",
              modifiers: [
                {
                  target: "language.primordial",
                  type: "proficiency",
                  value: "Primordial",
                  source: "test:storm:wind_speaker",
                  priority: 20,
                },
              ],
            },
          ],
          "6": [
            {
              name: "Corazón de la Tormenta",
              description: "Lightning and thunder resistance.",
              modifiers: [
                {
                  target: "resistance.lightning",
                  type: "resistance",
                  value: "lightning",
                  source: "test:storm:heart",
                  priority: 20,
                },
                {
                  target: "resistance.thunder",
                  type: "resistance",
                  value: "thunder",
                  source: "test:storm:heart",
                  priority: 20,
                },
              ],
            },
          ],
          "18": [
            {
              name: "Alma del Viento",
              description: "Lightning and thunder immunity.",
              modifiers: [
                {
                  target: "immunity.lightning",
                  type: "immunity",
                  value: "lightning",
                  source: "test:storm:soul",
                  priority: 20,
                },
                {
                  target: "immunity.thunder",
                  type: "immunity",
                  value: "thunder",
                  source: "test:storm:soul",
                  priority: 20,
                },
              ],
            },
          ],
        },
      };

      const wizardResult = computeCharacter({
        level: 5,
        abilityScores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 },
        race: humanRace,
        classData: wizardClass,
        subclass: warMageSubclass,
        background: soldierBackground,
        equipment: [],
      });

      expect(wizardResult.initiative).toBe(5);

      const sorcererClass: ClassData = {
        hit_die: 6,
        primary_ability: ["CHA"],
        saving_throws: ["CON", "CHA"],
        armor_proficiencies: [],
        weapon_proficiencies: ["daggers"],
        skill_choices: { count: 2, from: ["arcana", "persuasion"] },
        subclass_level: 1,
        spell_casting: { ability: "CHA", type: "full" },
        features_by_level: {
          "1": [{ name: "Sorcerous Origin", description: "Choose an origin." }],
        },
      };

      const sorcererResult = computeCharacter({
        level: 18,
        abilityScores: { STR: 8, DEX: 14, CON: 12, INT: 10, WIS: 12, CHA: 18 },
        race: humanRace,
        classData: sorcererClass,
        subclass: stormSubclass,
        background: soldierBackground,
        equipment: [],
      });

      expect(sorcererResult.languages).toContain("Primordial");
      expect(sorcererResult.resistances).toEqual(
        expect.arrayContaining(["lightning", "thunder"]),
      );
      expect(sorcererResult.immunities).toEqual(
        expect.arrayContaining(["lightning", "thunder"]),
      );
    });
  });
});
