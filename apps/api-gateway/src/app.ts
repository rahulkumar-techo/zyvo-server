import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { createLogger } from "@zyvo/logger";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./routes/index.js";

export interface BuildAppOptions extends FastifyServerOptions {
  customLogger?: ReturnType<typeof createLogger>;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const logger = options.customLogger ?? createLogger("api-gateway");

  const app = Fastify({
    loggerInstance: logger,
    ...options,
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
