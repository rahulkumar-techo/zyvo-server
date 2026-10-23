# Zyvo Security & Reliability Standards

Security controls, operational safeguards, and vulnerability reporting procedures.

---

## 1. Security & Reliability Matrix

| Domain | Standard Requirement | Implementation Details |
| :--- | :--- | :--- |
| **Authentication** | Strong cryptographic credentials & short-lived tokens | Argon2id/Scrypt password hashing, 15m JWT access tokens, one-time refresh token rotation. |
| **Token Delivery** | Web and Native Mobile protection | Dual-delivery: HttpOnly, SameSite=Lax cookies for Web, Bearer Authorization headers for Native Apps. |
| **Authorization** | Role-based Access Control (RBAC) & Scopes | Endpoint policy enforcement, strict resource ownership checks (`userId` verification). |
| **Service Identity** | Private Network Isolation | Services communicate within internal Docker network; only API Gateway is exposed publicly. |
| **Input Validation** | Strict Schema Validation | Fastify JSON Schema / AJV validation on all incoming request bodies and query parameters. |
| **Rate Limiting** | DDoS & Brute-force mitigation | Tiered rate limits (`@fastify/rate-limit`): Strict limits on `/auth/login` (10 req/min) and global IP limits. |
| **Idempotency** | Duplicate transaction prevention | `Idempotency-Key` headers enforced on trip creations, payments, and wallet ledger updates. |
| **Database Security** | Connection Pooling & Multi-Schema Isolation | SSL required, pooled connections, domain-isolated schemas, zero cross-domain write privileges. |
| **Memory Caching** | Ephemeral State Guardrails | Strict TTL policies on Redis keys, LRU eviction, and distributed lock safeguards. |
| **Observability** | Redacted Audit Logging | Sensitive tokens (`Bearer ...`, passwords, API keys) are masked before logs are written. |
| **Secrets Management**| Environment Separation | Secrets loaded via environment variables; `.env` files are strictly excluded from version control. |

---

## 2. Token Security Lifecycle

1. **Access Token:**
   - Lifetime: **15 minutes**.
   - Contains: `userId`, `role`, `sessionId`.
   - Verified statelessly via HMAC SHA-256.
2. **Refresh Token:**
   - Lifetime: **30 days**.
   - Stored in database as an irreversible SHA-256 hash.
   - **One-time rotation:** Once a refresh token is used, it is revoked and replaced with a newly generated pair. Replaying an old token results in immediate revocation of all related sessions.

---

## 3. Reporting Vulnerabilities

If you discover a security vulnerability in Zyvo platform, please report it via private disclosure rather than opening a public GitHub issue:

* **Email:** `security@zyvo.com`
* **Response Window:** Acknowledgement within 24 hours with an initial assessment within 72 hours.