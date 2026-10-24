import "dotenv/config";

export interface UserConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  jwtSecret: string;
  rateLimit: {
    max: number;
    timeWindow: string;
  };
}

export const config: UserConfig = {
  port: Number(process.env.PORT) || 4002,
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "zyvo-super-secret-jwt-key",
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  },
};
