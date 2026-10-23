import { randomBytes, createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../config/index.js";

// Generate cryptographically random refresh token
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

// Store hash of the refresh token in the session database rather than plaintext
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Sign JWT access token with user claims and short expiry
export function signAccessToken(
  app: FastifyInstance,
  payload: { userId: string; role: string; sessionId: string },
): string {
  return app.jwt.sign(payload, { expiresIn: config.accessTokenExpiry });
}
