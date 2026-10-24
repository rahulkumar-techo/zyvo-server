# Zyvo Agent & Developer Instructions

This document defines mandatory engineering guidelines for all AI agents and developers working on the Zyvo backend monorepo.

---

## 1. Centralized Error Handling Architecture

All backend services (`@zyvo/api-gateway`, `@zyvo/auth-service`, `@zyvo/user-service`, and future microservices) MUST adhere to the centralized error-handling standard provided by `@zyvo/common`.

### Mandatory Rules

1. **Never construct custom ad-hoc error responses** in routes or controllers.
2. **Never duplicate error-handling plugins.** Always use:
   ```ts
   import { registerErrorHandlerPlugin } from "@zyvo/common";
   await registerErrorHandlerPlugin(app);
   ```
3. **Always throw standard `AppError` subclasses from `@zyvo/common`**:
   - `AuthenticationError` (401)
   - `AuthorizationError` (403)
   - `NotFoundError` (404)
   - `ValidationError` (400)
   - `ConflictError` (409)
   - `BusinessRuleError` (422)
   - `RateLimitError` (429)
   - `InternalServerError` (500)
   - `DatabaseError` (500)
   - `BadGatewayError` (502)
   - `ServiceUnavailableError` (503)
   - `GatewayTimeoutError` (504)
4. **Use canonical machine-readable error codes from `ErrorCodes` (`@zyvo/common`)**:
   - **401**: `UNAUTHENTICATED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `SESSION_EXPIRED`
   - **403**: `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`, `ACCOUNT_DEACTIVATED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_LOCKED`
   - **404**: `ROUTE_NOT_FOUND`, `USER_NOT_FOUND`, `USER_PROFILE_NOT_FOUND`, `RESOURCE_NOT_FOUND`
   - **400**: `VALIDATION_ERROR`, `INVALID_REQUEST_BODY`, `MISSING_REQUIRED_FIELD`, `INVALID_PARAMETER`
   - **409**: `RESOURCE_CONFLICT`, `EMAIL_ALREADY_EXISTS`, `PHONE_ALREADY_EXISTS`, `DUPLICATE_RESOURCE`, `INVALID_STATE_TRANSITION`
   - **422**: `BUSINESS_RULE_VIOLATION`, `INSUFFICIENT_BALANCE`
   - **429**: `TOO_MANY_REQUESTS`, `LOGIN_RATE_LIMIT_EXCEEDED`, `OTP_RATE_LIMIT_EXCEEDED`
   - **500**: `INTERNAL_SERVER_ERROR`, `DATABASE_ERROR`
   - **502**: `UPSTREAM_SERVICE_ERROR`
   - **503**: `SERVICE_UNAVAILABLE`
   - **504**: `GATEWAY_TIMEOUT`
5. **Decoupling Constraint**: `@zyvo/common` must remain 100% decoupled from `@zyvo/database` and Prisma. Database errors are mapped safely using duck-typing inspection of known Prisma codes (`P2002`, `P2025`, `P1001`, etc.).
6. **No Information Leaks**: Stack traces, SQL queries, table names, passwords, tokens, secrets, or internal hostnames/ports must NEVER appear in client-facing responses.

---

## 2. Standard Error Response Contract

Every API error response across all services strictly matches this structure:

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

For validation failures, a structured `details` array is included:
```json
{
  "code": "VALIDATION_ERROR",
  "error": "ValidationError",
  "message": "body must have required property 'email'",
  "statusCode": 400,
  "timestamp": "2026-10-23T16:23:38.735Z",
  "endpoint": "POST /auth/login",
  "details": [
    {
      "field": "email",
      "message": "must have required property 'email'"
    }
  ]
}
```

The actual HTTP response status code MUST match `statusCode` in the body.

---

## 3. Authentication & Account Status Policies

1. **Login Credentials**: Always return generic message `"Invalid email or password"` (`401 INVALID_CREDENTIALS`) to prevent account enumeration.
2. **Missing Token**: When a Bearer token is missing on a protected route, return `401 UNAUTHENTICATED`.
3. **Expired Token**: Return `401 TOKEN_EXPIRED`.
4. **Invalid Token**: Return `401 INVALID_TOKEN`.
5. **Revoked/Logged-out Session**: Return `401 SESSION_EXPIRED`.
6. **Role/Permission Denied**: Return `403 INSUFFICIENT_PERMISSIONS`.
7. **Deactivated Account**: Return `403 ACCOUNT_DEACTIVATED`.
8. **Missing Profile in DB**: For an authenticated user with no profile record, return `404 USER_PROFILE_NOT_FOUND`.
9. **Logout**: Invalidates session/refresh token. Does NOT deactivate user account. Returns `200 OK`.
