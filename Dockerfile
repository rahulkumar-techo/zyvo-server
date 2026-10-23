FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
WORKDIR /app

# ── Install all dependencies ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/logger/package.json              ./packages/logger/
COPY packages/database/package.json            ./packages/database/
COPY apps/api-gateway/package.json             ./apps/api-gateway/
COPY apps/auth-service/package.json            ./apps/auth-service/
RUN pnpm install --frozen-lockfile

# ── Build all packages ───────────────────────────────────────────────────────
FROM deps AS builder
COPY . .

# 1. Build logger
RUN pnpm --filter @zyvo/logger build

# 2. Generate Prisma client (engines download works in Docker build)
RUN pnpm --filter @zyvo/database db:generate

# 3. Build database package
RUN pnpm --filter @zyvo/database build

# 4. Build apps
RUN pnpm --filter @zyvo/auth-service build 2>/dev/null || true
RUN pnpm --filter @zyvo/api-gateway build 2>/dev/null || true

# ── Auth Service image ───────────────────────────────────────────────────────
FROM base AS auth-service
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/packages            ./packages
COPY --from=builder /app/apps/auth-service   ./apps/auth-service
WORKDIR /app/apps/auth-service
ENV NODE_ENV=production
EXPOSE 4001
CMD ["/app/node_modules/.bin/tsx", "src/server.ts"]

# ── API Gateway image ────────────────────────────────────────────────────────
FROM base AS api-gateway
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/packages            ./packages
COPY --from=builder /app/apps/api-gateway    ./apps/api-gateway
WORKDIR /app/apps/api-gateway
ENV NODE_ENV=production
EXPOSE 4000
CMD ["/app/node_modules/.bin/tsx", "src/server.ts"]
