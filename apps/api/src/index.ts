import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../../.env") });
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { ApolloServer } from "@apollo/server";
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from "@as-integrations/fastify";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./resolvers/index.js";
import { createContext } from "./graphql/context.js";
import { registerUploadRoutes, ensureUploadDirs, UPLOADS_ROOT } from "./routes/uploads.js";

const PORT = parseInt(process.env["PORT"] ?? "4000", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

async function bootstrap() {
  const logger =
    process.env["NODE_ENV"] === "production"
      ? { level: "info" as const }
      : {
          level: "debug" as const,
          transport: { target: "pino-pretty", options: { colorize: true } },
        };

  const fastify = Fastify({
    logger,
  });

  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [fastifyApolloDrainPlugin(fastify)],
    formatError: (formattedError) => {
      // Don't leak internal errors in production
      if (process.env["NODE_ENV"] === "production") {
        if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
          return { message: "Internal server error", extensions: { code: "INTERNAL_SERVER_ERROR" } };
        }
      }
      return formattedError;
    },
  });

  await fastify.register(cors, {
    origin: process.env["NODE_ENV"] === "production"
      ? process.env["NEXTAUTH_URL"] ?? false
      : /^http:\/\/localhost(:\d+)?$/,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  });

  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  ensureUploadDirs();
  await fastify.register(fastifyStatic, {
    root: UPLOADS_ROOT,
    prefix: "/uploads/",
    decorateReply: false,
  });

  registerUploadRoutes(fastify);

  await apollo.start();

  // Health check
  fastify.get("/health", async () => ({ status: "ok" }));

  // GraphQL endpoint
  fastify.post(
    "/graphql",
    fastifyApolloHandler(apollo, {
      context: async (req) => createContext(req),
    }),
  );

  fastify.get(
    "/graphql",
    fastifyApolloHandler(apollo, {
      context: async (req) => createContext(req),
    }),
  );

  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`🚀 API ready at http://localhost:${PORT}/graphql`);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
