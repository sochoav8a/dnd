import type { GraphQLContext } from "../graphql/context.js";
import { requireAuth } from "../graphql/context.js";
import { eq, schema } from "@dnd/db";

export const userResolvers = {
  Query: {
    async me(_: unknown, __: unknown, ctx: GraphQLContext) {
      const authUser = requireAuth(ctx);
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, authUser.userId))
        .limit(1);
      return user ?? null;
    },

    async user(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAuth(ctx);
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return user ?? null;
    },
  },
};
