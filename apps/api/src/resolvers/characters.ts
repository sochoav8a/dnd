import type { GraphQLContext } from "../graphql/context.js";
import { requireAuth } from "../graphql/context.js";
import { and, eq, schema } from "@dnd/db";
import { computeCharacter } from "@dnd/rules-engine";
import type {
  RaceData,
  SubraceData,
  ClassData,
  SubclassData,
  BackgroundData,
  ItemData,
  CharacterState,
  AbilityScores,
} from "@dnd/shared";
import type { EquipmentItem } from "@dnd/rules-engine";

type InventoryRow = typeof schema.inventoryItems.$inferSelect;

function applyDomainSpells(
  state: CharacterState,
  subclassData: SubclassData | undefined,
  level: number,
): void {
  const domainSpells = (subclassData as { domain_spells?: Record<string, string[]> } | undefined)?.domain_spells;
  if (!domainSpells) return;

  const granted = new Set<string>();
  for (const [thresholdStr, slugs] of Object.entries(domainSpells)) {
    const threshold = parseInt(thresholdStr);
    if (!Number.isFinite(threshold) || level < threshold) continue;
    for (const slug of slugs) granted.add(slug);
  }

  const known = new Set(state.known_spells);
  const prepared = new Set(state.prepared_spells);
  for (const slug of granted) {
    known.add(slug);
    prepared.add(slug);
  }
  state.known_spells = Array.from(known);
  state.prepared_spells = Array.from(prepared);
}

async function buildComputeContext(
  ctx: GraphQLContext,
  character: typeof schema.characters.$inferSelect,
  state: CharacterState,
) {
  const [raceItem, subraceItem, classItem, subclassItem, backgroundItem, inventory] = await Promise.all([
    ctx.db.query.contentItems.findFirst({
      where: eq(schema.contentItems.id, character.raceId),
    }),
    character.subraceId
      ? ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, character.subraceId),
        })
      : Promise.resolve(null),
    ctx.db.query.contentItems.findFirst({
      where: eq(schema.contentItems.id, character.classId),
    }),
    character.subclassId
      ? ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, character.subclassId),
        })
      : Promise.resolve(null),
    ctx.db.query.contentItems.findFirst({
      where: eq(schema.contentItems.id, character.backgroundId),
    }),
    ctx.db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.characterId, character.id)),
  ]);

  if (!raceItem || !classItem || !backgroundItem) {
    throw new Error("Content items not found");
  }

  const equippedItems: EquipmentItem[] = (inventory as InventoryRow[])
    .filter((item) => item.equipped as unknown as boolean)
    .filter((item) => item.customData)
    .map((item) => ({
      slug: item.contentItemId ?? item.id,
      name: item.name,
      equipped: true,
      attunement: item.attunement as unknown as boolean,
      data: item.customData as unknown as ItemData,
    }));

  return computeCharacter({
    level: character.level,
    abilityScores: state.ability_scores,
    race: raceItem.data as RaceData,
    ...(subraceItem ? { subrace: subraceItem.data as SubraceData } : {}),
    classData: classItem.data as ClassData,
    ...(subclassItem ? { subclass: subclassItem.data as SubclassData } : {}),
    background: backgroundItem.data as BackgroundData,
    equipment: equippedItems,
    conditions: state.conditions,
    customModifiers: state.custom_modifiers,
  });
}

export const characterResolvers = {
  Query: {
    async character(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const [char] = await ctx.db
        .select()
        .from(schema.characters)
        .where(
          and(
            eq(schema.characters.id, id),
            eq(schema.characters.userId, user.userId),
          ),
        )
        .limit(1);
      return char ?? null;
    },

    async characters(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return ctx.db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.userId, user.userId));
    },
  },

  Mutation: {
    async createCharacter(
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          raceId: string;
          subraceId?: string;
          classId: string;
          subclassId?: string;
          backgroundId: string;
          abilityScores: AbilityScores;
          campaignId?: string;
          startingEquipmentIds?: string[];
          knownSpellSlugs?: string[];
          preparedSpellSlugs?: string[];
        };
      },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      // Load content items
      const [raceItem, subraceItem, classItem, subclassItem, backgroundItem] = await Promise.all([
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.raceId),
        }),
        input.subraceId
          ? ctx.db.query.contentItems.findFirst({
              where: eq(schema.contentItems.id, input.subraceId),
            })
          : Promise.resolve(null),
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.classId),
        }),
        input.subclassId
          ? ctx.db.query.contentItems.findFirst({
              where: eq(schema.contentItems.id, input.subclassId),
            })
          : Promise.resolve(null),
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.backgroundId),
        }),
      ]);

      if (!raceItem || !classItem || !backgroundItem) {
        throw new Error("Invalid content item references");
      }

      const raceData = raceItem.data as RaceData;
      const subraceData = subraceItem ? (subraceItem.data as SubraceData) : undefined;
      const classData = classItem.data as ClassData;
      const subclassData = subclassItem ? (subclassItem.data as SubclassData) : undefined;
      const backgroundData = backgroundItem.data as BackgroundData;

      // Build initial state
      const state: CharacterState = {
        ability_scores: input.abilityScores,
        hp: { current: 0, max: 0, temp: 0 },
        hit_dice: [],
        spell_slots: {},
        prepared_spells: input.preparedSpellSlugs ?? [],
        known_spells: input.knownSpellSlugs ?? [],
        conditions: [],
        death_saves: { successes: 0, failures: 0 },
        inspiration: false,
        exhaustion_level: 0,
        notes: "",
        custom_modifiers: [],
      };

      // Auto-grant domain/archetype spells (e.g. Cleric domain spells)
      applyDomainSpells(state, subclassData, 1);

      // Compute initial state
      const computed = computeCharacter({
        level: 1,
        abilityScores: input.abilityScores,
        race: raceData,
        ...(subraceData ? { subrace: subraceData } : {}),
        classData,
        ...(subclassData ? { subclass: subclassData } : {}),
        background: backgroundData,
        equipment: [],
      });

      // Set initial HP and hit dice
      state.hp.max = computed.maxHp;
      state.hp.current = computed.maxHp;
      state.hit_dice = [{ die: classData.hit_die, total: 1, remaining: 1 }];

      // Initialize spell slots at level 1
      for (const [lvl, total] of Object.entries(computed.spellSlotsByLevel)) {
        state.spell_slots[parseInt(lvl)] = { total, remaining: total };
      }

      const [character] = await ctx.db
        .insert(schema.characters)
        .values({
          userId: user.userId,
          campaignId: input.campaignId ?? null,
          name: input.name,
          level: 1,
          raceId: input.raceId,
          subraceId: input.subraceId ?? null,
          classId: input.classId,
          subclassId: input.subclassId ?? null,
          backgroundId: input.backgroundId,
          state: state as unknown as Record<string, unknown>,
          computed: computed as unknown as Record<string, unknown>,
        })
        .returning();

      // Attach starting equipment as inventory items
      if (input.startingEquipmentIds && input.startingEquipmentIds.length > 0 && character) {
        for (const itemId of input.startingEquipmentIds) {
          const [contentItem] = await ctx.db
            .select()
            .from(schema.contentItems)
            .where(eq(schema.contentItems.id, itemId))
            .limit(1);
          if (!contentItem) continue;
          await ctx.db.insert(schema.inventoryItems).values({
            characterId: character.id,
            contentItemId: contentItem.id,
            name: contentItem.name,
            quantity: 1,
            customData: contentItem.data as Record<string, unknown>,
          });
        }
      }

      return character;
    },

    async updateCharacterState(
      _: unknown,
      { input }: { input: { characterId: string; state: CharacterState } },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      // Verify ownership
      const [existing] = await ctx.db
        .select()
        .from(schema.characters)
        .where(
          and(
            eq(schema.characters.id, input.characterId),
            eq(schema.characters.userId, user.userId),
          ),
        )
        .limit(1);

      if (!existing) throw new Error("Character not found");

      const computed = await buildComputeContext(ctx, existing, input.state);

      const [updated] = await ctx.db
        .update(schema.characters)
        .set({
          state: input.state as unknown as Record<string, unknown>,
          computed: computed as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(schema.characters.id, input.characterId))
        .returning();

      return updated;
    },

    async levelUp(
      _: unknown,
      {
        input,
      }: {
        input: {
          characterId: string;
          newLevel: number;
          hitPointRoll?: number;
          subclassId?: string;
          abilityScoreImprovements?: Partial<AbilityScores>;
          featId?: string;
          featAbilityChoice?: string;
          knownSpellSlugs?: string[];
          preparedSpellSlugs?: string[];
        };
      },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const { characterId, newLevel, hitPointRoll, subclassId, abilityScoreImprovements, featId, featAbilityChoice, knownSpellSlugs, preparedSpellSlugs } = input;

      if (newLevel < 2 || newLevel > 20) {
        throw new Error("Level must be between 2 and 20");
      }

      const [existing] = await ctx.db
        .select()
        .from(schema.characters)
        .where(
          and(
            eq(schema.characters.id, characterId),
            eq(schema.characters.userId, user.userId),
          ),
        )
        .limit(1);

      if (!existing) throw new Error("Character not found");
      if (existing.level >= newLevel) throw new Error("New level must be higher than current level");

      const [classItem] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, existing.classId))
        .limit(1);

      if (!classItem) throw new Error("Class not found");
      const classData = classItem.data as ClassData;

      const state = existing.state as unknown as CharacterState;

      // Apply ASI (capped at 20)
      if (abilityScoreImprovements) {
        for (const [ab, bonus] of Object.entries(abilityScoreImprovements)) {
          if (!bonus) continue;
          const key = ab as keyof AbilityScores;
          state.ability_scores[key] = Math.min(20, state.ability_scores[key] + bonus);
        }
      }

      // HP gain: (roll or average) + CON mod per new level
      const conMod = Math.floor((state.ability_scores.CON - 10) / 2);
      const levelsGained = newLevel - existing.level;
      const averageHpGain = Math.floor(classData.hit_die / 2) + 1 + conMod;

      let hpGain: number;
      if (hitPointRoll !== undefined) {
        // hitPointRoll is the raw die roll (e.g. 1-10 for d10); CON mod added per level gained
        hpGain = hitPointRoll + conMod * levelsGained;
      } else {
        hpGain = averageHpGain * levelsGained;
      }

      state.hp.max = Math.max(1, state.hp.max + hpGain);
      state.hp.current = Math.min(state.hp.max, state.hp.current + hpGain);

      // Update hit dice pool
      const existingHd = state.hit_dice.find((h) => h.die === classData.hit_die);
      if (existingHd) {
        existingHd.total += levelsGained;
        existingHd.remaining = Math.min(existingHd.total, existingHd.remaining + levelsGained);
      } else {
        state.hit_dice.push({ die: classData.hit_die, total: levelsGained, remaining: levelsGained });
      }

      // Record feat selection: apply ability_score_improvement (half-feats)
      // and push modifiers into custom_modifiers so rules engine sees them.
      if (featId) {
        const [featItem] = await ctx.db
          .select()
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, featId))
          .limit(1);
        if (featItem) {
          const existingNote = state.notes ? `${state.notes}\n` : "";
          state.notes = `${existingNote}Nivel ${newLevel}: feat "${featItem.name}"`;

          const featData = featItem.data as {
            modifiers?: unknown[];
            ability_score_improvement?: Partial<Record<keyof AbilityScores, number>>;
            ability_score_choice?: { amount: number; from: string[] };
          } | null;

          // Fixed half-feats (e.g. Actor +1 CHA, Durable +1 CON)
          if (featData?.ability_score_improvement) {
            for (const [ab, bonus] of Object.entries(featData.ability_score_improvement)) {
              if (!bonus) continue;
              const key = ab as keyof AbilityScores;
              state.ability_scores[key] = Math.min(
                20,
                (state.ability_scores[key] ?? 0) + bonus,
              );
            }
          }

          // Choice-based half-feats (e.g. Resilient, Athlete): apply picked ability
          if (featData?.ability_score_choice) {
            if (!featAbilityChoice) {
              throw new Error(
                `El feat "${featItem.name}" requiere elegir una habilidad (${featData.ability_score_choice.from.join("/")})`,
              );
            }
            if (!featData.ability_score_choice.from.includes(featAbilityChoice)) {
              throw new Error(
                `La habilidad "${featAbilityChoice}" no es válida para "${featItem.name}"`,
              );
            }
            const key = featAbilityChoice as keyof AbilityScores;
            state.ability_scores[key] = Math.min(
              20,
              (state.ability_scores[key] ?? 0) + featData.ability_score_choice.amount,
            );
          }

          if (featData?.modifiers && Array.isArray(featData.modifiers)) {
            state.custom_modifiers = [
              ...state.custom_modifiers,
              ...(featData.modifiers as CharacterState["custom_modifiers"]),
            ];
          }
        }
      }

      // Update spell lists if provided
      if (knownSpellSlugs) state.known_spells = knownSpellSlugs;
      if (preparedSpellSlugs) state.prepared_spells = preparedSpellSlugs;

      // Assign subclass if provided at this level-up
      const finalSubclassId = subclassId ?? existing.subclassId;

      // Auto-grant domain/archetype spells unlocked by the new level
      if (finalSubclassId) {
        const [subItem] = await ctx.db
          .select()
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, finalSubclassId))
          .limit(1);
        if (subItem) {
          applyDomainSpells(state, subItem.data as SubclassData, newLevel);
        }
      }

      // Rebuild a patched character row for recompute (with new level + subclass + scores)
      const patched = { ...existing, level: newLevel, subclassId: finalSubclassId };
      const computed = await buildComputeContext(ctx, patched, state);

      // Refresh spell slots totals (preserve remaining where possible)
      const newSlots: CharacterState["spell_slots"] = {};
      for (const [lvl, total] of Object.entries(computed.spellSlotsByLevel)) {
        const level = parseInt(lvl);
        const previous = state.spell_slots[level];
        const remaining = previous ? Math.min(previous.remaining, total) : total;
        newSlots[level] = { total, remaining };
      }
      state.spell_slots = newSlots;

      const [updated] = await ctx.db
        .update(schema.characters)
        .set({
          level: newLevel,
          subclassId: finalSubclassId,
          state: state as unknown as Record<string, unknown>,
          computed: computed as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(schema.characters.id, characterId))
        .returning();

      return updated;
    },

    async shortRest(
      _: unknown,
      {
        input,
      }: {
        input: {
          characterId: string;
          diceSpent?: Array<{ die: number; roll: number }>;
        };
      },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const [existing] = await ctx.db
        .select()
        .from(schema.characters)
        .where(
          and(
            eq(schema.characters.id, input.characterId),
            eq(schema.characters.userId, user.userId),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Character not found");

      const state = existing.state as unknown as CharacterState;
      const conMod = Math.floor((state.ability_scores.CON - 10) / 2);

      // Spend hit dice — subtract remaining, add HP
      for (const entry of input.diceSpent ?? []) {
        const hd = state.hit_dice.find((h) => h.die === entry.die);
        if (!hd || hd.remaining <= 0) {
          throw new Error(`No quedan dados de golpe d${entry.die}`);
        }
        hd.remaining = Math.max(0, hd.remaining - 1);
        const healed = Math.max(0, entry.roll + conMod);
        state.hp.current = Math.min(state.hp.max, state.hp.current + healed);
      }

      // Warlock: pact magic slots recover on short rest
      const [classItem] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, existing.classId))
        .limit(1);
      const classData = classItem?.data as ClassData | undefined;
      if (classData?.spell_casting?.type === "warlock") {
        for (const lvl of Object.keys(state.spell_slots)) {
          const slot = state.spell_slots[Number(lvl)];
          if (slot) slot.remaining = slot.total;
        }
      }

      const [updated] = await ctx.db
        .update(schema.characters)
        .set({
          state: state as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(schema.characters.id, input.characterId))
        .returning();
      return updated;
    },

    async longRest(
      _: unknown,
      { characterId }: { characterId: string },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const [existing] = await ctx.db
        .select()
        .from(schema.characters)
        .where(
          and(
            eq(schema.characters.id, characterId),
            eq(schema.characters.userId, user.userId),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Character not found");

      const state = existing.state as unknown as CharacterState;

      // Full HP
      state.hp.current = state.hp.max;
      // Regain half hit dice (min 1) per type, capped at total
      for (const hd of state.hit_dice) {
        const regained = Math.max(1, Math.floor(hd.total / 2));
        hd.remaining = Math.min(hd.total, hd.remaining + regained);
      }
      // Reset all spell slots
      for (const lvl of Object.keys(state.spell_slots)) {
        const slot = state.spell_slots[Number(lvl)];
        if (slot) slot.remaining = slot.total;
      }
      // Exhaustion -1
      state.exhaustion_level = Math.max(0, state.exhaustion_level - 1);
      // Reset death saves
      state.death_saves = { successes: 0, failures: 0 };
      // Concentration ends
      state.concentrating_on = null;

      const [updated] = await ctx.db
        .update(schema.characters)
        .set({
          state: state as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(schema.characters.id, characterId))
        .returning();
      return updated;
    },

    async deleteCharacter(
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const [existing] = await ctx.db
        .select({ userId: schema.characters.userId })
        .from(schema.characters)
        .where(eq(schema.characters.id, id))
        .limit(1);
      if (!existing) return false;
      if (existing.userId !== user.userId) {
        throw new Error("Not authorized");
      }
      await ctx.db.delete(schema.characters).where(eq(schema.characters.id, id));
      return true;
    },

    async addInventoryItem(
      _: unknown,
      { input }: { input: { characterId: string; contentItemId?: string; name: string; quantity?: number; notes?: string } },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      const [char] = await ctx.db
        .select({ userId: schema.characters.userId })
        .from(schema.characters)
        .where(eq(schema.characters.id, input.characterId))
        .limit(1);

      if (!char || char.userId !== user.userId) throw new Error("Character not found");

      let itemName = input.name;
      let customData: unknown = null;

      if (input.contentItemId) {
        const [contentItem] = await ctx.db
          .select()
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, input.contentItemId))
          .limit(1);

        if (contentItem) {
          itemName = contentItem.name;
          customData = contentItem.data;
        }
      }

      const [item] = await ctx.db
        .insert(schema.inventoryItems)
        .values({
          characterId: input.characterId,
          contentItemId: input.contentItemId ?? null,
          name: itemName,
          quantity: input.quantity ?? 1,
          notes: input.notes ?? null,
          customData: customData as Record<string, unknown> | null,
        })
        .returning();

      return item;
    },

    async removeInventoryItem(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);

      const [item] = await ctx.db
        .select({ characterId: schema.inventoryItems.characterId })
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.id, id))
        .limit(1);

      if (!item) return false;

      const [char] = await ctx.db
        .select({ userId: schema.characters.userId })
        .from(schema.characters)
        .where(eq(schema.characters.id, item.characterId))
        .limit(1);

      if (!char || char.userId !== user.userId) throw new Error("Not authorized");

      await ctx.db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
      return true;
    },

    async equipItem(
      _: unknown,
      { id, equipped }: { id: string; equipped: boolean },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      const [item] = await ctx.db
        .select()
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.id, id))
        .limit(1);

      if (!item) throw new Error("Item not found");

      const [char] = await ctx.db
        .select({ userId: schema.characters.userId })
        .from(schema.characters)
        .where(eq(schema.characters.id, item.characterId))
        .limit(1);

      if (!char || char.userId !== user.userId) throw new Error("Not authorized");

      const [updated] = await ctx.db
        .update(schema.inventoryItems)
        .set({ equipped: equipped as unknown as boolean })
        .where(eq(schema.inventoryItems.id, id))
        .returning();

      // Recompute AC (and other derived stats) after equip/unequip
      const [fullChar] = await ctx.db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, item.characterId))
        .limit(1);

      if (fullChar) {
        const state = (fullChar.state ?? {}) as CharacterState;
        const computed = await buildComputeContext(ctx, fullChar, state);
        await ctx.db
          .update(schema.characters)
          .set({ computed: computed as unknown as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(schema.characters.id, item.characterId));
      }

      return updated;
    },
  },

  Character: {
    async user(parent: { userId: string }, _: unknown, ctx: GraphQLContext) {
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, parent.userId))
        .limit(1);
      return user;
    },

    async race(parent: { raceId: string }, _: unknown, ctx: GraphQLContext) {
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, parent.raceId))
        .limit(1);
      return item;
    },

    async subrace(parent: { subraceId: string | null }, _: unknown, ctx: GraphQLContext) {
      if (!parent.subraceId) return null;
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, parent.subraceId))
        .limit(1);
      return item ?? null;
    },

    async class(parent: { classId: string }, _: unknown, ctx: GraphQLContext) {
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, parent.classId))
        .limit(1);
      return item;
    },

    async subclass(parent: { subclassId: string | null }, _: unknown, ctx: GraphQLContext) {
      if (!parent.subclassId) return null;
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, parent.subclassId))
        .limit(1);
      return item ?? null;
    },

    async background(parent: { backgroundId: string }, _: unknown, ctx: GraphQLContext) {
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, parent.backgroundId))
        .limit(1);
      return item;
    },

    async campaign(parent: { campaignId: string | null }, _: unknown, ctx: GraphQLContext) {
      if (!parent.campaignId) return null;
      const [campaign] = await ctx.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, parent.campaignId))
        .limit(1);
      return campaign ?? null;
    },

    async inventory(parent: { id: string }, _: unknown, ctx: GraphQLContext) {
      return ctx.db
        .select()
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.characterId, parent.id));
    },
  },
};
