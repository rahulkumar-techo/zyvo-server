import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.js";
import { authRepository } from "../storage/index.js";

test("Auth Service - Complete Endpoint Workflow", async (t) => {
  const app = await buildApp();
  await authRepository.clear();

  t.after(async () => {
    await app.close();
  });

  let accessToken = "";
  let refreshToken = "";

  await t.test("1. POST /auth/register - Successfully registers user without exposing password hash", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Rahul Sharma",
        phone: "+919876543210",
        password: "securepassword123",
        email: "rahul@zyvo.com",
      },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.equal(body.message, "User registered successfully");
    assert.equal(body.user.name, "Rahul Sharma");
    assert.equal(body.user.phone, "+919876543210");
    assert.equal(body.user.email, "rahul@zyvo.com");
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(body.user.password, undefined);
    assert.ok(body.user.id);
  });

  await t.test("1b. POST /auth/register - Rejects registration when phone already exists", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Another User",
        phone: "+919876543210",
        password: "anotherpassword123",
      },
    });

    assert.equal(response.statusCode, 409);
    const body = JSON.parse(response.payload);
    assert.equal(body.code, "CONFLICT");
  });

  await t.test("1c. POST /auth/register - Rejects registration with missing required inputs", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Missing Password",
        phone: "+919999999999",
      },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.equal(body.code, "VALIDATION_ERROR");
  });

  await t.test("2. POST /auth/login - Successfully logs in with phone and issues tokens", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        phoneOrEmail: "+919876543210",
        password: "securepassword123",
        deviceId: "dev_phone_123",
        deviceName: "iPhone 15",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(body.user.name, "Rahul Sharma");

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  await t.test("2b. POST /auth/login - Rejects invalid credentials with 401 UNAUTHENTICATED", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        phoneOrEmail: "+919876543210",
        password: "wrongpassword",
      },
    });

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.payload);
    assert.equal(body.code, "UNAUTHENTICATED");
  });

  await t.test("3. GET /auth/me - Returns authenticated user with valid Bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.user.name, "Rahul Sharma");
    assert.equal(body.user.phone, "+919876543210");
    assert.equal(body.user.passwordHash, undefined);
  });

  await t.test("3b. GET /auth/me - Rejects requests without Bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.payload);
    assert.equal(body.code, "UNAUTHENTICATED");
  });

  let rotatedRefreshToken = "";

  await t.test("4. POST /auth/refresh - Rotates refresh token and returns new access token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken,
        deviceId: "dev_phone_123",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.notEqual(body.refreshToken, refreshToken);

    rotatedRefreshToken = body.refreshToken;
    accessToken = body.accessToken;
  });

  await t.test("4b. POST /auth/refresh - Rejects old rotated refresh token (one-time use rotation)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken, // old token
      },
    });

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.payload);
    assert.equal(body.code, "UNAUTHENTICATED");
  });

  await t.test("5. POST /auth/logout - Invalidates current session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        refreshToken: rotatedRefreshToken,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.message, "Logged out successfully");

    // Attempting to refresh with the logged out token should fail
    const refreshAttempt = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken: rotatedRefreshToken,
      },
    });

    assert.equal(refreshAttempt.statusCode, 401);
  });

  await t.test("6. POST /auth/logout-all - Invalidates all sessions for current user", async () => {
    // Login to create a fresh session
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        phoneOrEmail: "rahul@zyvo.com",
        password: "securepassword123",
      },
    });
    const { accessToken: newAccess, refreshToken: newRefresh } = JSON.parse(loginRes.payload);

    const logoutAllRes = await app.inject({
      method: "POST",
      url: "/auth/logout-all",
      headers: {
        authorization: `Bearer ${newAccess}`,
      },
    });

    assert.equal(logoutAllRes.statusCode, 200);
    const body = JSON.parse(logoutAllRes.payload);
    assert.equal(body.message, "All sessions invalidated successfully");
    assert.ok(body.sessionsInvalidated >= 1);

    // Refresh should fail
    const refreshAttempt = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken: newRefresh,
      },
    });
    assert.equal(refreshAttempt.statusCode, 401);
  });
});
