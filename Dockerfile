FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
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

# 1. Build logger (no external deps needed)
RUN pnpm --filter @zyvo/logger build

# 2. Generate Prisma client + build database package
#    Docker network is unrestricted so engines download fine here
RUN pnpm --filter @zyvo/database db:generate
RUN pnpm --filter @zyvo/database build

# ── Auth Service image ───────────────────────────────────────────────────────
FROM base AS auth-service
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/packages            ./packages
COPY --from=builder /app/apps/auth-service   ./apps/auth-service
WORKDIR /app/apps/auth-service
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "--import", "tsx/esm", "src/server.ts"]

# ── API Gateway image ────────────────────────────────────────────────────────
FROM base AS api-gateway
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/packages            ./packages
COPY --from=builder /app/apps/api-gateway    ./apps/api-gateway
WORKDIR /app/apps/api-gateway
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "src/server.ts"]
