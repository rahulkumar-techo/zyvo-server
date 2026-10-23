import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.notifications,
    prefix: "/api/v1/notifications",
    rewritePrefix: "/notifications",
  });

  await registerProxyRoute(app, {
    upstream: config.services.notifications,
    prefix: "/api/notifications",
    rewritePrefix: "/notifications",
  });
}
