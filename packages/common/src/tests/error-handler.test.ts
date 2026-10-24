import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import {
  ErrorCodes,
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  BusinessRuleError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
} from "../errors/index.js";
import { registerErrorHandlerPlugin } from "../plugins/error-handler.js";
import { authenticate, authorize } from "../middleware/index.js";

async function createTestApp() {
  const app = Fastify({ logger: false });
  await app.register(fastifyJwt, { secret: "super-secret-key-for-common-tests-12345" });
  await registerErrorHandlerPlugin(app);
  return app;
}

test("Centralized Error Handling Architecture Suite", async (t) => {
  // 1. Successful authentication
  await t.test("1. Successful authentication flow", async () => {
    const app = await createTestApp();
    app.get("/test/protected", { preHandler: [authenticate] }, async (req) => {
      return { success: true, user: req.authUser };
    });

    const token = app.jwt.sign({ userId: "u-1", role: "admin", sessionId: "s-1" });
    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.user.userId, "u-1");
    await app.close();
  });

  // 2. Incorrect login credentials (401 INVALID_CREDENTIALS)
  await t.test("2. Incorrect login credentials returns 401 INVALID_CREDENTIALS", async () => {
    const app = await createTestApp();
    app.post("/test/auth/login", async () => {
      throw new AuthenticationError("Invalid email or password", ErrorCodes.INVALID_CREDENTIALS);
    });

    const res = await app.inject({
      method: "POST",
      url: "/test/auth/login",
      payload: { email: "attacker@test.com", password: "wrong" },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.INVALID_CREDENTIALS);
    assert.equal(body.error, "AuthenticationError");
    assert.equal(body.message, "Invalid email or password");
    assert.equal(body.endpoint, "POST /test/auth/login");
    assert.ok(body.timestamp);
    assert.equal(body.stack, undefined);
    await app.close();
  });

  // 3. Missing login fields (400 VALIDATION_ERROR with structured details)
  await t.test("3. Missing login fields returns 400 VALIDATION_ERROR with details", async () => {
    const app = await createTestApp();
    app.post(
      "/test/auth/validate-login",
      {
        schema: {
          body: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string" },
              password: { type: "string" },
            },
          },
        },
      },
      async () => ({ ok: true }),
    );

    const res = await app.inject({
      method: "POST",
      url: "/test/auth/validate-login",
      payload: {},
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 400);
    assert.equal(body.code, ErrorCodes.VALIDATION_ERROR);
    assert.equal(body.error, "ValidationError");
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.length > 0);
    assert.equal(body.endpoint, "POST /test/auth/validate-login");
    await app.close();
  });

  // 4. Invalid access token (401 INVALID_TOKEN)
  await t.test("4. Invalid access token returns 401 INVALID_TOKEN", async () => {
    const app = await createTestApp();
    app.get("/test/protected", { preHandler: [authenticate] }, async () => ({ ok: true }));

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: "Bearer invalid.token.signature" },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.INVALID_TOKEN);
    assert.equal(body.error, "AuthenticationError");
    assert.equal(body.endpoint, "GET /test/protected");
    await app.close();
  });

  // 5. Expired access token (401 TOKEN_EXPIRED)
  await t.test("5. Expired access token returns 401 TOKEN_EXPIRED", async () => {
    const app = await createTestApp();
    app.get("/test/protected", { preHandler: [authenticate] }, async () => ({ ok: true }));

    const expiredToken = app.jwt.sign(
      { userId: "u-1", role: "passenger" },
      { expiresIn: -10 },
    );

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.TOKEN_EXPIRED);
    assert.equal(body.error, "AuthenticationError");
    await app.close();
  });

  // 6. Missing access token (401 UNAUTHENTICATED)
  await t.test("6. Missing access token returns 401 UNAUTHENTICATED", async () => {
    const app = await createTestApp();
    app.get("/test/protected", { preHandler: [authenticate] }, async () => ({ ok: true }));

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.UNAUTHENTICATED);
    assert.equal(body.error, "AuthenticationError");
    await app.close();
  });

  // 7. Invalid refresh token (401 INVALID_REFRESH_TOKEN)
  await t.test("7. Invalid refresh token returns 401 INVALID_REFRESH_TOKEN", async () => {
    const app = await createTestApp();
    app.post("/test/auth/refresh", async () => {
      throw new AuthenticationError("Invalid or expired refresh token", ErrorCodes.INVALID_REFRESH_TOKEN);
    });

    const res = await app.inject({
      method: "POST",
      url: "/test/auth/refresh",
      payload: { refreshToken: "bad_token" },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.INVALID_REFRESH_TOKEN);
    assert.equal(body.error, "AuthenticationError");
    await app.close();
  });

  // 8. Revoked or expired session (401 SESSION_EXPIRED)
  await t.test("8. Revoked session returns 401 SESSION_EXPIRED", async () => {
    const app = await createTestApp();
    (app as any).isSessionActive = async () => false;

    app.get("/test/protected", { preHandler: [authenticate] }, async () => ({ ok: true }));

    const token = app.jwt.sign({ userId: "u-1", role: "passenger", sessionId: "revoked-1" });
    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 401);
    assert.equal(body.code, ErrorCodes.SESSION_EXPIRED);
    assert.equal(body.error, "AuthenticationError");
    await app.close();
  });

  // 9. Deactivated account (403 ACCOUNT_DEACTIVATED)
  await t.test("9. Deactivated account returns 403 ACCOUNT_DEACTIVATED", async () => {
    const app = await createTestApp();
    app.get("/test/user/deactivated", async () => {
      throw new AuthorizationError("User account has been deactivated", ErrorCodes.ACCOUNT_DEACTIVATED);
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/user/deactivated",
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, ErrorCodes.ACCOUNT_DEACTIVATED);
    assert.equal(body.error, "AuthorizationError");
    await app.close();
  });

  // 10. Suspended or locked account (403 ACCOUNT_SUSPENDED / ACCOUNT_LOCKED)
  await t.test("10. Suspended or locked account returns 403", async () => {
    const app = await createTestApp();
    app.get("/test/user/suspended", async () => {
      throw new AuthorizationError("Account suspended", ErrorCodes.ACCOUNT_SUSPENDED);
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/user/suspended",
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, ErrorCodes.ACCOUNT_SUSPENDED);
    await app.close();
  });

  // 11. Missing user profile (404 USER_PROFILE_NOT_FOUND)
  await t.test("11. Missing user profile returns 404 USER_PROFILE_NOT_FOUND", async () => {
    const app = await createTestApp();
    app.get("/test/user/profile", async () => {
      throw new NotFoundError("User profile not found", ErrorCodes.USER_PROFILE_NOT_FOUND);
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/user/profile",
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 404);
    assert.equal(body.code, ErrorCodes.USER_PROFILE_NOT_FOUND);
    assert.equal(body.error, "NotFoundError");
    await app.close();
  });

  // 12. Missing user resource (404 USER_NOT_FOUND)
  await t.test("12. Missing user resource returns 404 USER_NOT_FOUND", async () => {
    const app = await createTestApp();
    app.get("/test/users/:id", async () => {
      throw new NotFoundError("User not found", ErrorCodes.USER_NOT_FOUND);
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/users/non-existent-id",
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 404);
    assert.equal(body.code, ErrorCodes.USER_NOT_FOUND);
    await app.close();
  });

  // 13. Unknown API route (404 ROUTE_NOT_FOUND)
  await t.test("13. Unknown API route returns 404 ROUTE_NOT_FOUND", async () => {
    const app = await createTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/non-existent/endpoint/path",
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 404);
    assert.equal(body.code, ErrorCodes.ROUTE_NOT_FOUND);
    assert.equal(body.error, "NotFoundError");
    assert.equal(body.message, "Route not found");
    assert.equal(body.endpoint, "GET /api/non-existent/endpoint/path");
    assert.ok(body.timestamp);
    await app.close();
  });

  // 14. Insufficient role / permissions (403 INSUFFICIENT_PERMISSIONS)
  await t.test("14. Insufficient role permissions returns 403 INSUFFICIENT_PERMISSIONS", async () => {
    const app = await createTestApp();
    app.get(
      "/test/admin-only",
      { preHandler: [authenticate, authorize(["admin"])] },
      async () => ({ ok: true }),
    );

    const passengerToken = app.jwt.sign({ userId: "u-2", role: "passenger", sessionId: "s-2" });
    const res = await app.inject({
      method: "GET",
      url: "/test/admin-only",
      headers: { authorization: `Bearer ${passengerToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    assert.equal(body.error, "AuthorizationError");
    await app.close();
  });

  // 15. Duplicate email registration (409 EMAIL_ALREADY_EXISTS)
  await t.test("15. Duplicate email returns 409 EMAIL_ALREADY_EXISTS", async () => {
    const app = await createTestApp();
    app.post("/test/auth/duplicate-email", async () => {
      throw new ConflictError("Email is already registered", ErrorCodes.EMAIL_ALREADY_EXISTS);
    });

    const res = await app.inject({
      method: "POST",
      url: "/test/auth/duplicate-email",
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 409);
    assert.equal(body.code, ErrorCodes.EMAIL_ALREADY_EXISTS);
    assert.equal(body.error, "ConflictError");
    await app.close();
  });

  // 16. Database unique constraint violation (409 RESOURCE_CONFLICT via Prisma P2002)
  await t.test("16. Prisma P2002 unique constraint mapped to 409 RESOURCE_CONFLICT", async () => {
    const app = await createTestApp();
    app.post("/test/prisma-unique", async () => {
      const err = new Error("Unique constraint failed on the fields: (`email`)");
      (err as any).name = "PrismaClientKnownRequestError";
      (err as any).code = "P2002";
      throw err;
    });

    const res = await app.inject({
      method: "POST",
      url: "/test/prisma-unique",
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 409);
    assert.equal(body.code, ErrorCodes.RESOURCE_CONFLICT);
    assert.equal(body.error, "ConflictError");
    assert.equal(body.stack, undefined);
    assert.equal(res.payload.includes("fields"), false);
    await app.close();
  });

  // 17. Malformed JSON (400 INVALID_REQUEST_BODY)
  await t.test("17. Malformed JSON returns 400 INVALID_REQUEST_BODY", async () => {
    const app = await createTestApp();
    app.post("/test/json-body", async (_req) => ({ ok: true }));

    const res = await app.inject({
      method: "POST",
      url: "/test/json-body",
      headers: { "content-type": "application/json" },
      payload: "{ invalid json ...",
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 400);
    assert.equal(body.code, ErrorCodes.INVALID_REQUEST_BODY);
    assert.equal(body.error, "ValidationError");
    await app.close();
  });

  // 18. Business logic error (422 BUSINESS_RULE_VIOLATION)
  await t.test("18. Business logic failure returns 422 BUSINESS_RULE_VIOLATION", async () => {
    const app = await createTestApp();
    app.post("/test/business-rule", async () => {
      throw new BusinessRuleError("Invalid state transition", ErrorCodes.BUSINESS_RULE_VIOLATION);
    });

    const res = await app.inject({
      method: "POST",
      url: "/test/business-rule",
    });

    assert.equal(res.statusCode, 422);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 422);
    assert.equal(body.code, ErrorCodes.BUSINESS_RULE_VIOLATION);
    assert.equal(body.error, "BusinessRuleError");
    await app.close();
  });

  // 19. Rate limit exceeded (429 TOO_MANY_REQUESTS)
  await t.test("19. Rate limit exceeded returns 429 TOO_MANY_REQUESTS", async () => {
    const app = await createTestApp();
    app.get("/test/rate-limited", async () => {
      const err = new Error("Rate limit exceeded");
      (err as any).statusCode = 429;
      (err as any).code = "FST_RATE_LIMIT";
      throw err;
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/rate-limited",
    });

    assert.equal(res.statusCode, 429);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 429);
    assert.equal(body.code, ErrorCodes.TOO_MANY_REQUESTS);
    assert.equal(body.error, "RateLimitError");
    await app.close();
  });

  // 20. Unexpected server error sanitization (500 INTERNAL_SERVER_ERROR)
  await t.test("20. Unexpected server error returns 500 without leaking SQL or passwords", async () => {
    const app = await createTestApp();
    app.get("/test/server-crash", async () => {
      throw new Error("SELECT password, secret FROM users WHERE id = 'abc' failed");
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/server-crash",
    });

    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 500);
    assert.equal(body.code, ErrorCodes.INTERNAL_SERVER_ERROR);
    assert.equal(body.error, "InternalServerError");
    assert.equal(body.message, "Internal server error occurred");
    assert.equal(body.stack, undefined);
    assert.equal(res.payload.includes("SELECT"), false);
    assert.equal(res.payload.includes("password"), false);
    await app.close();
  });

  // 21. Database connection failure (503 SERVICE_UNAVAILABLE via Prisma P1001)
  await t.test("21. Database connection failure returns 503 SERVICE_UNAVAILABLE", async () => {
    const app = await createTestApp();
    app.get("/test/db-down", async () => {
      const err = new Error("Can't reach database server at localhost:5432");
      (err as any).name = "PrismaClientInitializationError";
      (err as any).code = "P1001";
      throw err;
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/db-down",
    });

    assert.equal(res.statusCode, 503);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 503);
    assert.equal(body.code, ErrorCodes.SERVICE_UNAVAILABLE);
    assert.equal(body.error, "ServiceUnavailableError");
    assert.equal(body.message, "Database service is temporarily unavailable");
    assert.equal(res.payload.includes("5432"), false);
    await app.close();
  });

  // 22. Upstream service connection failure (502 UPSTREAM_SERVICE_ERROR)
  await t.test("22. Upstream network failure returns 502 UPSTREAM_SERVICE_ERROR", async () => {
    const app = await createTestApp();
    app.get("/test/upstream-down", async () => {
      const err = new Error("connect ECONNREFUSED 127.0.0.1:4002");
      (err as any).code = "ECONNREFUSED";
      throw err;
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/upstream-down",
    });

    assert.equal(res.statusCode, 502);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 502);
    assert.equal(body.code, ErrorCodes.UPSTREAM_SERVICE_ERROR);
    assert.equal(body.error, "BadGatewayError");
    assert.equal(body.stack, undefined);
    assert.equal(res.payload.includes("127.0.0.1:4002"), false);
    await app.close();
  });

  // 23. Upstream timeout (504 GATEWAY_TIMEOUT)
  await t.test("23. Upstream timeout returns 504 GATEWAY_TIMEOUT", async () => {
    const app = await createTestApp();
    app.get("/test/upstream-timeout", async () => {
      const err = new Error("request timed out");
      (err as any).code = "ETIMEDOUT";
      throw err;
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/upstream-timeout",
    });

    assert.equal(res.statusCode, 504);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 504);
    assert.equal(body.code, ErrorCodes.GATEWAY_TIMEOUT);
    assert.equal(body.error, "GatewayTimeoutError");
    await app.close();
  });

  // 24. Database generic failure (500 DATABASE_ERROR)
  await t.test("24. Unexpected database error returns 500 DATABASE_ERROR", async () => {
    const app = await createTestApp();
    app.get("/test/db-crash", async () => {
      throw new DatabaseError("Query execution crashed");
    });

    const res = await app.inject({
      method: "GET",
      url: "/test/db-crash",
    });

    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 500);
    assert.equal(body.code, ErrorCodes.DATABASE_ERROR);
    assert.equal(body.error, "DatabaseError");
    await app.close();
  });

  // 25. Actual HTTP status matches response statusCode in all scenarios
  await t.test("25. Actual HTTP status strictly matches response statusCode field", async () => {
    const errorScenarios = [
      { code: ErrorCodes.UNAUTHENTICATED, status: 401 },
      { code: ErrorCodes.FORBIDDEN, status: 403 },
      { code: ErrorCodes.ROUTE_NOT_FOUND, status: 404 },
      { code: ErrorCodes.VALIDATION_ERROR, status: 400 },
      { code: ErrorCodes.RESOURCE_CONFLICT, status: 409 },
      { code: ErrorCodes.BUSINESS_RULE_VIOLATION, status: 422 },
      { code: ErrorCodes.TOO_MANY_REQUESTS, status: 429 },
      { code: ErrorCodes.INTERNAL_SERVER_ERROR, status: 500 },
      { code: ErrorCodes.UPSTREAM_SERVICE_ERROR, status: 502 },
      { code: ErrorCodes.SERVICE_UNAVAILABLE, status: 503 },
      { code: ErrorCodes.GATEWAY_TIMEOUT, status: 504 },
    ];

    for (const scenario of errorScenarios) {
      const app = await createTestApp();
      app.get(`/test/status-${scenario.status}`, async () => {
        throw new AppError(scenario.status, scenario.code, "Test error message");
      });

      const res = await app.inject({
        method: "GET",
        url: `/test/status-${scenario.status}`,
      });

      assert.equal(res.statusCode, scenario.status);
      const body = JSON.parse(res.payload);
      assert.equal(body.statusCode, scenario.status);
      assert.equal(body.code, scenario.code);
      assert.ok(body.endpoint);
      assert.ok(body.timestamp);
      assert.ok(body.error);
      await app.close();
    }
  });
});
