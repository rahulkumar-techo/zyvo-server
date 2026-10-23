import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Expose /api/v1/auth and backwards-compatible /api/auth
  await registerProxyRoute(app, {
    upstream: config.services.auth,
    prefix: "/api/v1/auth",
    rewritePrefix: "/auth",
  });

  await registerProxyRoute(app, {
    upstream: config.services.auth,
    prefix: "/api/auth",
    rewritePrefix: "/auth",
  });
}
