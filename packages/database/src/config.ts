import process from "node:process";

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function getDatabaseConfig(envVarName: string = "DATABASE_URL"): DatabaseConfig {
  const isProd = process.env.NODE_ENV === "production";
  const url = isProd
    ? process.env.DATABASE_URL_PROD || process.env[envVarName] || ""
    : process.env.DATABASE_URL_DEV || process.env[envVarName] || "";

  return {
    url,
    maxConnections: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 300000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 15000,
  };
}

// Strip password from database URL for secure logging
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
