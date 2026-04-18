import { describe, it, expect } from "vitest";
import { computeCharacter } from "../compute.js";
import type { ComputeInput } from "../compute.js";
import type { AbilityScores, RaceData, ClassData, BackgroundData } from "@dnd/shared";

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
});
