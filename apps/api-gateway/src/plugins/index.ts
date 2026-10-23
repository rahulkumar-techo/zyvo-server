import type { FastifyInstance } from "fastify";
import { registerCorsPlugin } from "./cors.js";
import { registerJwtPlugin } from "./jwt.js";
import { registerRateLimitPlugin } from "./rate-limit.js";
import { registerRequestContextPlugin } from "./request-context.js";
import { registerErrorHandlerPlugin } from "./error-handler.js";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await registerRequestContextPlugin(app);
  await registerCorsPlugin(app);
  await registerRateLimitPlugin(app);
  await registerJwtPlugin(app);
  await registerErrorHandlerPlugin(app);
}

export * from "./cors.js";
export * from "./jwt.js";
export * from "./rate-limit.js";
export * from "./request-context.js";
export * from "./error-handler.js";
