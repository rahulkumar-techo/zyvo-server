import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function paymentsRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.payments,
    prefix: "/api/v1/payments",
    rewritePrefix: "/payments",
  });

  await registerProxyRoute(app, {
    upstream: config.services.payments,
    prefix: "/api/payments",
    rewritePrefix: "/payments",
  });
}
