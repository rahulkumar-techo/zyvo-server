# Zyvo Engineering & Architecture Rules

Guiding principles, engineering standards, and sequential delivery milestones for the Zyvo microservices platform.

---

## 1. Core Architectural Tenets

1. **Single Entry Point (API Gateway):**
   Clients interact strictly through the API Gateway (`:4000`). Internal service ports (`:4001`, `:4002`, etc.) are isolated from public ingress.
2. **Local Token Verification:**
   The Gateway validates incoming JWT access tokens locally using shared secrets without making network calls to Auth Service on every request.
3. **Strict Domain Ownership:**
   - **Trip Service:** Owns ride state machine transitions.
   - **Pricing Service:** Owns fare calculation and surge rules.
   - **Payment Service:** Owns transaction states and payment provider integrations.
   - **Wallet Service:** Owns immutable double-entry ledger bookkeeping.
4. **No Cross-Service Database Writes:**
   Services communicate through REST APIs and asynchronous domain events. No service writes to another service's tables.
5. **Database as Single Source of Truth:**
   Redis is used purely for ephemeral data (driver GPS coordinates, cache, rate limits, short-lived locks). Persistent business state must always reside in PostgreSQL.
6. **Async Side Effects via Message Broker:**
   Notifications, analytics, driver payout triggers, and rating updates must be dispatched asynchronously to avoid blocking user critical paths.

---

## 2. Implementation Roadmap

| Phase | Milestone | Focus Areas | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Monorepo Foundation** | Turborepo, pnpm workspaces, TypeScript configs, shared logger, Prisma 7 multi-schema data layer. | Done |
| **02** | **Gateway & Auth Service** | Reverse proxy, register, login, one-time refresh token rotation, HttpOnly cookies, scrypt password hashing. | Done |
| **03** | **User & Driver Services** | Passenger profiles, emergency contacts, driver KYC, vehicle verification, and availability states. | Next |
| **04** | **Pricing & Geolocation** | Fare estimation algorithm, surge zone mapping, Redis Geospatial (`GEOADD`/`GEOSEARCH`). | Pending |
| **05** | **Trip & Matching Engine** | Concurrency-safe driver dispatch, 15-second acceptance countdowns, ride state machine. | Pending |
| **06** | **Realtime Gateway** | Fastify WebSocket streaming for live GPS coordinates and ride status sync. | Pending |
| **07** | **Payment & Wallet Ledger** | Razorpay/Stripe webhooks, pre-authorization holds, integer paise bookkeeping, refund processing. | Pending |
| **08** | **Ratings & Notifications** | Post-trip passenger/driver reviews, push notification dispatchers (FCM/APNs), retries. | Pending |
| **09** | **Production Hardening** | K6 load testing, distributed tracing (OpenTelemetry), health checks, automated backups. | Pending |

---

## 3. Data & Coding Standards

* **Currency:** Always use integer **paise** (`₹1 = 100 paise`). Floating-point types are strictly forbidden for monetary calculations.
* **Timestamps:** Timestamps must be recorded in UTC as `timestamptz(6)`.
* **UUIDs:** Primary keys for all business entities must use `UUIDv4`.
* **Foreign Keys:** Use database-level constraints *only* within a domain schema. Across service boundaries, store plain UUID references to prevent distributed deadlocks and deployment coupling.

---

## 4. Centralized API Error Handling Standards

* **Standard Error Contract:** All services return `{ code, error, message, statusCode, timestamp, endpoint, details? }`.
* **Plugin Reuse:** Register `@zyvo/common`'s `registerErrorHandlerPlugin(app)`. Never create custom error handlers in services.
* **Semantic Status Codes:**
  - `401 Unauthorized`: For authentication failures (`UNAUTHENTICATED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `SESSION_EXPIRED`).
  - `403 Forbidden`: For authorization/policy denial (`INSUFFICIENT_PERMISSIONS`, `ACCOUNT_DEACTIVATED`, `ACCOUNT_SUSPENDED`).
  - `404 Not Found`: For missing routes (`ROUTE_NOT_FOUND`) and missing database entities (`USER_PROFILE_NOT_FOUND`, `RESOURCE_NOT_FOUND`).
  - `400 Bad Request`: For validation and malformed request bodies (`VALIDATION_ERROR`, `INVALID_REQUEST_BODY`).
  - `409 Conflict`: For duplicates and state conflicts (`EMAIL_ALREADY_EXISTS`, `PHONE_ALREADY_EXISTS`, `RESOURCE_CONFLICT`).
  - `422 Unprocessable Content`: For domain/business rule violations (`BUSINESS_RULE_VIOLATION`).
  - `429 Too Many Requests`: For rate limits (`TOO_MANY_REQUESTS`, `LOGIN_RATE_LIMIT_EXCEEDED`).
  - `500/502/503/504`: For unexpected server, database, and infrastructure errors (`INTERNAL_SERVER_ERROR`, `DATABASE_ERROR`, `UPSTREAM_SERVICE_ERROR`, `SERVICE_UNAVAILABLE`, `GATEWAY_TIMEOUT`).
* **Decoupled Architecture:** `@zyvo/common` has zero direct dependencies on `@zyvo/database` or `@prisma/client`.
* **Zero Sensitive Leaks:** Database statements, stack traces, and credentials are never exposed in API responses.