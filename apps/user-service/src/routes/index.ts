import type { FastifyInstance } from "fastify";
import { userRoutes } from "./user.routes.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Service health check
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "user-service",
      timestamp: new Date().toISOString(),
    };
  });

  // Microservice user routes
  await userRoutes(app);
}

export * from "./user.routes.js";
