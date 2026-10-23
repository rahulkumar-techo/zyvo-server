import "dotenv/config";

export interface AuthConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  jwtSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiryDays: number;
  rateLimit: {
    max: number;
    authMax: number;
    timeWindow: string;
  };
}

export const config: AuthConfig = {
  port: Number(process.env.PORT) || 4001,
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "zyvo-super-secret-jwt-key",
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshTokenExpiryDays: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 30,
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 60,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  },
};
