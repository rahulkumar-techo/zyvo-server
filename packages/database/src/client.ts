import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseConfig } from "./config.js";

const { Pool } = pg;

export interface ClientOptions {
  connectionString?: string;
  logQueries?: boolean;
}

// Create configured PrismaClient instance using PrismaPg adapter
export function createPrismaClient(options: ClientOptions = {}): PrismaClient {
  const dbConfig = getDatabaseConfig();
  const connectionString = options.connectionString || dbConfig.url || process.env.DATABASE_URL;

  const isSslRequired = connectionString?.includes("sslmode=require") || connectionString?.includes("cloud");

  const pool = new Pool({
    connectionString,
    min: 2,
    max: dbConfig.maxConnections,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);
  const isDev = process.env.NODE_ENV !== "production";
  const shouldLog = options.logQueries ?? isDev;

  const client = new PrismaClient({
    adapter,
    log: shouldLog
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : ["error", "warn"],
  });

  if (shouldLog) {
    (client as any).$on("query", (e: { query: string; duration: number }) => {
      console.log(`[DB Query Duration] ${e.duration}ms | ${e.query.slice(0, 100)}`);
    });
  }

  return client;
}

// Shared default client instance
export const prisma = createPrismaClient();

// Strip credentials from database URL for secure logging
export function sanitizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "******";
    }
    return parsed.toString();
  } catch {
    return "[INVALID_DB_URL]";
  }
}
