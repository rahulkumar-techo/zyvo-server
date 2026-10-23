import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { config } from "../config/index.js";

export async function registerCorsPlugin(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });
}
