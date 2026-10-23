export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  createdAt: string;
}

export interface UserRecord extends User {
  passwordHash: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  deviceId?: string;
  deviceName?: string;
  expiresAt: string;
  createdAt: string;
}

export interface RegisterDto {
  name: string;
  phone: string;
  password: string;
  email?: string;
}

export interface LoginDto {
  phoneOrEmail: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
}

export interface RefreshDto {
  refreshToken?: string;
  deviceId?: string;
}

export interface LogoutDto {
  refreshToken?: string;
  sessionId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// Fastify JSON Schema validation definitions
export const registerValidationSchema = {
  body: {
    type: "object",
    required: ["name", "phone", "password"],
    properties: {
      name: { type: "string", minLength: 2 },
      phone: { type: "string", minLength: 6 },
      password: { type: "string", minLength: 6 },
      email: { type: "string", format: "email" },
    },
    additionalProperties: false,
  },
};

export const loginValidationSchema = {
  body: {
    type: "object",
    required: ["phoneOrEmail", "password"],
    properties: {
      phoneOrEmail: { type: "string", minLength: 1 },
      password: { type: "string", minLength: 1 },
      deviceId: { type: "string" },
      deviceName: { type: "string" },
    },
    additionalProperties: false,
  },
};

export const refreshValidationSchema = {
  body: {
    type: "object",
    properties: {
      refreshToken: { type: "string", minLength: 1 },
      deviceId: { type: "string" },
    },
    additionalProperties: false,
  },
};

export const logoutValidationSchema = {
  body: {
    type: "object",
    properties: {
      refreshToken: { type: "string" },
      sessionId: { type: "string" },
    },
    additionalProperties: false,
  },
};
