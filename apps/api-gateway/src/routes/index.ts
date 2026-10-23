import type { FastifyInstance } from "fastify";
import { config } from "../config/index.js";
import { authRoutes } from "./auth.routes.js";
import { usersRoutes } from "./users.routes.js";
import { driversRoutes } from "./drivers.routes.js";
import { pricingRoutes } from "./pricing.routes.js";
import { ridesRoutes } from "./rides.routes.js";
import { paymentsRoutes } from "./payments.routes.js";
import { notificationsRoutes } from "./notifications.routes.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Gateway health check
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "api-gateway",
      upstreams: config.services,
      timestamp: new Date().toISOString(),
    };
  });

  // Microservice routes
  await authRoutes(app);
  await usersRoutes(app);
  await driversRoutes(app);
  await pricingRoutes(app);
  await ridesRoutes(app);
  await paymentsRoutes(app);
  await notificationsRoutes(app);
}

export * from "./auth.routes.js";
export * from "./users.routes.js";
export * from "./drivers.routes.js";
export * from "./pricing.routes.js";
export * from "./rides.routes.js";
export * from "./payments.routes.js";
export * from "./notifications.routes.js";
