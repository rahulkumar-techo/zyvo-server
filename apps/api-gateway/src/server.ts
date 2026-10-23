import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { createLogger } from "@zyvo/logger";

const logger = createLogger("api-gateway");

async function start() {
  const app = await buildApp({ customLogger: logger });

  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`API Gateway listening on http://${config.host}:${config.port}`);
    logger.info(`Routing /api/auth -> ${config.services.auth}/auth`);
  } catch (error) {
    logger.error({ error }, "Failed to start API Gateway");
    process.exit(1);
  }

  // Graceful shutdown
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down API Gateway`);
      await app.close();
      process.exit(0);
    });
  }
}

start();
