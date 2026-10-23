import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health check endpoint
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "auth-service",
      timestamp: new Date().toISOString(),
    };
  });

  // Auth endpoints
  await authRoutes(app);
}

export * from "./auth.routes.js";
