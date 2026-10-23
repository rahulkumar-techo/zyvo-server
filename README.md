# Zyvo Server

High-performance, event-driven ride-hailing backend platform built with **Fastify**, **TypeScript**, **Prisma 7**, and **PostgreSQL** in a modular **Turborepo** monorepo.

---

## 📁 Monorepo Structure

```text
zyvo-server/
├── apps/
│   ├── api-gateway/         # Reverse proxy (:4000), routing, rate limiting, and CORS
│   └── auth-service/        # Authentication (:4001), sessions, JWT & token rotation
│
├── packages/
│   ├── database/            # Central Prisma 7 multi-schema data layer & pg connection pool
│   ├── logger/              # Pino-based structured logging with sanitization
│   └── typescript-config/   # Shared tsconfig base presets
│
├── ARCHITECTURE.md          # Visual architecture diagrams and request sequence flows
├── RULES.md                 # Architectural rules and implementation roadmap
├── SECURITY.md              # Security matrix, token lifecycle, and policies
├── pnpm-workspace.yaml      # Monorepo workspace configuration
└── turbo.json               # Pipeline build and task caching orchestration
```

---

## ⚡ Tech Stack

* **Runtime:** Node.js v20+ / v24
* **Framework:** [Fastify v5](https://fastify.dev/) (High-throughput, low-overhead HTTP engine)
* **Package Manager:** [pnpm](https://pnpm.io/)
* **Build System:** [Turborepo](https://turbo.build/)
* **ORM:** [Prisma v7](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapters
* **Databases:** PostgreSQL 16+ (Multi-schema domain stores), Redis (Geospatial & Cache)
* **Authentication:** JWT + HttpOnly Cookies + One-Time Refresh Token Rotation + Scrypt

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js** v20.x or higher
* **pnpm** v9 or higher (`npm install -g pnpm`)
* **PostgreSQL** running locally on port `5432`

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
# Local Development (Instant ~1ms response)
DATABASE_URL="postgresql://postgres:root@localhost:5432/zyvo"
DATABASE_URL_DEV="postgresql://postgres:root@localhost:5432/zyvo"

# Cloud Production Database
DATABASE_URL_PROD="postgresql://postgres:<password>@<cloud-host>/zyvo?sslmode=require"
```

### 4. Sync Database Schema
Push all 10 domain schemas to your PostgreSQL database:
```bash
pnpm --filter @zyvo/database db:push
```

### 5. Run Development Servers
Start all applications concurrently:
```bash
pnpm dev
```

* **API Gateway:** `http://localhost:4000`
* **Auth Service:** `http://localhost:4001` (internal upstream)

---

## 🧪 Running Tests & Type Checks

```bash
# Run type checks across all packages
pnpm check-types

# Run tests
pnpm test

# Run build
pnpm build
```

---

## 📖 Key Endpoints (Exposed via Gateway `:4000`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a new passenger with scrypt password hash |
| `POST` | `/api/v1/auth/login` | Public | Login with phone/email and receive Bearer token + Cookies |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token (reads from body or HttpOnly cookie) |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke current session and clear cookies |
| `POST` | `/api/v1/auth/logout-all`| Authenticated | Revoke all active sessions for current user |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current authenticated user profile |

---

## 📚 Documentation Links

* [ARCHITECTURE.md](./ARCHITECTURE.md) — Node diagrams and sequence workflows.
* [RULES.md](./RULES.md) — Architectural tenets and step-by-step roadmap.
* [SECURITY.md](./SECURITY.md) — Security standards and token management lifecycle.
