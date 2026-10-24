import type { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";

export async function registerCorsPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });
}
