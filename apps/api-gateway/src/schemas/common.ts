import type { ErrorCode } from "./errors.js";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  code: ErrorCode;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: unknown;
}

export interface HealthResponse {
  status: string;
  service: string;
  upstreams: Record<string, string>;
  timestamp: string;
}
