export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
}

export interface UpdatePhoneDto {
  newPhone: string;
  verificationCode: string;
}

export interface DeleteUserDto {
  confirmation: boolean | string;
  reason?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  gender?: string | null;
  preferredLanguage?: string;
  ratingAvg: number;
  tripCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ConsentRecord {
  consentType: string;
  title: string;
  description: string;
  isAccepted: boolean;
  version: string;
  mandatory: boolean;
  acceptedAt: string;
  updatedAt: string;
}

// JSON Schemas for Fastify validation
export const updateUserValidationSchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      email: { type: "string", format: "email" },
      avatarUrl: { type: "string" },
      preferredLanguage: { type: "string", minLength: 2, maxLength: 10 },
    },
    additionalProperties: false,
  },
};

export const updatePhoneValidationSchema = {
  body: {
    type: "object",
    required: ["newPhone", "verificationCode"],
    properties: {
      newPhone: { type: "string", minLength: 7, maxLength: 20 },
      verificationCode: { type: "string", minLength: 4, maxLength: 10 },
    },
    additionalProperties: false,
  },
};

export const deleteUserValidationSchema = {
  body: {
    type: "object",
    required: ["confirmation"],
    properties: {
      confirmation: {
        anyOf: [{ type: "boolean" }, { type: "string" }],
      },
      reason: { type: "string", maxLength: 255 },
    },
    additionalProperties: false,
  },
};
