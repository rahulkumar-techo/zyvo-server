import type { FastifyInstance, FastifyError } from "fastify";
import {
  ErrorCodes,
  STATUS_CODE_TO_ERROR_CODE,
  DEFAULT_ERROR_MESSAGES,
} from "../schemas/index.js";

const SQL_PATTERN = /(?:syntax error at|select\s|insert\s|update\s|delete\s|from\s|where\s|sqlstate|relation\s|table\s|prisma|sqlite|postgres|mysql)/i;
const TOKEN_PATTERN = /(?:Bearer\s+)?[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
const SECRET_PATTERN = /(?:password|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/gi;

function sanitizeMessage(rawMessage: string, statusCode: number): string {
  if (statusCode >= 500) {
    return DEFAULT_ERROR_MESSAGES[statusCode] || DEFAULT_ERROR_MESSAGES[500];
  }

  if (SQL_PATTERN.test(rawMessage)) {
    return "Invalid request parameters";
  }

  return rawMessage
    .replace(TOKEN_PATTERN, "[REDACTED]")
    .replace(SECRET_PATTERN, "[REDACTED]");
}

export async function registerErrorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const isDev = process.env.NODE_ENV !== "production";
    const endpoint = isDev ? `${request.method} ${request.url}` : undefined;

    // Fastify schema validation error
    if (error.validation) {
      const statusCode = 400;
      reply.status(statusCode).send({
        code: ErrorCodes.VALIDATION_ERROR,
        error: "Bad Request",
        message: error.message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(endpoint ? { endpoint } : {}),
      });
      return;
    }

    // Rate limit error
    if (error.statusCode === 429 || error.code === "FST_RATE_LIMIT") {
      const statusCode = 429;
      reply.status(statusCode).send({
        code: ErrorCodes.RATE_LIMITED,
        error: "Too Many Requests",
        message: DEFAULT_ERROR_MESSAGES[429],
        statusCode,
        timestamp: new Date().toISOString(),
        ...(endpoint ? { endpoint } : {}),
      });
      return;
    }

    const statusCode = error.statusCode || 500;
    const rawCode = (error as { code?: string }).code;

    const code =
      rawCode && Object.values(ErrorCodes).includes(rawCode as (typeof ErrorCodes)[keyof typeof ErrorCodes])
        ? rawCode
        : STATUS_CODE_TO_ERROR_CODE[statusCode] || ErrorCodes.INTERNAL_ERROR;

    const message = sanitizeMessage(error.message || DEFAULT_ERROR_MESSAGES[statusCode], statusCode);

    // Internal secure logging
    request.log.error({ err: error, requestId: request.requestId }, "Request failed with error");

    // Client response strictly omits stack traces and secrets
    reply.status(statusCode).send({
      code,
      error: error.name || "Error",
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(endpoint ? { endpoint } : {}),
    });
  });

  app.setNotFoundHandler((request, reply) => {
    const isDev = process.env.NODE_ENV !== "production";
    const endpoint = isDev ? `${request.method} ${request.url}` : undefined;

    reply.status(404).send({
      code: ErrorCodes.NOT_FOUND,
      error: "Not Found",
      message: DEFAULT_ERROR_MESSAGES[404],
      statusCode: 404,
      timestamp: new Date().toISOString(),
      ...(endpoint ? { endpoint } : {}),
    });
  });
}
