import type { FastifyInstance } from "fastify";
import {
  registerValidationSchema,
  loginValidationSchema,
  refreshValidationSchema,
  logoutValidationSchema,
  AppError,
  ErrorCodes,
  type RegisterDto,
  type LoginDto,
  type RefreshDto,
  type LogoutDto,
} from "../schemas/index.js";
import { authService } from "../services/index.js";
import { authenticate } from "../middleware/index.js";
import { authRateLimitConfig } from "../plugins/rate-limit.js";
import { setAuthCookies, clearAuthCookies } from "../plugins/cookie.js";
import { sendResponse } from "../utils/index.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // 1. POST /auth/register (Public)
  app.post<{ Body: RegisterDto }>(
    "/auth/register",
    { schema: registerValidationSchema },
    async (request, reply) => {
      const user = await authService.register(request.body);
      return sendResponse(reply, {
        statusCode: 201,
        message: "User registered successfully",
        user,
      });
    },
  );

  // 2. POST /auth/login (Public, Rate Limited)
  app.post<{ Body: LoginDto }>(
    "/auth/login",
    {
      schema: loginValidationSchema,
      ...authRateLimitConfig,
    },
    async (request, reply) => {
      const authResponse = await authService.login(app, request.body);

      // Set cookies for web clients
      setAuthCookies(reply, authResponse);

      // Also return tokens in body for mobile / API clients using Bearer tokens
      return sendResponse(reply, {
        message: "Login successful",
        ...authResponse,
      });
    },
  );

  const ensureBodyObject = async (request: any) => {
    if (!request.body) {
      request.body = {};
    }
  };

  // 3. POST /auth/refresh (Refresh Token, Rate Limited)
  app.post<{ Body: RefreshDto }>(
    "/auth/refresh",
    {
      schema: refreshValidationSchema,
      preValidation: [ensureBodyObject],
      ...authRateLimitConfig,
    },
    async (request, reply) => {
      const token = request.body?.refreshToken || request.cookies?.refreshToken;
      if (!token) {
        throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "Missing, invalid or expired token");
      }

      const tokens = await authService.refresh(app, {
        refreshToken: token,
        deviceId: request.body?.deviceId,
      });

      // Update cookies with rotated tokens
      setAuthCookies(reply, tokens);

      return sendResponse(reply, {
        message: "Token refreshed successfully",
        ...tokens,
      });
    },
  );

  // 4. POST /auth/logout (Authenticated)
  app.post<{ Body: LogoutDto }>(
    "/auth/logout",
    {
      schema: logoutValidationSchema,
      preValidation: [ensureBodyObject],
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const refreshToken = request.body?.refreshToken || request.cookies?.refreshToken;
      const result = await authService.logout(
        { refreshToken, sessionId: request.body?.sessionId },
        request.authUser?.sessionId,
      );

      clearAuthCookies(reply);

      return sendResponse(reply, result);
    },
  );

  // 5. POST /auth/logout-all (Authenticated)
  app.post(
    "/auth/logout-all",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await authService.logoutAll(request.authUser!.userId);

      clearAuthCookies(reply);

      return sendResponse(reply, result);
    },
  );

  // 6. GET /auth/me (Authenticated)
  app.get(
    "/auth/me",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = await authService.getMe(request.authUser!.userId);
      return sendResponse(reply, { user });
    },
  );
}
