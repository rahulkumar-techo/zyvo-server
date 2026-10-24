import type { FastifyInstance, FastifyError } from "fastify";
import {
  ErrorCodes,
  STATUS_CODE_TO_ERROR_CODE,
  STATUS_CODE_TO_ERROR_TYPE,
  DEFAULT_ERROR_MESSAGES,
} from "../errors/index.js";

const SQL_PATTERN =
  /(?:syntax error at|select\s|insert\s|update\s|delete\s|from\s|where\s|sqlstate|relation\s|table\s|prisma|sqlite|postgres|mysql)/i;
const TOKEN_PATTERN =
  /(?:Bearer\s+)?[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
const SECRET_PATTERN =
  /(?:password|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/gi;
const INTERNAL_HOST_PATTERN =
  /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[a-z0-9-]+-(?:service|db))(?::\d+)?(?:\/[^\s]*)?/gi;

function sanitizeMessage(rawMessage: string | undefined, statusCode: number): string {
  if (!rawMessage || statusCode >= 500) {
    return DEFAULT_ERROR_MESSAGES[statusCode] || DEFAULT_ERROR_MESSAGES[500];
  }

  if (SQL_PATTERN.test(rawMessage)) {
    return DEFAULT_ERROR_MESSAGES[statusCode] || "Invalid request parameters";
  }

  return rawMessage
    .replace(TOKEN_PATTERN, "[REDACTED]")
    .replace(SECRET_PATTERN, "[REDACTED]")
    .replace(INTERNAL_HOST_PATTERN, "[INTERNAL_UPSTREAM]");
}

export async function registerErrorHandlerPlugin(app: FastifyInstance): Promise<void> {
  // Global 404 Route Not Found handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      code: ErrorCodes.ROUTE_NOT_FOUND,
      error: "NotFoundError",
      message: "Route not found",
      statusCode: 404,
      timestamp: new Date().toISOString(),
      endpoint: `${request.method} ${request.url}`,
    });
  });

  // Global Error Handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const endpoint = `${request.method} ${request.url}`;
    const rawCode = (error as { code?: string }).code;
    const cause = (error as any).cause;

    // 1. Fastify schema validation error
    if (error.validation) {
      const statusCode = 400;
      const details = error.validation.map((v: any) => ({
        field: v.instancePath ? v.instancePath.replace(/^\//, "") : (v.params?.missingProperty || ""),
        message: v.message || "Invalid value",
      }));

      reply.status(statusCode).send({
        code: ErrorCodes.VALIDATION_ERROR,
        error: "ValidationError",
        message: error.message || DEFAULT_ERROR_MESSAGES[400],
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
        details,
      });
      return;
    }

    // 2. Malformed JSON request body
    if (
      (error as any).statusCode === 400 &&
      (error instanceof SyntaxError ||
        rawCode === "FST_ERR_CTP_INVALID_CONTENT_LENGTH" ||
        rawCode === "FST_ERR_CTP_EMPTY_JSON_BODY" ||
        error.message?.includes("JSON"))
    ) {
      const statusCode = 400;
      reply.status(statusCode).send({
        code: ErrorCodes.INVALID_REQUEST_BODY,
        error: "ValidationError",
        message: "Malformed JSON or invalid request body",
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
      });
      return;
    }

    // 3. Rate limit exceeded (429)
    if (error.statusCode === 429 || rawCode === "FST_RATE_LIMIT") {
      const statusCode = 429;
      const isLogin = request.url.includes("/login");
      const isOtp = request.url.includes("/otp");
      const code = isLogin
        ? ErrorCodes.LOGIN_RATE_LIMIT_EXCEEDED
        : isOtp
          ? ErrorCodes.OTP_RATE_LIMIT_EXCEEDED
          : ErrorCodes.TOO_MANY_REQUESTS;

      reply.status(statusCode).send({
        code,
        error: "RateLimitError",
        message: DEFAULT_ERROR_MESSAGES[429],
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
      });
      return;
    }

    // 4. Gateway Timeout (504)
    const isTimeout =
      rawCode === "ETIMEDOUT" ||
      rawCode === "ESOCKETTIMEDOUT" ||
      error.message?.includes("timed out") ||
      cause?.code === "ETIMEDOUT";

    if (isTimeout) {
      const statusCode = 504;
      request.log.error(
        {
          err: {
            type: error.name,
            message: error.message,
            stack: error.stack,
            statusCode,
            code: ErrorCodes.GATEWAY_TIMEOUT,
          },
          requestId: request.id,
        },
        "Upstream gateway timeout",
      );

      reply.status(statusCode).send({
        code: ErrorCodes.GATEWAY_TIMEOUT,
        error: "GatewayTimeoutError",
        message: DEFAULT_ERROR_MESSAGES[504] || "Gateway timeout",
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
      });
      return;
    }

    // 5. Upstream Service Error / Bad Gateway (502)
    const isNetworkError =
      rawCode === "ECONNREFUSED" ||
      rawCode === "ENOTFOUND" ||
      rawCode === "ECONNRESET" ||
      rawCode === "FST_REPLY_FROM_INTERNAL_SERVER_ERROR" ||
      error.message?.includes("ECONNREFUSED") ||
      cause?.code === "ECONNREFUSED" ||
      (cause?.aggregateErrors && cause.aggregateErrors.some((e: any) => e.code === "ECONNREFUSED"));

    if (isNetworkError) {
      const statusCode = 502;
      request.log.error(
        {
          err: {
            type: error.name,
            message: error.message,
            stack: error.stack,
            statusCode,
            code: ErrorCodes.UPSTREAM_SERVICE_ERROR,
          },
          requestId: request.id,
        },
        "Upstream service connection failed",
      );

      reply.status(statusCode).send({
        code: ErrorCodes.UPSTREAM_SERVICE_ERROR,
        error: "BadGatewayError",
        message: DEFAULT_ERROR_MESSAGES[502],
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
      });
      return;
    }

    // 6. Prisma / Database Errors (decoupled duck-typing)
    const isPrisma =
      error.name?.startsWith("PrismaClient") ||
      (rawCode && typeof rawCode === "string" && /^P\d{4}$/.test(rawCode));

    if (isPrisma) {
      request.log.error(
        {
          err: {
            type: error.name,
            message: error.message,
            stack: error.stack,
            code: rawCode,
          },
          requestId: request.id,
        },
        "Database exception intercepted",
      );

      if (rawCode === "P2002") {
        const statusCode = 409;
        reply.status(statusCode).send({
          code: ErrorCodes.RESOURCE_CONFLICT,
          error: "ConflictError",
          message: "Resource state conflict or duplicate entry",
          statusCode,
          timestamp: new Date().toISOString(),
          endpoint,
        });
        return;
      }

      if (rawCode === "P2025") {
        const statusCode = 404;
        reply.status(statusCode).send({
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          error: "NotFoundError",
          message: "Requested resource not found",
          statusCode,
          timestamp: new Date().toISOString(),
          endpoint,
        });
        return;
      }

      if (rawCode === "P2003") {
        const statusCode = 409;
        reply.status(statusCode).send({
          code: ErrorCodes.RESOURCE_CONFLICT,
          error: "ConflictError",
          message: "Related resource constraint violation",
          statusCode,
          timestamp: new Date().toISOString(),
          endpoint,
        });
        return;
      }

      if (
        rawCode === "P1000" ||
        rawCode === "P1001" ||
        rawCode === "P1002" ||
        rawCode === "P1008" ||
        rawCode === "P1017"
      ) {
        const statusCode = 503;
        reply.status(statusCode).send({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          error: "ServiceUnavailableError",
          message: "Database service is temporarily unavailable",
          statusCode,
          timestamp: new Date().toISOString(),
          endpoint,
        });
        return;
      }

      const statusCode = 500;
      reply.status(statusCode).send({
        code: ErrorCodes.DATABASE_ERROR,
        error: "DatabaseError",
        message: "Unexpected database failure occurred",
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
      });
      return;
    }

    // 7. General AppError and unhandled errors
    const statusCode = error.statusCode || 500;
    const code =
      rawCode && Object.values(ErrorCodes).includes(rawCode as any)
        ? rawCode
        : STATUS_CODE_TO_ERROR_CODE[statusCode] || ErrorCodes.INTERNAL_SERVER_ERROR;

    let errorType = (error as any).errorType;
    if (!errorType || errorType === "Error" || errorType === "FastifyError") {
      errorType =
        error.name && error.name !== "Error" && error.name !== "FastifyError"
          ? error.name
          : STATUS_CODE_TO_ERROR_TYPE[statusCode] || "InternalServerError";
    }

    const sanitizedMsg = sanitizeMessage(error.message, statusCode);

    if (statusCode >= 500) {
      request.log.error(
        {
          err: {
            type: error.name,
            message: error.message,
            stack: error.stack,
            statusCode,
            code,
          },
          requestId: request.id,
        },
        "Request failed with server error",
      );
    } else {
      request.log.info(
        {
          statusCode,
          code,
          errorType,
          requestId: request.id,
        },
        "Request completed with client error",
      );
    }

    const responsePayload: Record<string, any> = {
      code,
      error: errorType,
      message: sanitizedMsg,
      statusCode,
      timestamp: new Date().toISOString(),
      endpoint,
    };

    if ((error as any).details !== undefined) {
      responsePayload.details = (error as any).details;
    }

    reply.status(statusCode).send(responsePayload);
  });
}

