import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { createLogger } from "@zyvo/logger";

const logger = createLogger("auth-service");

async function start() {
  const app = await buildApp({ customLogger: logger });

  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`Auth service listening on http://${config.host}:${config.port}`);
  } catch (error) {
    logger.error({ error }, "Failed to start auth service");
    process.exit(1);
  }

  // Graceful shutdown
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down auth service`);
      await app.close();
      process.exit(0);
    });
  }
}

start();
