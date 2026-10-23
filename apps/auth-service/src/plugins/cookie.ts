import type { FastifyInstance, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";

export async function registerCookiePlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "zyvo-cookie-secret-key-32-chars-long",
  });
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const isProduction = process.env.NODE_ENV === "production";

  // Access token cookie (15 minutes)
  reply.setCookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  // Refresh token cookie (30 days)
  reply.setCookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie("accessToken", { path: "/" });
  reply.clearCookie("refreshToken", { path: "/" });
}
