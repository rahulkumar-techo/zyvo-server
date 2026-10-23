import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function ridesRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.rides,
    prefix: "/api/v1/rides",
    rewritePrefix: "/rides",
  });

  await registerProxyRoute(app, {
    upstream: config.services.rides,
    prefix: "/api/rides",
    rewritePrefix: "/rides",
  });
}
