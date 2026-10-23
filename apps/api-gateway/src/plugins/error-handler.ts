import type { FastifyInstance, FastifyError } from "fastify";
import {
  ErrorCodes,
  STATUS_CODE_TO_ERROR_CODE,
  DEFAULT_ERROR_MESSAGES,
  type ErrorResponse,
} from "../schemas/index.js";

// Sensitive pattern detectors for security sanitization
const SQL_ERROR_PATTERN = /(?:syntax error at|select\s|insert\s|update\s|delete\s|from\s|where\s|sqlstate|relation\s|table\s|prisma|sqlite|postgres|mysql)/i;
const TOKEN_PATTERN = /(?:Bearer\s+)?[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
const SECRET_PATTERN = /(?:password|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/gi;
const INTERNAL_HOST_PATTERN = /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[a-z0-9-]+-(?:service|db))(?::\d+)?(?:\/[^\s]*)?/gi;

// Sanitize client-facing error message to prevent leaking internal details
function sanitizeMessage(rawMessage: string, statusCode: number): string {
  // Never expose raw internal server error details to clients
  if (statusCode >= 500) {
    return DEFAULT_ERROR_MESSAGES[statusCode] || DEFAULT_ERROR_MESSAGES[500];
  }

  // Hide database / SQL error leaks
  if (SQL_ERROR_PATTERN.test(rawMessage)) {
    return DEFAULT_ERROR_MESSAGES[statusCode] || "Invalid request parameters";
  }

  // Redact tokens, secrets, and internal hostnames
  return rawMessage
    .replace(TOKEN_PATTERN, "[REDACTED]")
    .replace(SECRET_PATTERN, "[REDACTED]")
    .replace(INTERNAL_HOST_PATTERN, "[INTERNAL_UPSTREAM]");
}

// Determine HTTP status code and standard error code
function resolveStatusAndCode(error: FastifyError): { statusCode: number; code: string } {
  // Check for upstream reverse-proxy connection failures
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
    return { statusCode: 502, code: ErrorCodes.UPSTREAM_FAILURE };
  }

  // Fastify rate limit error
  if (error.statusCode === 429 || error.code === "FST_RATE_LIMIT") {
    return { statusCode: 429, code: ErrorCodes.RATE_LIMITED };
  }

  const statusCode = error.statusCode || 500;
  const rawCode = (error as { code?: string }).code;

  // Preserve domain-specific error codes (e.g., RIDE_NOT_FOUND, RIDE_STATE_CONFLICT)
  const code =
    rawCode && Object.values(ErrorCodes).includes(rawCode as (typeof ErrorCodes)[keyof typeof ErrorCodes])
      ? rawCode
      : STATUS_CODE_TO_ERROR_CODE[statusCode] || ErrorCodes.INTERNAL_ERROR;

  return { statusCode, code };
}

export async function registerErrorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const { statusCode, code } = resolveStatusAndCode(error);
    const message = sanitizeMessage(error.message || DEFAULT_ERROR_MESSAGES[statusCode], statusCode);

    // Full internal error details are logged securely on the server
    request.log.error({ err: error, requestId: request.requestId }, "Request failed with error");

    // Client response strictly excludes stack traces, secrets, and internal hostnames
    const responsePayload: ErrorResponse = {
      code,
      error: error.name || "Error",
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    reply.status(statusCode).send(responsePayload);
  });

  app.setNotFoundHandler((request, reply) => {
    const responsePayload: ErrorResponse = {
      code: ErrorCodes.NOT_FOUND,
      error: "Not Found",
      message: DEFAULT_ERROR_MESSAGES[404],
      statusCode: 404,
      timestamp: new Date().toISOString(),
    };

    reply.status(404).send(responsePayload);
  });
}
