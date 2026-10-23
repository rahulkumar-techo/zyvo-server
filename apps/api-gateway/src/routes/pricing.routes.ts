import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.pricing,
    prefix: "/api/v1/pricing",
    rewritePrefix: "/pricing",
  });

  await registerProxyRoute(app, {
    upstream: config.services.pricing,
    prefix: "/api/pricing",
    rewritePrefix: "/pricing",
  });
}
