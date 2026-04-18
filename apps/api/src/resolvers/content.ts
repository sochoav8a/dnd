import type { GraphQLContext } from "../graphql/context.js";
import { requireAuth } from "../graphql/context.js";
import { and, eq, schema } from "@dnd/db";
import type { ContentType } from "@dnd/shared";

export const contentResolvers = {
  Query: {
    async contentSources(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);

      // User can see official sources + sources they have entitlements for
      const entitlements = await ctx.db
        .select({ sourceId: schema.entitlements.sourceId })
        .from(schema.entitlements)
        .where(eq(schema.entitlements.userId, user.userId));

      const entitledSourceIds = entitlements.map((e) => e.sourceId);

      const sources = await ctx.db
        .select()
        .from(schema.contentSources);

      return sources.filter(
        (s) => s.type === "official" || entitledSourceIds.includes(s.id),
      );
    },

    async contentItems(
      _: unknown,
      { type, sourceId }: { type?: ContentType; sourceId?: string },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);

      // Resolve accessible source IDs
      const sources = await ctx.db.select().from(schema.contentSources);
      const entitlements = await ctx.db
        .select({ sourceId: schema.entitlements.sourceId })
        .from(schema.entitlements)
        .where(eq(schema.entitlements.userId, user.userId));

      const entitledSourceIds = new Set([
        ...sources.filter((s) => s.type === "official").map((s) => s.id),
        ...entitlements.map((e) => e.sourceId),
      ]);

      const filters = [eq(schema.contentItems.isActive, true)];
      if (type) {
        filters.push(eq(schema.contentItems.contentType, type));
      }

      const items = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(filters.length === 1 ? filters[0]! : and(...filters));

      return items.filter(
        (item) =>
          entitledSourceIds.has(item.sourceId) &&
          (!sourceId || item.sourceId === sourceId),
      );
    },

    async contentItem(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAuth(ctx);
      const [item] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, id))
        .limit(1);
      return item ?? null;
    },
  },

  ContentItem: {
    async source(parent: { sourceId: string }, _: unknown, ctx: GraphQLContext) {
      const [source] = await ctx.db
        .select()
        .from(schema.contentSources)
        .where(eq(schema.contentSources.id, parent.sourceId))
        .limit(1);
      return source;
    },
  },
};
