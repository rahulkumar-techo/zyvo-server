import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.js";
import { AppError, ErrorCodes } from "../schemas/index.js";

test("API Gateway health check returns ok", async () => {
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(response.statusCode, 200);
  const data = JSON.parse(response.payload);
  assert.equal(data.status, "ok");
  assert.equal(data.service, "api-gateway");
  assert.ok(data.upstreams);

  await app.close();
});

test("API Gateway returns 404 with ROUTE_NOT_FOUND code", async () => {
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: "/api/unknown-endpoint-path",
  });

  assert.equal(response.statusCode, 404);
  const data = JSON.parse(response.payload);
  assert.equal(data.code, ErrorCodes.ROUTE_NOT_FOUND);
  assert.equal(data.statusCode, 404);
  assert.equal(data.error, "NotFoundError");
  assert.equal(data.message, "Route not found");
  assert.equal(data.endpoint, "GET /api/unknown-endpoint-path");
  assert.ok(data.timestamp);
  assert.equal(data.stack, undefined);

  await app.close();
});

test("API Gateway sanitizes 500 internal errors and hides stack traces", async () => {
  const app = await buildApp();

  // Register a route that throws an internal error leaking sensitive host/sql info
  app.get("/test/crash", async () => {
    throw new Error("SELECT * FROM users WHERE password = '123' at http://localhost:4001");
  });

  const response = await app.inject({
    method: "GET",
    url: "/test/crash",
  });

  assert.equal(response.statusCode, 500);
  const data = JSON.parse(response.payload);
  assert.equal(data.code, ErrorCodes.INTERNAL_SERVER_ERROR);
  assert.equal(data.statusCode, 500);
  assert.equal(data.error, "InternalServerError");
  assert.equal(data.message, "Internal server error occurred");
  assert.equal(data.endpoint, "GET /test/crash");
  assert.ok(data.timestamp);
  assert.equal(data.stack, undefined);
  assert.equal(response.payload.includes("password"), false);
  assert.equal(response.payload.includes("SELECT"), false);
  assert.equal(response.payload.includes("localhost:4001"), false);

  await app.close();
});

test("API Gateway preserves domain error codes on AppError", async () => {
  const app = await buildApp();

  app.get("/test/ride-conflict", async () => {
    throw new AppError(409, ErrorCodes.RIDE_STATE_CONFLICT, "Invalid state transition");
  });

  const response = await app.inject({
    method: "GET",
    url: "/test/ride-conflict",
  });

  assert.equal(response.statusCode, 409);
  const data = JSON.parse(response.payload);
  assert.equal(data.code, ErrorCodes.RIDE_STATE_CONFLICT);
  assert.equal(data.statusCode, 409);
  assert.equal(data.error, "ConflictError");
  assert.equal(data.message, "Invalid state transition");
  assert.equal(data.endpoint, "GET /test/ride-conflict");
  assert.ok(data.timestamp);
  assert.equal(data.stack, undefined);

  await app.close();
});
