import type { FastifyRequest, FastifyReply } from "fastify";
import { ErrorCodes, DEFAULT_ERROR_MESSAGES, type AuthUser, type ErrorResponse } from "../schemas/index.js";

// Enforce role-based access policy for protected endpoints
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as AuthUser | undefined;

    if (!user?.role || !allowedRoles.includes(user.role)) {
      const responsePayload: ErrorResponse = {
        code: ErrorCodes.FORBIDDEN,
        error: "Forbidden",
        message: DEFAULT_ERROR_MESSAGES[403],
        statusCode: 403,
        timestamp: new Date().toISOString(),
      };

      reply.status(403).send(responsePayload);
    }
  };
}
