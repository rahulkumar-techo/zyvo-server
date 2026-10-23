import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export async function registerRequestContextPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request, reply) => {
    const incomingId = request.headers["x-request-id"];
    const requestId = typeof incomingId === "string" ? incomingId : randomUUID();

    request.requestId = requestId;
    reply.header("x-request-id", requestId);
  });
}
