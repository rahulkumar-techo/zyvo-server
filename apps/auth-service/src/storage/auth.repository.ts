import { prisma } from "../database/client.js";
import type { UserRecord, SessionRecord } from "../schemas/index.js";

export class AuthRepository {
  private async toUserRecord(
    user: { id: string; name: string; phone: string; email: string | null; createdAt: Date } | null,
    options: { includePassword?: boolean } = { includePassword: true },
  ): Promise<UserRecord | null> {
    if (!user) return null;

    if (options.includePassword) {
      const [credentials, userRole] = await Promise.all([
        prisma.credentials.findUnique({ where: { userId: user.id } }),
        prisma.userRole.findFirst({
          where: { userId: user.id },
          include: { role: true },
        }),
      ]);

      if (!credentials) return null;

      return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email || undefined,
        role: userRole?.role.name || "passenger",
        passwordHash: credentials.passwordHash,
        createdAt: user.createdAt.toISOString(),
      };
    }

    const userRole = await prisma.userRole.findFirst({
      where: { userId: user.id },
      include: { role: true },
    });

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email || undefined,
      role: userRole?.role.name || "passenger",
      passwordHash: "",
      createdAt: user.createdAt.toISOString(),
    };
  }

  async findUserById(id: string, includePassword = false): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return this.toUserRecord(user, { includePassword });
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { phone } });
    return this.toUserRecord(user);
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    return this.toUserRecord(user);
  }

  async findUserByPhoneOrEmail(identifier: string): Promise<UserRecord | null> {
    const trimmed = identifier.trim();
    const byPhone = await this.findUserByPhone(trimmed);
    if (byPhone) {
      return byPhone;
    }
    return this.findUserByEmail(trimmed);
  }

  async createUser(user: UserRecord): Promise<UserRecord> {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email ? user.email.toLowerCase().trim() : null,
        },
      });

      await tx.credentials.create({
        data: {
          userId: user.id,
          passwordHash: user.passwordHash,
        },
      });

      let role = await tx.role.findUnique({ where: { name: user.role } });
      if (!role) {
        role = await tx.role.create({ data: { name: user.role } });
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    });

    return user;
  }

  async createSession(session: SessionRecord): Promise<SessionRecord> {
    await prisma.refreshSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        expiresAt: new Date(session.expiresAt),
      },
    });
    return session;
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    const s = await prisma.refreshSession.findUnique({ where: { id } });
    if (!s || s.isRevoked) return null;
    return {
      id: s.id,
      userId: s.userId,
      tokenHash: s.tokenHash,
      deviceId: s.deviceId || undefined,
      deviceName: s.deviceName || undefined,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const s = await prisma.refreshSession.findUnique({ where: { tokenHash } });
    if (!s || s.isRevoked) return null;
    return {
      id: s.id,
      userId: s.userId,
      tokenHash: s.tokenHash,
      deviceId: s.deviceId || undefined,
      deviceName: s.deviceName || undefined,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    };
  }

  async updateSessionToken(
    sessionId: string,
    newTokenHash: string,
    newExpiresAt: string,
    deviceId?: string,
  ): Promise<void> {
    await prisma.refreshSession.update({
      where: { id: sessionId },
      data: {
        tokenHash: newTokenHash,
        expiresAt: new Date(newExpiresAt),
        ...(deviceId ? { deviceId } : {}),
      },
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.refreshSession.delete({ where: { id: sessionId } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
    try {
      const res = await prisma.refreshSession.deleteMany({ where: { tokenHash } });
      return res.count > 0;
    } catch {
      return false;
    }
  }

  async deleteSessionsByUserId(userId: string): Promise<number> {
    const res = await prisma.refreshSession.deleteMany({ where: { userId } });
    return res.count;
  }

  // Clear data (helpful for test isolation)
  async clear(): Promise<void> {
    try {
      await prisma.refreshSession.deleteMany({});
      await prisma.userRole.deleteMany({});
      await prisma.credentials.deleteMany({});
      await prisma.user.deleteMany({});
    } catch {
      // Ignored for environments without active test DB
    }
  }
}

export const authRepository = new AuthRepository();
