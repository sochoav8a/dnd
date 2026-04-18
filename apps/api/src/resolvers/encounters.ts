import { eq, schema } from "@dnd/db";
import type { GraphQLContext } from "../graphql/context.js";

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user) throw new Error("Not authenticated");
  return ctx.user.userId;
}

async function requireDmAccess(ctx: GraphQLContext, campaignId: string) {
  const userId = requireAuth(ctx);
  const [member] = await ctx.db
    .select()
    .from(schema.campaignMembers)
    .where(eq(schema.campaignMembers.campaignId, campaignId))
    .limit(20);

  // Check if user is DM of this campaign
  const [campaign] = await ctx.db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.id, campaignId))
    .limit(1);

  if (!campaign || campaign.dmId !== userId) {
    throw new Error("Only the DM can manage encounters");
  }
  return campaign;
}

async function requireEncounterDmAccess(ctx: GraphQLContext, encounterId: string) {
  const [encounter] = await ctx.db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, encounterId))
    .limit(1);

  if (!encounter) throw new Error("Encounter not found");
  await requireDmAccess(ctx, encounter.campaignId);
  return encounter;
}

export const encounterResolvers = {
  Query: {
    async encounter(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAuth(ctx);
      const [encounter] = await ctx.db
        .select()
        .from(schema.encounters)
        .where(eq(schema.encounters.id, id))
        .limit(1);
      return encounter ?? null;
    },

    async encounters(_: unknown, { campaignId }: { campaignId: string }, ctx: GraphQLContext) {
      requireAuth(ctx);
      return ctx.db
        .select()
        .from(schema.encounters)
        .where(eq(schema.encounters.campaignId, campaignId));
    },
  },

  Encounter: {
    async campaign(encounter: { campaignId: string }, _: unknown, ctx: GraphQLContext) {
      const [campaign] = await ctx.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, encounter.campaignId))
        .limit(1);
      return campaign;
    },

    async participants(encounter: { id: string }, _: unknown, ctx: GraphQLContext) {
      return ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.encounterId, encounter.id))
        .orderBy(schema.encounterParticipants.sortOrder);
    },
  },

  EncounterParticipant: {
    async character(participant: { characterId: string | null }, _: unknown, ctx: GraphQLContext) {
      if (!participant.characterId) return null;
      const [character] = await ctx.db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, participant.characterId))
        .limit(1);
      return character ?? null;
    },
  },

  Mutation: {
    async createEncounter(
      _: unknown,
      { input }: { input: { campaignId: string; name: string; notes?: string } },
      ctx: GraphQLContext,
    ) {
      await requireDmAccess(ctx, input.campaignId);

      const [encounter] = await ctx.db
        .insert(schema.encounters)
        .values({
          campaignId: input.campaignId,
          name: input.name,
          notes: input.notes,
          status: "prep",
          round: 0,
        })
        .returning();

      return encounter;
    },

    async startEncounter(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const encounter = await requireEncounterDmAccess(ctx, id);
      if (encounter.status !== "prep") throw new Error("Encounter is already started");

      const [updated] = await ctx.db
        .update(schema.encounters)
        .set({ status: "active", round: 1, updatedAt: new Date() })
        .where(eq(schema.encounters.id, id))
        .returning();
      return updated;
    },

    async endEncounter(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      await requireEncounterDmAccess(ctx, id);

      const [updated] = await ctx.db
        .update(schema.encounters)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(schema.encounters.id, id))
        .returning();
      return updated;
    },

    async nextRound(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const encounter = await requireEncounterDmAccess(ctx, id);
      if (encounter.status !== "active") throw new Error("Encounter is not active");

      const [updated] = await ctx.db
        .update(schema.encounters)
        .set({ round: encounter.round + 1, updatedAt: new Date() })
        .where(eq(schema.encounters.id, id))
        .returning();
      return updated;
    },

    async deleteEncounter(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      await requireEncounterDmAccess(ctx, id);
      await ctx.db.delete(schema.encounters).where(eq(schema.encounters.id, id));
      return true;
    },

    async addParticipant(
      _: unknown,
      {
        input,
      }: {
        input: {
          encounterId: string;
          characterId?: string;
          name: string;
          hpMax: number;
          hpCurrent?: number;
          isPlayer?: boolean;
        };
      },
      ctx: GraphQLContext,
    ) {
      const encounter = await requireEncounterDmAccess(ctx, input.encounterId);

      // Count existing participants for sort order
      const existing = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.encounterId, input.encounterId));

      const [participant] = await ctx.db
        .insert(schema.encounterParticipants)
        .values({
          encounterId: input.encounterId,
          characterId: input.characterId ?? null,
          name: input.name,
          hpMax: input.hpMax,
          hpCurrent: input.hpCurrent ?? input.hpMax,
          isPlayer: input.isPlayer ?? true,
          conditions: [],
          sortOrder: existing.length,
        })
        .returning();

      return participant;
    },

    async removeParticipant(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const [participant] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, id))
        .limit(1);

      if (!participant) throw new Error("Participant not found");
      await requireEncounterDmAccess(ctx, participant.encounterId);

      await ctx.db
        .delete(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, id));
      return true;
    },

    async updateInitiative(
      _: unknown,
      { input }: { input: { participantId: string; initiative: number } },
      ctx: GraphQLContext,
    ) {
      const [participant] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .limit(1);

      if (!participant) throw new Error("Participant not found");
      await requireEncounterDmAccess(ctx, participant.encounterId);

      // Update initiative and re-sort all participants by initiative (desc)
      await ctx.db
        .update(schema.encounterParticipants)
        .set({ initiative: input.initiative })
        .where(eq(schema.encounterParticipants.id, input.participantId));

      // Re-fetch all participants, sort by initiative desc, update sortOrder
      const all = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.encounterId, participant.encounterId));

      const sorted = all
        .map((p) => ({ ...p, initiative: p.id === input.participantId ? input.initiative : p.initiative }))
        .sort((a, b) => (b.initiative ?? -999) - (a.initiative ?? -999));

      for (let i = 0; i < sorted.length; i++) {
        await ctx.db
          .update(schema.encounterParticipants)
          .set({ sortOrder: i })
          .where(eq(schema.encounterParticipants.id, sorted[i]!.id));
      }

      const [updated] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .limit(1);
      return updated;
    },

    async applyDamage(
      _: unknown,
      { input }: { input: { participantId: string; amount: number; heal?: boolean } },
      ctx: GraphQLContext,
    ) {
      const [participant] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .limit(1);

      if (!participant) throw new Error("Participant not found");
      await requireEncounterDmAccess(ctx, participant.encounterId);

      const newHp = input.heal
        ? Math.min(participant.hpMax, participant.hpCurrent + input.amount)
        : Math.max(0, participant.hpCurrent - input.amount);

      const [updated] = await ctx.db
        .update(schema.encounterParticipants)
        .set({ hpCurrent: newHp })
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .returning();
      return updated;
    },

    async updateParticipantConcentration(
      _: unknown,
      { input }: { input: { participantId: string; concentratingOn: string | null } },
      ctx: GraphQLContext,
    ) {
      const [participant] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .limit(1);
      if (!participant) throw new Error("Participant not found");
      await requireEncounterDmAccess(ctx, participant.encounterId);

      const [updated] = await ctx.db
        .update(schema.encounterParticipants)
        .set({ concentratingOn: input.concentratingOn })
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .returning();
      return updated;
    },

    async applyCondition(
      _: unknown,
      {
        input,
      }: { input: { participantId: string; condition: string; remove?: boolean } },
      ctx: GraphQLContext,
    ) {
      const [participant] = await ctx.db
        .select()
        .from(schema.encounterParticipants)
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .limit(1);

      if (!participant) throw new Error("Participant not found");
      await requireEncounterDmAccess(ctx, participant.encounterId);

      const conditions = (participant.conditions as string[]) ?? [];
      const newConditions = input.remove
        ? conditions.filter((c) => c !== input.condition)
        : [...new Set([...conditions, input.condition])];

      const [updated] = await ctx.db
        .update(schema.encounterParticipants)
        .set({ conditions: newConditions })
        .where(eq(schema.encounterParticipants.id, input.participantId))
        .returning();
      return updated;
    },
  },
};
