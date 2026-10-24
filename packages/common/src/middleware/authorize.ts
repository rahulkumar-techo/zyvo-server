import type { FastifyRequest, FastifyReply } from "fastify";
import {
  AuthenticationError,
  AuthorizationError,
  ErrorCodes,
  DEFAULT_ERROR_MESSAGES,
} from "../errors/index.js";

// Role-based access control middleware generator
export function authorize(allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.authUser) {
      throw new AuthenticationError(DEFAULT_ERROR_MESSAGES[401], ErrorCodes.UNAUTHENTICATED);
    }

    if (!allowedRoles.includes(request.authUser.role)) {
      throw new AuthorizationError(
        DEFAULT_ERROR_MESSAGES[403],
        ErrorCodes.INSUFFICIENT_PERMISSIONS,
      );
    }
  };
}

export const authorizeRoles = authorize;

