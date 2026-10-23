import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config/index.js";

export async function registerJwtPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
  });
}
