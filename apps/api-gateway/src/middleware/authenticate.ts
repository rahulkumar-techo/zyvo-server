import type { FastifyRequest, FastifyReply } from "fastify";
import { ErrorCodes, DEFAULT_ERROR_MESSAGES, type ErrorResponse } from "../schemas/index.js";

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    const responsePayload: ErrorResponse = {
      code: ErrorCodes.UNAUTHENTICATED,
      error: "Unauthorized",
      message: DEFAULT_ERROR_MESSAGES[401],
      statusCode: 401,
      timestamp: new Date().toISOString(),
    };

    reply.status(401).send(responsePayload);
  }
}
