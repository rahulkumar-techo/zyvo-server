import type { FastifyInstance } from "fastify";
import { registerProxyRoute } from "../clients/proxy-client.js";
import { config } from "../config/index.js";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  await registerProxyRoute(app, {
    upstream: config.services.users,
    prefix: "/api/v1/users",
    rewritePrefix: "/users",
  });

  await registerProxyRoute(app, {
    upstream: config.services.users,
    prefix: "/api/users",
    rewritePrefix: "/users",
  });
}
