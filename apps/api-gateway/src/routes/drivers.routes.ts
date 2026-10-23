import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function driversRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.drivers,
    prefix: "/api/v1/drivers",
    rewritePrefix: "/drivers",
  });

  await registerProxyRoute(app, {
    upstream: config.services.drivers,
    prefix: "/api/drivers",
    rewritePrefix: "/drivers",
  });
}
