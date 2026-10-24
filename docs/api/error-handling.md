# Zyvo Backend API Error Handling Documentation

This document describes the standardized API error-handling specification implemented across all backend services in the Zyvo monorepo.

---

## 1. Unified Error Response Schema

Every error returned by any service (`api-gateway`, `auth-service`, `user-service`, etc.) strictly adheres to the standard error JSON contract:

```typescript
export interface StandardErrorResponse {
  code: string;       // Stable, machine-readable identifier (e.g. "INVALID_CREDENTIALS")
  error: string;      // Error class/type (e.g. "AuthenticationError", "NotFoundError")
  message: string;    // Safe, human-readable description
  statusCode: number; // Actual HTTP status code (strictly matches the response status)
  timestamp: string;  // ISO 8601 UTC timestamp
  endpoint: string;   // HTTP method and request path (e.g. "POST /auth/login")
  details?: unknown;  // Optional structured validation error details
}
```

The actual HTTP response status code **MUST** always match the `statusCode` in the body.

---

## 2. Canonical Error Code Registry & Status Mapping

| Status Code | Error Class | Canonical Code | When to Use |
| :---: | :---: | :---: | :--- |
| **401** | `AuthenticationError` | `UNAUTHENTICATED` | Missing Bearer token on protected route |
| **401** | `AuthenticationError` | `INVALID_TOKEN` | Malformed or invalid JWT signature |
| **401** | `AuthenticationError` | `TOKEN_EXPIRED` | Expired access token |
| **401** | `AuthenticationError` | `INVALID_CREDENTIALS` | Incorrect phone/email or password (generic message) |
| **401** | `AuthenticationError` | `INVALID_REFRESH_TOKEN`| Expired, revoked, or non-existent refresh token |
| **401** | `AuthenticationError` | `SESSION_EXPIRED` | Revoked or logged-out user session |
| **403** | `AuthorizationError` | `FORBIDDEN` | General access prohibited |
| **403** | `AuthorizationError` | `INSUFFICIENT_PERMISSIONS` | User role not permitted for this endpoint |
| **403** | `AuthorizationError` | `ACCOUNT_DEACTIVATED` | Authenticated user's account is deactivated |
| **403** | `AuthorizationError` | `ACCOUNT_SUSPENDED` | Authenticated user's account is suspended |
| **403** | `AuthorizationError` | `ACCOUNT_LOCKED` | Account is temporarily locked |
| **404** | `NotFoundError` | `ROUTE_NOT_FOUND` | No route registered at request path |
| **404** | `NotFoundError` | `USER_NOT_FOUND` | User entity not found |
| **404** | `NotFoundError` | `USER_PROFILE_NOT_FOUND` | User profile record missing in database |
| **404** | `NotFoundError` | `RESOURCE_NOT_FOUND` | Generic resource not found |
| **400** | `ValidationError` | `VALIDATION_ERROR` | Schema validation failed, missing required fields |
| **400** | `ValidationError` | `INVALID_REQUEST_BODY` | Malformed JSON body or invalid payload |
| **400** | `ValidationError` | `MISSING_REQUIRED_FIELD`| Required input parameter missing |
| **409** | `ConflictError` | `RESOURCE_CONFLICT` | Prisma unique constraint / state conflict |
| **409** | `ConflictError` | `EMAIL_ALREADY_EXISTS` | Duplicate email address registration / update |
| **409** | `ConflictError` | `PHONE_ALREADY_EXISTS` | Duplicate phone number registration / update |
| **409** | `ConflictError` | `INVALID_STATE_TRANSITION` | Resource state prevents operation (e.g. cancelled ride) |
| **422** | `BusinessRuleError` | `BUSINESS_RULE_VIOLATION` | Syntactically valid request violates business rules (e.g. invalid OTP) |
| **422** | `BusinessRuleError` | `INSUFFICIENT_BALANCE` | Insufficient wallet or payment balance |
| **429** | `RateLimitError` | `TOO_MANY_REQUESTS` | Standard rate limit exceeded |
| **429** | `RateLimitError` | `LOGIN_RATE_LIMIT_EXCEEDED` | Too many login attempts |
| **500** | `InternalServerError` | `INTERNAL_SERVER_ERROR` | Unhandled runtime exception (stack traces suppressed) |
| **500** | `DatabaseError` | `DATABASE_ERROR` | Unexpected database query failure |
| **502** | `BadGatewayError` | `UPSTREAM_SERVICE_ERROR` | Microservice connection refused (`ECONNREFUSED`) |
| **503** | `ServiceUnavailableError` | `SERVICE_UNAVAILABLE` | Database or service temporarily offline (`P1001`) |
| **504** | `GatewayTimeoutError` | `GATEWAY_TIMEOUT` | Upstream service request timed out (`ETIMEDOUT`) |

---

## 3. Concrete Examples

### A. Authentication Errors

#### Missing Access Token (401)
```http
GET /users/me HTTP/1.1
```
```json
{
  "code": "UNAUTHENTICATED",
  "error": "AuthenticationError",
  "message": "Missing, invalid or expired authentication token",
  "statusCode": 401,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /users/me"
}
```

#### Incorrect Login Credentials (401)
```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{
  "phoneOrEmail": "+919876543210",
  "password": "wrongpassword"
}
```
```json
{
  "code": "INVALID_CREDENTIALS",
  "error": "AuthenticationError",
  "message": "Invalid email or password",
  "statusCode": 401,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "POST /auth/login"
}
```
*Note: Message is deliberately generic to prevent account enumeration.*

---

### B. Authorization & Account Status Errors

#### Role Permission Denied (403)
```json
{
  "code": "INSUFFICIENT_PERMISSIONS",
  "error": "AuthorizationError",
  "message": "Insufficient permissions to perform this action",
  "statusCode": 403,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /users/me"
}
```

#### Deactivated Account (403)
```json
{
  "code": "ACCOUNT_DEACTIVATED",
  "error": "AuthorizationError",
  "message": "User account has been deactivated or suspended",
  "statusCode": 403,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /users/me"
}
```

---

### C. Resource Not Found Errors

#### Unmatched Route (404)
```json
{
  "code": "ROUTE_NOT_FOUND",
  "error": "NotFoundError",
  "message": "Route not found",
  "statusCode": 404,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /api/v1/unknown-path"
}
```

#### Missing User Profile (404)
```json
{
  "code": "USER_PROFILE_NOT_FOUND",
  "error": "NotFoundError",
  "message": "User profile not found",
  "statusCode": 404,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /users/me"
}
```

---

### D. Validation Errors (400)

```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{}
```
```json
{
  "code": "VALIDATION_ERROR",
  "error": "ValidationError",
  "message": "body must have required property 'phoneOrEmail'",
  "statusCode": 400,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "POST /auth/login",
  "details": [
    {
      "field": "phoneOrEmail",
      "message": "must have required property 'phoneOrEmail'"
    }
  ]
}
```

---

### E. Conflict & Duplicate Errors (409)

```json
{
  "code": "PHONE_ALREADY_EXISTS",
  "error": "ConflictError",
  "message": "Phone number is already registered to another account",
  "statusCode": 409,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "PATCH /users/me/phone"
}
```

---

### F. Business Rule Errors (422)

```json
{
  "code": "BUSINESS_RULE_VIOLATION",
  "error": "BusinessRuleError",
  "message": "Invalid or expired verification code",
  "statusCode": 422,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "PATCH /users/me/phone"
}
```

---

### G. Server & Infrastructure Errors (500, 502, 503, 504)

#### Unexpected Server Exception (500)
```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "error": "InternalServerError",
  "message": "Internal server error occurred",
  "statusCode": 500,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /test/crash"
}
```

#### Upstream Service Connection Refused (502)
```json
{
  "code": "UPSTREAM_SERVICE_ERROR",
  "error": "BadGatewayError",
  "message": "Bad gateway / upstream service unavailable",
  "statusCode": 502,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "GET /api/v1/users/me"
}
```

---

## 4. Security & Sanitization Guarantees

1. **Stack Trace Redaction**: Client-facing responses NEVER contain stack traces or file paths.
2. **SQL Sanitization**: All queries, table names, columns, and Prisma syntax strings are detected via regex and replaced with safe generic error messages.
3. **Secret Redaction**: Passwords, API keys, and JWT bearer tokens are dynamically redacted with `[REDACTED]`.
4. **Internal Host Masking**: Internal container names (e.g. `user-service:4002`) are masked with `[INTERNAL_UPSTREAM]`.
