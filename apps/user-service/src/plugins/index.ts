import type { FastifyInstance } from "fastify";
import { registerCorsPlugin } from "./cors.js";
import { registerJwtPlugin } from "./jwt.js";
import { registerCookiePlugin } from "./cookie.js";
import { registerRateLimitPlugin } from "./rate-limit.js";
import { registerRequestContextPlugin } from "./request-context.js";
import { registerErrorHandlerPlugin } from "./error-handler.js";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await registerRequestContextPlugin(app);
  await registerErrorHandlerPlugin(app);
  await registerCorsPlugin(app);
  await registerJwtPlugin(app);
  await registerCookiePlugin(app);
  await registerRateLimitPlugin(app);
}

export * from "./cors.js";
export * from "./jwt.js";
export * from "./cookie.js";
export * from "./rate-limit.js";
export * from "./request-context.js";
export * from "./error-handler.js";
