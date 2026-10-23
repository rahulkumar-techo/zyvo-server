import "dotenv/config";

export interface ServiceConfig {
  auth: string;
  users: string;
  drivers: string;
  pricing: string;
  rides: string;
  payments: string;
  notifications: string;
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  jwtSecret: string;
  services: ServiceConfig;
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  cors: {
    origin: boolean | string[];
    credentials: boolean;
  };
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "zyvo-super-secret-jwt-key",
  services: {
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
    users: process.env.USERS_SERVICE_URL || "http://localhost:4002",
    drivers: process.env.DRIVERS_SERVICE_URL || "http://localhost:4003",
    pricing: process.env.PRICING_SERVICE_URL || "http://localhost:4004",
    rides: process.env.RIDES_SERVICE_URL || "http://localhost:4005",
    payments: process.env.PAYMENTS_SERVICE_URL || "http://localhost:4006",
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:4007",
  },
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  },
};
