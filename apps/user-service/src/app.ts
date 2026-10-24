import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { createLogger } from "@zyvo/logger";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./routes/index.js";

export interface BuildAppOptions extends FastifyServerOptions {
  customLogger?: ReturnType<typeof createLogger>;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const logger = options.customLogger ?? createLogger("user-service");

  const app = Fastify({
    loggerInstance: logger,
    ...options,
  });

  // Support empty JSON body (e.g. cookie-based auth requests with no body)
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body: string, done) => {
      if (!body || body.trim() === "") {
        done(null, {});
        return;
      }
      try {
        const json = JSON.parse(body);
        done(null, json);
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    },
  );

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
