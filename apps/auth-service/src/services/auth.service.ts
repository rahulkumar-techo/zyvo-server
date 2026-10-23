import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../config/index.js";
import {
  ErrorCodes,
  AppError,
  type User,
  type UserRecord,
  type RegisterDto,
  type LoginDto,
  type RefreshDto,
  type LogoutDto,
  type AuthResponse,
  type AuthTokens,
} from "../schemas/index.js";
import { authRepository } from "../storage/index.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { generateRefreshToken, hashToken, signAccessToken } from "./token.service.js";

function sanitizeUser(record: UserRecord): User {
  const { passwordHash: _, ...safeUser } = record;
  return safeUser;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<User> {
    const existingPhone = await authRepository.findUserByPhone(dto.phone);
    if (existingPhone) {
      throw new AppError(409, ErrorCodes.CONFLICT, "Phone number is already registered");
    }

    if (dto.email) {
      const existingEmail = await authRepository.findUserByEmail(dto.email);
      if (existingEmail) {
        throw new AppError(409, ErrorCodes.CONFLICT, "Email is already registered");
      }
    }

    const passwordHash = await hashPassword(dto.password);
    const userId = randomUUID();
    const now = new Date().toISOString();

    const userRecord: UserRecord = {
      id: userId,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      email: dto.email ? dto.email.trim().toLowerCase() : undefined,
      role: "passenger",
      passwordHash,
      createdAt: now,
    };

    await authRepository.createUser(userRecord);
    return sanitizeUser(userRecord);
  }

  async login(app: FastifyInstance, dto: LoginDto): Promise<AuthResponse> {
    const user = await authRepository.findUserByPhoneOrEmail(dto.phoneOrEmail);
    if (!user) {
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "Invalid credentials");
    }

    const isValidPassword = await verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "Invalid credentials");
    }

    const sessionId = randomUUID();
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    await authRepository.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const accessToken = signAccessToken(app, {
      userId: user.id,
      role: user.role,
      sessionId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiry,
      user: sanitizeUser(user),
    };
  }

  async refresh(app: FastifyInstance, dto: RefreshDto): Promise<AuthTokens> {
    if (!dto.refreshToken) {
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "Missing, invalid or expired token");
    }

    const inputTokenHash = hashToken(dto.refreshToken);
    const session = await authRepository.findSessionByTokenHash(inputTokenHash);

    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) {
        // Clean up expired session
        await authRepository.deleteSession(session.id);
      }
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "Missing, invalid or expired token");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) {
      await authRepository.deleteSession(session.id);
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, "User no longer exists");
    }

    // Token rotation: generate new refresh token and update session hash
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    await authRepository.updateSessionToken(
      session.id,
      newTokenHash,
      newExpiresAt,
      dto.deviceId ?? session.deviceId,
    );

    const accessToken = signAccessToken(app, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: config.accessTokenExpiry,
    };
  }

  async logout(dto: LogoutDto, sessionFromToken?: string): Promise<{ message: string }> {
    if (dto.refreshToken) {
      const tokenHash = hashToken(dto.refreshToken);
      await authRepository.deleteSessionByTokenHash(tokenHash);
      return { message: "Logged out successfully" };
    }

    const targetSessionId = dto.sessionId || sessionFromToken;
    if (targetSessionId) {
      await authRepository.deleteSession(targetSessionId);
      return { message: "Logged out successfully" };
    }

    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Current session or refresh token identifier required",
    );
  }

  async logoutAll(userId: string): Promise<{ message: string; sessionsInvalidated: number }> {
    const sessionsInvalidated = await authRepository.deleteSessionsByUserId(userId);
    return {
      message: "All sessions invalidated successfully",
      sessionsInvalidated,
    };
  }

  async getMe(userId: string): Promise<User> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, "User not found");
    }

    return sanitizeUser(user);
  }
}

export const authService = new AuthService();
