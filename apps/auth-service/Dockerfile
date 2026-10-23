FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@zyvo/auth-service... build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 4001
CMD ["pnpm", "--filter", "@zyvo/auth-service", "start"]
