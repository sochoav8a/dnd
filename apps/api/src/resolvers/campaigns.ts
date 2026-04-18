import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { GraphQLContext } from "../graphql/context.js";
import { requireAuth } from "../graphql/context.js";
import { and, eq, schema } from "@dnd/db";
import { computeCharacter } from "@dnd/rules-engine";
import type {
  RaceData,
  ClassData,
  BackgroundData,
  CharacterState,
  AbilityScores,
} from "@dnd/shared";

async function requireDm(ctx: GraphQLContext, campaignId: string) {
  const user = requireAuth(ctx);
  const [campaign] = await ctx.db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.id, campaignId))
    .limit(1);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.dmId !== user.userId) {
    throw new Error("Only the DM can manage this campaign");
  }
  return { user, campaign };
}

export const campaignResolvers = {
  Query: {
    async campaign(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);

      // User must be a member of the campaign
      const [membership] = await ctx.db
        .select()
        .from(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, id),
            eq(schema.campaignMembers.userId, user.userId),
          ),
        )
        .limit(1);

      if (!membership) throw new Error("Campaign not found");

      const [campaign] = await ctx.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, id))
        .limit(1);

      return campaign ?? null;
    },

    async campaigns(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);

      const memberships = await ctx.db
        .select({ campaignId: schema.campaignMembers.campaignId })
        .from(schema.campaignMembers)
        .where(eq(schema.campaignMembers.userId, user.userId));

      if (memberships.length === 0) return [];

      const campaignIds = memberships.map((m) => m.campaignId);
      const campaigns = await ctx.db.select().from(schema.campaigns);
      return campaigns.filter((c) => campaignIds.includes(c.id));
    },
  },

  Mutation: {
    async createCampaign(
      _: unknown,
      { input }: { input: { name: string; settings?: Record<string, unknown> } },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const inviteCode = randomBytes(4).toString("hex").toUpperCase();

      const [campaign] = await ctx.db
        .insert(schema.campaigns)
        .values({
          name: input.name,
          dmId: user.userId,
          inviteCode,
          settings: input.settings ?? {},
        })
        .returning();

      if (!campaign) throw new Error("Failed to create campaign");

      // Add creator as DM member
      await ctx.db.insert(schema.campaignMembers).values({
        campaignId: campaign.id,
        userId: user.userId,
        role: "dm",
      });

      return campaign;
    },

    async joinCampaign(
      _: unknown,
      { inviteCode }: { inviteCode: string },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      const [campaign] = await ctx.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.inviteCode, inviteCode.toUpperCase()))
        .limit(1);

      if (!campaign) throw new Error("Invalid invite code");

      // Check if already a member
      const [existing] = await ctx.db
        .select()
        .from(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, campaign.id),
            eq(schema.campaignMembers.userId, user.userId),
          ),
        )
        .limit(1);

      if (existing) return campaign;

      await ctx.db.insert(schema.campaignMembers).values({
        campaignId: campaign.id,
        userId: user.userId,
        role: "player",
      });

      return campaign;
    },

    async addPlayerByEmail(
      _: unknown,
      { input }: { input: { campaignId: string; email: string } },
      ctx: GraphQLContext,
    ) {
      const { campaign } = await requireDm(ctx, input.campaignId);

      const [target] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.email.trim().toLowerCase()))
        .limit(1);

      if (!target) {
        throw new Error("No existe usuario con ese email");
      }

      const [existing] = await ctx.db
        .select()
        .from(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, campaign.id),
            eq(schema.campaignMembers.userId, target.id),
          ),
        )
        .limit(1);
      if (existing) throw new Error("El usuario ya es miembro de la campaña");

      await ctx.db.insert(schema.campaignMembers).values({
        campaignId: campaign.id,
        userId: target.id,
        role: "player",
      });

      return campaign;
    },

    async createPlayerAndAddToCampaign(
      _: unknown,
      {
        input,
      }: {
        input: {
          campaignId: string;
          email: string;
          username: string;
          password: string;
        };
      },
      ctx: GraphQLContext,
    ) {
      const { campaign } = await requireDm(ctx, input.campaignId);

      const email = input.email.trim().toLowerCase();
      const username = input.username.trim();
      if (!email || !username || input.password.length < 6) {
        throw new Error("Email, usuario y contraseña (≥6) son obligatorios");
      }

      const [existingEmail] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (existingEmail) throw new Error("Ya existe un usuario con ese email");

      const [existingUsername] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);
      if (existingUsername) throw new Error("Ya existe un usuario con ese username");

      const passwordHash = await bcrypt.hash(input.password, 12);

      const [newUser] = await ctx.db
        .insert(schema.users)
        .values({
          email,
          username,
          passwordHash,
          role: "player",
        })
        .returning();
      if (!newUser) throw new Error("No se pudo crear el usuario");

      await ctx.db.insert(schema.campaignMembers).values({
        campaignId: campaign.id,
        userId: newUser.id,
        role: "player",
      });

      return campaign;
    },

    async quickCreateCampaignCharacter(
      _: unknown,
      {
        input,
      }: {
        input: {
          campaignId: string;
          ownerId: string;
          name: string;
          raceId: string;
          classId: string;
          backgroundId: string;
          subraceId?: string | null;
        };
      },
      ctx: GraphQLContext,
    ) {
      const { campaign } = await requireDm(ctx, input.campaignId);

      // Verify owner is a member of this campaign
      const [membership] = await ctx.db
        .select()
        .from(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, campaign.id),
            eq(schema.campaignMembers.userId, input.ownerId),
          ),
        )
        .limit(1);
      if (!membership) throw new Error("El propietario no es miembro de la campaña");

      // Load content
      const [raceItem, classItem, backgroundItem, subraceItem] = await Promise.all([
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.raceId),
        }),
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.classId),
        }),
        ctx.db.query.contentItems.findFirst({
          where: eq(schema.contentItems.id, input.backgroundId),
        }),
        input.subraceId
          ? ctx.db.query.contentItems.findFirst({
              where: eq(schema.contentItems.id, input.subraceId),
            })
          : Promise.resolve(null),
      ]);
      if (!raceItem || !classItem || !backgroundItem) {
        throw new Error("Referencias de contenido inválidas");
      }
      const raceData = raceItem.data as RaceData;
      const classData = classItem.data as ClassData;
      const backgroundData = backgroundItem.data as BackgroundData;

      // Assign standard array to abilities: 15 to first primary, 14 to second primary
      // (or CON if no second primary), 13/12/10/8 to the rest in default order.
      const standard = [15, 14, 13, 12, 10, 8];
      const abilityOrder: Array<keyof AbilityScores> = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
      const primaries = (classData.primary_ability as Array<keyof AbilityScores>) ?? [];
      const assignment: AbilityScores = { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
      const remaining = [...standard];
      const used = new Set<keyof AbilityScores>();

      if (primaries[0] && remaining[0] !== undefined) {
        assignment[primaries[0]] = remaining.shift()!;
        used.add(primaries[0]);
      }
      const second = primaries[1] ?? ("CON" as keyof AbilityScores);
      if (!used.has(second) && remaining[0] !== undefined) {
        assignment[second] = remaining.shift()!;
        used.add(second);
      }
      // Ensure CON gets a solid score if not already
      if (!used.has("CON") && remaining[0] !== undefined) {
        assignment.CON = remaining.shift()!;
        used.add("CON");
      }
      for (const ab of abilityOrder) {
        if (used.has(ab)) continue;
        const next = remaining.shift();
        if (next !== undefined) assignment[ab] = next;
      }

      // Build state
      const state: CharacterState = {
        ability_scores: assignment,
        hp: { current: 0, max: 0, temp: 0 },
        hit_dice: [],
        spell_slots: {},
        prepared_spells: [],
        known_spells: [],
        conditions: [],
        death_saves: { successes: 0, failures: 0 },
        inspiration: false,
        exhaustion_level: 0,
        notes: "",
        custom_modifiers: [],
      };

      const computed = computeCharacter({
        level: 1,
        abilityScores: assignment,
        race: raceData,
        classData,
        background: backgroundData,
        equipment: [],
        ...(subraceItem ? { subrace: subraceItem.data as import("@dnd/shared").SubraceData } : {}),
      });

      state.hp.max = computed.maxHp;
      state.hp.current = computed.maxHp;
      state.hit_dice = [{ die: classData.hit_die, total: 1, remaining: 1 }];

      for (const [lvl, total] of Object.entries(computed.spellSlotsByLevel)) {
        state.spell_slots[parseInt(lvl)] = { total, remaining: total };
      }

      const [character] = await ctx.db
        .insert(schema.characters)
        .values({
          userId: input.ownerId,
          campaignId: campaign.id,
          name: input.name,
          level: 1,
          raceId: input.raceId,
          subraceId: input.subraceId ?? null,
          classId: input.classId,
          backgroundId: input.backgroundId,
          state: state as unknown as Record<string, unknown>,
          computed: computed as unknown as Record<string, unknown>,
        })
        .returning();

      return character;
    },

    async removePlayerFromCampaign(
      _: unknown,
      { input }: { input: { campaignId: string; userId: string } },
      ctx: GraphQLContext,
    ) {
      const { campaign } = await requireDm(ctx, input.campaignId);
      if (campaign.dmId === input.userId) {
        throw new Error("No puedes remover al DM");
      }

      await ctx.db
        .delete(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, input.campaignId),
            eq(schema.campaignMembers.userId, input.userId),
          ),
        );

      // Also un-assign any characters tied to this campaign for that user
      await ctx.db
        .update(schema.characters)
        .set({ campaignId: null })
        .where(
          and(
            eq(schema.characters.campaignId, input.campaignId),
            eq(schema.characters.userId, input.userId),
          ),
        );

      return true;
    },

    async deleteCampaign(
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) {
      await requireDm(ctx, id);
      // Un-assign characters (don't delete the PCs)
      await ctx.db
        .update(schema.characters)
        .set({ campaignId: null })
        .where(eq(schema.characters.campaignId, id));
      // Cascades: members + encounters (via FK onDelete: cascade)
      await ctx.db.delete(schema.campaigns).where(eq(schema.campaigns.id, id));
      return true;
    },

    async leaveCampaign(
      _: unknown,
      { campaignId }: { campaignId: string },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      const [campaign] = await ctx.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, campaignId))
        .limit(1);

      if (!campaign) throw new Error("Campaign not found");
      if (campaign.dmId === user.userId) throw new Error("DM cannot leave their own campaign");

      await ctx.db
        .delete(schema.campaignMembers)
        .where(
          and(
            eq(schema.campaignMembers.campaignId, campaignId),
            eq(schema.campaignMembers.userId, user.userId),
          ),
        );

      return true;
    },
  },

  Campaign: {
    async dm(parent: { dmId: string }, _: unknown, ctx: GraphQLContext) {
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, parent.dmId))
        .limit(1);
      return user;
    },

    async members(parent: { id: string }, _: unknown, ctx: GraphQLContext) {
      const memberships = await ctx.db
        .select()
        .from(schema.campaignMembers)
        .where(eq(schema.campaignMembers.campaignId, parent.id));

      return Promise.all(
        memberships.map(async (m) => {
          const [user] = await ctx.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, m.userId))
            .limit(1);
          return { user, role: m.role, joinedAt: m.joinedAt };
        }),
      );
    },

    async characters(parent: { id: string }, _: unknown, ctx: GraphQLContext) {
      return ctx.db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.campaignId, parent.id));
    },
  },
};
