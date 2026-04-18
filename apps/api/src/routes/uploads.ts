import { mkdirSync, existsSync, createWriteStream, unlinkSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, schema } from "@dnd/db";
import { getDb } from "@dnd/db";
import { verifyToken } from "../auth/jwt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Uploads live outside the source tree so the built server and dev server share them.
export const UPLOADS_ROOT = join(__dirname, "../../uploads");
const PORTRAITS_DIR = join(UPLOADS_ROOT, "portraits");

export function ensureUploadDirs() {
  if (!existsSync(UPLOADS_ROOT)) mkdirSync(UPLOADS_ROOT, { recursive: true });
  if (!existsSync(PORTRAITS_DIR)) mkdirSync(PORTRAITS_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png": return ".png";
    case "image/jpeg": return ".jpg";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    default: return ".bin";
  }
}

function authUserId(req: FastifyRequest): string {
  const header = req.headers["authorization"];
  if (!header) throw new Error("Not authenticated");
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  const payload = verifyToken(token);
  return payload.userId;
}

export function registerUploadRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/upload/portrait/:characterId",
    async (req: FastifyRequest<{ Params: { characterId: string } }>, reply: FastifyReply) => {
      let userId: string;
      try {
        userId = authUserId(req);
      } catch {
        return reply.code(401).send({ error: "UNAUTHENTICATED" });
      }

      const { characterId } = req.params;
      const db = getDb();

      const [character] = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, characterId))
        .limit(1);

      if (!character) return reply.code(404).send({ error: "Character not found" });
      if (character.userId !== userId) {
        return reply.code(403).send({ error: "Not authorized" });
      }

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });

      if (!ALLOWED_MIME.has(file.mimetype)) {
        return reply.code(400).send({
          error: `Unsupported type: ${file.mimetype}. Allowed: png, jpg, webp, gif.`,
        });
      }

      const ext = extForMime(file.mimetype) || extname(file.filename) || ".bin";
      const fileName = `${characterId}-${randomBytes(6).toString("hex")}${ext}`;
      const filePath = join(PORTRAITS_DIR, fileName);

      try {
        await pipeline(file.file, createWriteStream(filePath));
      } catch (err) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
        return reply.code(500).send({
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }

      // If the write was truncated due to size limit, fastify-multipart sets .truncated.
      if (file.file.truncated) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
        return reply.code(413).send({ error: "File too large (max 5 MB)" });
      }

      const publicUrl = `/uploads/portraits/${fileName}`;

      // Remove previous portrait file if any
      if (character.portraitUrl && character.portraitUrl.startsWith("/uploads/portraits/")) {
        const old = join(UPLOADS_ROOT, character.portraitUrl.replace(/^\/uploads\//, ""));
        try { if (existsSync(old)) unlinkSync(old); } catch { /* ignore */ }
      }

      await db
        .update(schema.characters)
        .set({ portraitUrl: publicUrl, updatedAt: new Date() })
        .where(eq(schema.characters.id, characterId));

      return reply.send({ portraitUrl: publicUrl });
    },
  );

  fastify.delete(
    "/upload/portrait/:characterId",
    async (req: FastifyRequest<{ Params: { characterId: string } }>, reply: FastifyReply) => {
      let userId: string;
      try {
        userId = authUserId(req);
      } catch {
        return reply.code(401).send({ error: "UNAUTHENTICATED" });
      }
      const { characterId } = req.params;
      const db = getDb();

      const [character] = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, characterId))
        .limit(1);

      if (!character) return reply.code(404).send({ error: "Character not found" });
      if (character.userId !== userId) return reply.code(403).send({ error: "Not authorized" });

      if (character.portraitUrl && character.portraitUrl.startsWith("/uploads/portraits/")) {
        const p = join(UPLOADS_ROOT, character.portraitUrl.replace(/^\/uploads\//, ""));
        try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
      }

      await db
        .update(schema.characters)
        .set({ portraitUrl: null, updatedAt: new Date() })
        .where(eq(schema.characters.id, characterId));

      return reply.send({ portraitUrl: null });
    },
  );
}
