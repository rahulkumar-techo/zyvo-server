import type { FastifyRequest, FastifyReply } from "fastify";
import { ErrorCodes, DEFAULT_ERROR_MESSAGES } from "../schemas/index.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      userId: string;
      role: string;
      sessionId: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // 1. If Bearer token not in header, check accessToken cookie
    if (!request.headers.authorization && request.cookies?.accessToken) {
      const payload = request.server.jwt.verify<{ userId: string; role: string; sessionId: string }>(
        request.cookies.accessToken,
      );
      request.authUser = payload;
      return;
    }

    // 2. Default: verify from Authorization: Bearer <token> header
    const payload = await request.jwtVerify<{ userId: string; role: string; sessionId: string }>();
    request.authUser = payload;
  } catch {
    reply.status(401).send({
      code: ErrorCodes.UNAUTHENTICATED,
      error: "Unauthorized",
      message: DEFAULT_ERROR_MESSAGES[401],
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }
}
