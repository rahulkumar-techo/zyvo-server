import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config/index.js";

export async function registerRateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });
}
