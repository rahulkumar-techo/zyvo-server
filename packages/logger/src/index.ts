import pino, { type Logger, type LoggerOptions } from "pino";

export interface LoggerConfig extends LoggerOptions {
  serviceName?: string;
}

export function createLogger(serviceName: string, options: LoggerOptions = {}): Logger {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info",
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    ...options,
  });
}

export type { Logger };
