// Canonical registry of machine-readable error codes across the backend
export const ErrorCodes = {
  // 401 Unauthorized
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // 403 Forbidden
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",

  // 404 Not Found
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RIDE_NOT_FOUND: "RIDE_NOT_FOUND",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  NOT_FOUND: "RESOURCE_NOT_FOUND", // Backward compatibility alias

  // 400 Bad Request
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST_BODY: "INVALID_REQUEST_BODY",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_PARAMETER: "INVALID_PARAMETER",

  // 422 Unprocessable Content (Business logic / domain rule violations)
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",

  // 409 Conflict
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  PHONE_ALREADY_EXISTS: "PHONE_ALREADY_EXISTS",
  DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  RIDE_ALREADY_CANCELLED: "RIDE_ALREADY_CANCELLED",
  DRIVER_UNAVAILABLE: "DRIVER_UNAVAILABLE",
  CONFLICT: "RESOURCE_CONFLICT", // Backward compatibility alias
  RIDE_STATE_CONFLICT: "INVALID_STATE_TRANSITION", // Backward compatibility alias

  // 429 Too Many Requests
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  LOGIN_RATE_LIMIT_EXCEEDED: "LOGIN_RATE_LIMIT_EXCEEDED",
  OTP_RATE_LIMIT_EXCEEDED: "OTP_RATE_LIMIT_EXCEEDED",
  RATE_LIMITED: "TOO_MANY_REQUESTS", // Backward compatibility alias

  // 500, 502, 503, 504 Infrastructure & Server
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR", // Backward compatibility alias
  DATABASE_ERROR: "DATABASE_ERROR",
  UPSTREAM_SERVICE_ERROR: "UPSTREAM_SERVICE_ERROR",
  UPSTREAM_FAILURE: "UPSTREAM_SERVICE_ERROR", // Backward compatibility alias
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | (string & {});

export const STATUS_CODE_TO_ERROR_CODE: Record<number, string> = {
  400: ErrorCodes.VALIDATION_ERROR,
  401: ErrorCodes.UNAUTHENTICATED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.RESOURCE_NOT_FOUND,
  409: ErrorCodes.RESOURCE_CONFLICT,
  422: ErrorCodes.BUSINESS_RULE_VIOLATION,
  429: ErrorCodes.TOO_MANY_REQUESTS,
  500: ErrorCodes.INTERNAL_SERVER_ERROR,
  502: ErrorCodes.UPSTREAM_SERVICE_ERROR,
  503: ErrorCodes.SERVICE_UNAVAILABLE,
  504: ErrorCodes.GATEWAY_TIMEOUT,
};

export const STATUS_CODE_TO_ERROR_TYPE: Record<number, string> = {
  400: "ValidationError",
  401: "AuthenticationError",
  403: "AuthorizationError",
  404: "NotFoundError",
  409: "ConflictError",
  422: "BusinessRuleError",
  429: "RateLimitError",
  500: "InternalServerError",
  502: "BadGatewayError",
  503: "ServiceUnavailableError",
  504: "GatewayTimeoutError",
};

export const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request parameters or malformed body",
  401: "Missing, invalid or expired authentication token",
  403: "Insufficient permissions to perform this action",
  404: "Requested resource not found",
  409: "Resource conflict or duplicate entry",
  422: "Operation violates business rules or constraints",
  429: "Too many requests, please try again later",
  500: "Internal server error occurred",
  502: "Bad gateway / upstream service unavailable",
  503: "Service temporarily unavailable",
  504: "Gateway timeout communicating with upstream service",
};
