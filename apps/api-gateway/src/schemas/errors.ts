export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RIDE_NOT_FOUND: "RIDE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  RIDE_STATE_CONFLICT: "RIDE_STATE_CONFLICT",
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  RATE_LIMITED: "RATE_LIMITED",
  UPSTREAM_FAILURE: "UPSTREAM_FAILURE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | (string & {});

export const STATUS_CODE_TO_ERROR_CODE: Record<number, string> = {
  400: ErrorCodes.VALIDATION_ERROR,
  401: ErrorCodes.UNAUTHENTICATED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  422: ErrorCodes.BUSINESS_RULE_VIOLATION,
  429: ErrorCodes.RATE_LIMITED,
  500: ErrorCodes.INTERNAL_ERROR,
  502: ErrorCodes.UPSTREAM_FAILURE,
  503: ErrorCodes.SERVICE_UNAVAILABLE,
};

export const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: "Missing or invalid input",
  401: "Missing, invalid or expired token",
  403: "Authenticated but not permitted",
  404: "Resource not found or not visible",
  409: "Invalid state transition / conflict",
  422: "Request is valid but violates domain rules",
  429: "Too many requests",
  500: "Unexpected server error",
  502: "External provider failure",
  503: "Temporarily unavailable",
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
