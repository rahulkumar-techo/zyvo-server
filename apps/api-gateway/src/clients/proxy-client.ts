import type { FastifyInstance } from "fastify";
import proxy from "@fastify/http-proxy";

export interface ProxyRouteOptions {
  upstream: string;
  prefix: string;
  rewritePrefix?: string;
}

// Register reverse proxy route with sanitized headers and request id forwarding
export async function registerProxyRoute(
  app: FastifyInstance,
  options: ProxyRouteOptions,
): Promise<void> {
  await app.register(proxy, {
    upstream: options.upstream,
    prefix: options.prefix,
    rewritePrefix: options.rewritePrefix ?? options.prefix,
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        const { expect, ...sanitizedHeaders } = headers;
        if (req.requestId) {
          sanitizedHeaders["x-request-id"] = req.requestId;
        }
        return sanitizedHeaders;
      },
    },
  });
}
