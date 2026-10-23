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