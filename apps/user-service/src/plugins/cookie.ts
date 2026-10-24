import type { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { config } from "../config/index.js";

export async function registerCookiePlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie, {
    secret: config.jwtSecret,
  });
}
