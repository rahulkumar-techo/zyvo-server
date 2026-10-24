import {
  ErrorCodes,
  DEFAULT_ERROR_MESSAGES,
  STATUS_CODE_TO_ERROR_TYPE,
  type ErrorCode,
} from "./codes.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errorType: string;
  public readonly details?: unknown;

  constructor(
    arg1: number | string,
    arg2: string,
    arg3?: string,
    details?: unknown,
  ) {
    let statusCode: number;
    let code: string;
    let message: string;
    let errorType: string;

    const subclassType =
      new.target && new.target.name && new.target.name !== "AppError"
        ? new.target.name
        : undefined;

    if (typeof arg1 === "number") {
      // Signature: new AppError(statusCode, code, message, details)
      statusCode = arg1;
      code = arg2;
      message = arg3 || DEFAULT_ERROR_MESSAGES[statusCode] || "Application error";
      errorType = subclassType || STATUS_CODE_TO_ERROR_TYPE[statusCode] || "AppError";
    } else {
      // Signature: new AppError(code, message, statusCode, details)
      code = arg1;
      message = arg2;
      statusCode = typeof arg3 === "number" ? arg3 : 500;
      errorType = subclassType || STATUS_CODE_TO_ERROR_TYPE[statusCode] || "AppError";
    }

    super(message);
    this.name = errorType;
    this.statusCode = statusCode;
    this.code = code;
    this.errorType = errorType;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 401 Unauthorized
export class AuthenticationError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[401],
    code: ErrorCode = ErrorCodes.UNAUTHENTICATED,
    details?: unknown,
  ) {
    super(401, code, message, details);
    this.name = "AuthenticationError";
  }
}

// 403 Forbidden
export class AuthorizationError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[403],
    code: ErrorCode = ErrorCodes.FORBIDDEN,
    details?: unknown,
  ) {
    super(403, code, message, details);
    this.name = "AuthorizationError";
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[404],
    code: ErrorCode = ErrorCodes.RESOURCE_NOT_FOUND,
    details?: unknown,
  ) {
    super(404, code, message, details);
    this.name = "NotFoundError";
  }
}

// 400 Bad Request
export class ValidationError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[400],
    code: ErrorCode = ErrorCodes.VALIDATION_ERROR,
    details?: unknown,
  ) {
    super(400, code, message, details);
    this.name = "ValidationError";
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[409],
    code: ErrorCode = ErrorCodes.RESOURCE_CONFLICT,
    details?: unknown,
  ) {
    super(409, code, message, details);
    this.name = "ConflictError";
  }
}

// 422 Unprocessable Content (Business logic / domain rule violations)
export class BusinessRuleError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[422],
    code: ErrorCode = ErrorCodes.BUSINESS_RULE_VIOLATION,
    details?: unknown,
  ) {
    super(422, code, message, details);
    this.name = "BusinessRuleError";
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[429],
    code: ErrorCode = ErrorCodes.TOO_MANY_REQUESTS,
    details?: unknown,
  ) {
    super(429, code, message, details);
    this.name = "RateLimitError";
  }
}

// 500 Internal Server Error
export class InternalServerError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[500],
    code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(500, code, message, details);
    this.name = "InternalServerError";
  }
}

// 500 Database Error
export class DatabaseError extends AppError {
  constructor(
    message: string = "Unexpected database failure occurred",
    code: ErrorCode = ErrorCodes.DATABASE_ERROR,
    details?: unknown,
  ) {
    super(500, code, message, details);
    this.name = "DatabaseError";
  }
}

// 502 Bad Gateway
export class BadGatewayError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[502],
    code: ErrorCode = ErrorCodes.UPSTREAM_SERVICE_ERROR,
    details?: unknown,
  ) {
    super(502, code, message, details);
    this.name = "BadGatewayError";
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[503],
    code: ErrorCode = ErrorCodes.SERVICE_UNAVAILABLE,
    details?: unknown,
  ) {
    super(503, code, message, details);
    this.name = "ServiceUnavailableError";
  }
}

// 504 Gateway Timeout
export class GatewayTimeoutError extends AppError {
  constructor(
    message: string = DEFAULT_ERROR_MESSAGES[504],
    code: ErrorCode = ErrorCodes.GATEWAY_TIMEOUT,
    details?: unknown,
  ) {
    super(504, code, message, details);
    this.name = "GatewayTimeoutError";
  }
}
