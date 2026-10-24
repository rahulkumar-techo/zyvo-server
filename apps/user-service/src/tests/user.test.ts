process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.js";
import { userRepository } from "../storage/index.js";

test("User Service - Complete 5 Endpoints Workflow", async (t) => {
  const app = await buildApp();
  await userRepository.clear();

  t.after(async () => {
    await app.close();
  });

  // Seed test users
  const passengerUser = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Passenger User",
    phone: "+919999900001",
    email: "passenger@zyvo.com",
    role: "passenger",
    status: "active",
  };

  const driverUser = {
    id: "22222222-2222-4222-a222-222222222222",
    name: "Driver User",
    phone: "+919999900002",
    email: "driver@zyvo.com",
    role: "driver",
    status: "active",
  };

  const otherUser = {
    id: "33333333-3333-4333-a333-333333333333",
    name: "Existing Person",
    phone: "+919999988888",
    email: "existing@zyvo.com",
    role: "passenger",
    status: "active",
  };

  const deactivatedUser = {
    id: "55555555-5555-5555-a555-555555555555",
    name: "Deactivated User",
    phone: "+919999955555",
    email: "deactivated@zyvo.com",
    role: "passenger",
    status: "deactivated",
  };

  await userRepository.createUser(passengerUser);
  await userRepository.createUser(driverUser);
  await userRepository.createUser(otherUser);
  await userRepository.createUser(deactivatedUser);

  // Generate tokens
  const passengerToken = app.jwt.sign({
    userId: passengerUser.id,
    role: "passenger",
    sessionId: "sess-1",
  });

  const driverToken = app.jwt.sign({
    userId: driverUser.id,
    role: "driver",
    sessionId: "sess-2",
  });

  const guestToken = app.jwt.sign({
    userId: "44444444-4444-4444-a444-444444444444",
    role: "guest",
    sessionId: "sess-3",
  });

  const deactivatedToken = app.jwt.sign({
    userId: deactivatedUser.id,
    role: "passenger",
    sessionId: "sess-4",
  });

  const missingUserToken = app.jwt.sign({
    userId: "99999999-9999-9999-a999-999999999999",
    role: "passenger",
    sessionId: "sess-5",
  });

  // ── 1. GET /users/me ──────────────────────────────────────────────────────────
  await t.test("1a. GET /users/me - Rejects without auth token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test("1b. GET /users/me - Passenger accesses profile successfully", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.user.id, passengerUser.id);
    assert.equal(body.user.name, "Passenger User");
    assert.equal(body.user.role, "passenger");
    assert.equal(body.user.phone, passengerUser.phone);
  });

  await t.test("1c. GET /users/me - Driver accesses profile successfully", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${driverToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.user.id, driverUser.id);
    assert.equal(body.user.role, "driver");
  });

  await t.test("1d. GET /users/me - Rejects unauthorized role with 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, "INSUFFICIENT_PERMISSIONS");
    assert.equal(body.error, "AuthorizationError");
    assert.ok(body.endpoint);
    assert.ok(body.timestamp);
  });

  await t.test("1e. GET /users/me - Deactivated user returns 403 Forbidden", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${deactivatedToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, "ACCOUNT_DEACTIVATED");
    assert.equal(body.error, "AuthorizationError");
  });

  await t.test("1f. GET /users/me - User profile not found in database returns 404 Not Found", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${missingUserToken}` },
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 404);
    assert.equal(body.code, "USER_PROFILE_NOT_FOUND");
    assert.equal(body.error, "NotFoundError");
  });

  // ── 2. PATCH /users/me ────────────────────────────────────────────────────────
  await t.test("2a. PATCH /users/me - Rejects if no fields provided", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {},
    });

    assert.equal(res.statusCode, 400);
  });

  await t.test("2b. PATCH /users/me - Updates name, avatarUrl, preferredLanguage", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        name: "Rahul Kumar",
        avatarUrl: "https://example.com/avatar.png",
        preferredLanguage: "hi",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.user.name, "Rahul Kumar");
    assert.equal(body.user.avatarUrl, "https://example.com/avatar.png");
    assert.equal(body.user.preferredLanguage, "hi");
  });

  await t.test("2c. PATCH /users/me - Rejects conflicting duplicate email", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        email: "existing@zyvo.com",
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 409);
    assert.equal(body.code, "EMAIL_ALREADY_EXISTS");
    assert.equal(body.error, "ConflictError");
  });

  // ── 3. PATCH /users/me/phone ──────────────────────────────────────────────────
  await t.test("3a. PATCH /users/me/phone - Rejects missing required inputs", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me/phone",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        newPhone: "+919999912345",
      },
    });

    assert.equal(res.statusCode, 400);
  });

  await t.test("3b. PATCH /users/me/phone - Rejects invalid verification code", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me/phone",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        newPhone: "+919999912345",
        verificationCode: "000000",
      },
    });

    assert.equal(res.statusCode, 422);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, "BUSINESS_RULE_VIOLATION");
  });

  await t.test("3c. PATCH /users/me/phone - Successfully updates phone with valid verification", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me/phone",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        newPhone: "+919999912345",
        verificationCode: "123456",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.user.phone, "+919999912345");
    assert.equal(body.user.isPhoneVerified, true);
  });

  await t.test("3d. PATCH /users/me/phone - Rejects duplicate existing phone number", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/users/me/phone",
      headers: { authorization: `Bearer ${driverToken}` },
      payload: {
        newPhone: "+919999912345", // Taken by passenger now
        verificationCode: "123456",
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 409);
    assert.equal(body.code, "PHONE_ALREADY_EXISTS");
    assert.equal(body.error, "ConflictError");
  });

  // ── 4. GET /users/me/consents ─────────────────────────────────────────────────
  await t.test("4a. GET /users/me/consents - Returns user consents list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me/consents",
      headers: { authorization: `Bearer ${driverToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.consents));
    assert.ok(body.consents.some((c: any) => c.consentType === "terms_of_service"));
    assert.ok(body.consents.some((c: any) => c.consentType === "privacy_policy"));
    assert.ok(body.consents.some((c: any) => c.consentType === "location_tracking"));
  });

  // ── 5. DELETE /users/me ───────────────────────────────────────────────────────
  await t.test("5a. DELETE /users/me - Rejects without step-up confirmation", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        confirmation: false,
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 400);
    assert.equal(body.code, "VALIDATION_ERROR");
  });

  await t.test("5b. DELETE /users/me - Deletes user with confirmation and reason", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
      payload: {
        confirmation: true,
        reason: "Moving to a different city",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes("deleted"));
  });

  await t.test("5c. GET /users/me - Returns 403 Forbidden after deletion", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${passengerToken}` },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.statusCode, 403);
    assert.equal(body.code, "ACCOUNT_DEACTIVATED");
    assert.equal(body.error, "AuthorizationError");
  });
});

