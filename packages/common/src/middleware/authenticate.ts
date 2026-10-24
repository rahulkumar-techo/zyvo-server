import type { FastifyRequest, FastifyReply } from "fastify";
import "@fastify/jwt";
import { AuthenticationError, ErrorCodes, DEFAULT_ERROR_MESSAGES } from "../errors/index.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      userId: string;
      role: string;
      sessionId?: string;
    };
  }
}

export type SessionValidator = (sessionId: string) => Promise<boolean> | boolean;

export interface AuthenticateOptions {
  // Optional validator to check session revocation/logout in DB or cache
  isSessionActive?: SessionValidator;
}

// Factory function allowing services to inject their own session validator
export function createAuthenticate(options: AuthenticateOptions = {}) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    let payload: { userId: string; role: string; sessionId?: string } | undefined;

    try {
      // 1. If Bearer token not in header, check accessToken cookie
      if (!request.headers.authorization && (request as any).cookies?.accessToken) {
        payload = request.server.jwt.verify<{ userId: string; role: string; sessionId?: string }>(
          (request as any).cookies.accessToken,
        );
      } else {
        // 2. Default: verify from Authorization: Bearer <token> header
        if (!request.headers.authorization) {
          throw new AuthenticationError(DEFAULT_ERROR_MESSAGES[401], ErrorCodes.UNAUTHENTICATED);
        }
        payload = await request.jwtVerify<{ userId: string; role: string; sessionId?: string }>();
      }
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        throw err;
      }
      if (err.code === "FASTIFY_JWT_EXPIRED" || err.message?.toLowerCase().includes("expired")) {
        throw new AuthenticationError("Authentication token has expired", ErrorCodes.TOKEN_EXPIRED);
      }
      if (
        err.code === "FASTIFY_JWT_NO_ARMOR" ||
        err.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
        !request.headers.authorization
      ) {
        throw new AuthenticationError(DEFAULT_ERROR_MESSAGES[401], ErrorCodes.UNAUTHENTICATED);
      }
      throw new AuthenticationError("Invalid authentication token", ErrorCodes.INVALID_TOKEN);
    }

    if (!payload) {
      throw new AuthenticationError(DEFAULT_ERROR_MESSAGES[401], ErrorCodes.UNAUTHENTICATED);
    }

    // 3. Check session revocation if validator is provided
    const validator = options.isSessionActive || (request.server as any).isSessionActive;
    if (typeof validator === "function") {
      if (!payload.sessionId) {
        throw new AuthenticationError("Session has expired or was revoked", ErrorCodes.SESSION_EXPIRED);
      }
      const active = await validator(payload.sessionId);
      if (!active) {
        throw new AuthenticationError("Session has expired or was revoked", ErrorCodes.SESSION_EXPIRED);
      }
    }

    request.authUser = payload;
  };
}

// Default authenticate middleware (verifies JWT; checks server.isSessionActive if decorated)
export const authenticate = createAuthenticate();
