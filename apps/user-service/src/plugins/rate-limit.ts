import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import { config } from "../config/index.js";

export async function registerRateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    allowList: ["127.0.0.1", "localhost"],
  });
}
