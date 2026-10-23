import type { FastifyReply } from "fastify";

export interface ApiResponseOptions {
  statusCode?: number;
  message?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Standard reusable API response handler.
 * - Formats success, statusCode, message, data, and timestamp.
 * - Automatically mentions the request endpoint in development mode.
 */
export function sendResponse(
  reply: FastifyReply,
  options: ApiResponseOptions = {},
): FastifyReply {
  const statusCode = options.statusCode ?? 200;
  const isDev = process.env.NODE_ENV !== "production";

  const response: Record<string, any> = {
    success: statusCode >= 200 && statusCode < 300,
    statusCode,
    ...(options.message ? { message: options.message } : {}),
  };

  // Handle data payload if provided
  if (options.data !== undefined) {
    if (typeof options.data === "object" && !Array.isArray(options.data) && options.data !== null) {
      Object.assign(response, options.data);
    } else {
      response.data = options.data;
    }
  }

  // Copy custom top-level fields (e.g., user, tokens, etc.)
  for (const [key, value] of Object.entries(options)) {
    if (key !== "statusCode" && key !== "message" && key !== "data") {
      response[key] = value;
    }
  }

  response.timestamp = new Date().toISOString();

  // Mention endpoint in development mode
  if (isDev) {
    const method = reply.request.method || "GET";
    const url = reply.request.url || "";
    response.endpoint = `${method} ${url}`;
  }

  return reply.status(statusCode).send(response);
}
