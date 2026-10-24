import type { FastifyReply } from "fastify";

export interface ApiResponseOptions {
  statusCode?: number;
  message?: string;
  data?: any;
  [key: string]: any;
}

// Standard unified API response formatter
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

  // Merge data payload if present
  if (options.data !== undefined) {
    if (typeof options.data === "object" && !Array.isArray(options.data) && options.data !== null) {
      Object.assign(response, options.data);
    } else {
      response.data = options.data;
    }
  }

  // Copy any extra top-level fields (e.g. user, tokens)
  for (const [key, value] of Object.entries(options)) {
    if (key !== "statusCode" && key !== "message" && key !== "data") {
      response[key] = value;
    }
  }

  response.timestamp = new Date().toISOString();

  if (isDev) {
    response.endpoint = `${reply.request.method} ${reply.request.url}`;
  }

  return reply.status(statusCode).send(response);
}
