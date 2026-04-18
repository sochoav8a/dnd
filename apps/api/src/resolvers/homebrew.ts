import type { GraphQLContext } from "../graphql/context.js";
import { requireAuth } from "../graphql/context.js";
import { and, eq, schema } from "@dnd/db";
import { validateContentData } from "@dnd/content";
import type { ContentType, ContentSourceType } from "@dnd/shared";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function userCanEditSource(
  ctx: GraphQLContext,
  sourceId: string,
): Promise<{ userId: string; isAdmin: boolean; source: typeof schema.contentSources.$inferSelect }> {
  const user = requireAuth(ctx);
  const [dbUser] = await ctx.db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.userId))
    .limit(1);
  const isAdmin = dbUser?.role === "admin";

  const [source] = await ctx.db
    .select()
    .from(schema.contentSources)
    .where(eq(schema.contentSources.id, sourceId))
    .limit(1);

  if (!source) throw new Error("Content source not found");

  // Only admin or the creator may mutate
  if (!isAdmin && source.createdBy !== user.userId) {
    throw new Error("No autorizado para modificar esta fuente");
  }
  return { userId: user.userId, isAdmin, source };
}

export const homebrewResolvers = {
  Mutation: {
    async createContentSource(
      _: unknown,
      { input }: { input: { name: string; type?: ContentSourceType } },
      ctx: GraphQLContext,
    ) {
      const user = requireAuth(ctx);
      const [dbUser] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.userId))
        .limit(1);
      const isAdmin = dbUser?.role === "admin";

      // Non-admins can only create homebrew
      const type: ContentSourceType =
        input.type && isAdmin ? input.type : "homebrew";

      const trimmed = input.name.trim();
      if (!trimmed) throw new Error("El nombre es obligatorio");

      const [existing] = await ctx.db
        .select()
        .from(schema.contentSources)
        .where(eq(schema.contentSources.name, trimmed))
        .limit(1);
      if (existing) throw new Error("Ya existe una fuente con ese nombre");

      const [source] = await ctx.db
        .insert(schema.contentSources)
        .values({
          name: trimmed,
          type,
          createdBy: user.userId,
        })
        .returning();
      if (!source) throw new Error("No se pudo crear la fuente");

      // Auto-grant entitlement to creator so they see their homebrew content
      if (type === "homebrew") {
        await ctx.db.insert(schema.entitlements).values({
          userId: user.userId,
          sourceId: source.id,
          grantedBy: user.userId,
        });
      }

      return source;
    },

    async deleteContentSource(
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) {
      await userCanEditSource(ctx, id);
      // FK cascades: content_items.sourceId cascades; entitlements cascades.
      await ctx.db.delete(schema.contentSources).where(eq(schema.contentSources.id, id));
      return true;
    },

    async grantEntitlement(
      _: unknown,
      { input }: { input: { sourceId: string; userId: string } },
      ctx: GraphQLContext,
    ) {
      const { userId: granterId } = await userCanEditSource(ctx, input.sourceId);

      const [existing] = await ctx.db
        .select()
        .from(schema.entitlements)
        .where(
          and(
            eq(schema.entitlements.sourceId, input.sourceId),
            eq(schema.entitlements.userId, input.userId),
          ),
        )
        .limit(1);
      if (existing) return true;

      await ctx.db.insert(schema.entitlements).values({
        sourceId: input.sourceId,
        userId: input.userId,
        grantedBy: granterId,
      });
      return true;
    },

    async createContentItem(
      _: unknown,
      {
        input,
      }: {
        input: {
          sourceId: string;
          contentType: ContentType;
          slug?: string;
          name: string;
          description?: string;
          data: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
      },
      ctx: GraphQLContext,
    ) {
      await userCanEditSource(ctx, input.sourceId);

      const trimmedName = input.name.trim();
      if (!trimmedName) throw new Error("El nombre es obligatorio");

      const slug = (input.slug?.trim() || slugify(trimmedName));
      if (!slug) throw new Error("No se pudo derivar un slug válido");

      // Validate data against Zod schema
      const validation = validateContentData(input.contentType, input.data);
      if (!validation.success) {
        throw new Error(`Datos inválidos: ${validation.errors.join("; ")}`);
      }

      // Reject duplicate (slug, sourceId, contentType)
      const [dup] = await ctx.db
        .select({ id: schema.contentItems.id })
        .from(schema.contentItems)
        .where(
          and(
            eq(schema.contentItems.sourceId, input.sourceId),
            eq(schema.contentItems.slug, slug),
            eq(schema.contentItems.contentType, input.contentType),
          ),
        )
        .limit(1);
      if (dup) {
        throw new Error(
          `Ya existe un "${input.contentType}" con slug "${slug}" en esta fuente`,
        );
      }

      const [item] = await ctx.db
        .insert(schema.contentItems)
        .values({
          sourceId: input.sourceId,
          contentType: input.contentType,
          slug,
          name: trimmedName,
          description: input.description?.trim() || null,
          data: validation.data as Record<string, unknown>,
          metadata: input.metadata ?? null,
        })
        .returning();
      if (!item) throw new Error("No se pudo crear el contenido");
      return item;
    },

    async updateContentItem(
      _: unknown,
      {
        input,
      }: {
        input: {
          id: string;
          name?: string;
          description?: string | null;
          data?: Record<string, unknown>;
          metadata?: Record<string, unknown> | null;
          isActive?: boolean;
        };
      },
      ctx: GraphQLContext,
    ) {
      const [existing] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, input.id))
        .limit(1);
      if (!existing) throw new Error("Contenido no encontrado");

      await userCanEditSource(ctx, existing.sourceId);

      const patch: Record<string, unknown> = { updatedAt: new Date() };

      if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) throw new Error("El nombre no puede estar vacío");
        patch["name"] = trimmed;
      }
      if (input.description !== undefined) {
        patch["description"] = input.description?.trim() || null;
      }
      if (input.data !== undefined) {
        const validation = validateContentData(existing.contentType as ContentType, input.data);
        if (!validation.success) {
          throw new Error(`Datos inválidos: ${validation.errors.join("; ")}`);
        }
        patch["data"] = validation.data;
      }
      if (input.metadata !== undefined) {
        patch["metadata"] = input.metadata;
      }
      if (input.isActive !== undefined) {
        patch["isActive"] = input.isActive;
      }

      const [updated] = await ctx.db
        .update(schema.contentItems)
        .set(patch)
        .where(eq(schema.contentItems.id, input.id))
        .returning();
      return updated;
    },

    async deleteContentItem(
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) {
      const [existing] = await ctx.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, id))
        .limit(1);
      if (!existing) return false;
      await userCanEditSource(ctx, existing.sourceId);
      await ctx.db
        .delete(schema.contentItems)
        .where(eq(schema.contentItems.id, id));
      return true;
    },
  },
};
