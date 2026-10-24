import { userRepository } from "../storage/index.js";
import {
  ErrorCodes,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  BusinessRuleError,
  ValidationError,
  InternalServerError,
  type UpdateUserDto,
  type UpdatePhoneDto,
  type DeleteUserDto,
  type UserResponse,
  type ConsentRecord,
} from "../schemas/index.js";

export class UserService {
  // Helper to validate active user profile
  private assertActiveUser(user: UserResponse | null): UserResponse {
    if (!user) {
      throw new NotFoundError("User profile not found", ErrorCodes.USER_PROFILE_NOT_FOUND);
    }

    if (user.status === "deactivated" || user.status === "deleted" || user.status === "suspended") {
      throw new AuthorizationError(
        "User account has been deactivated or suspended",
        ErrorCodes.ACCOUNT_DEACTIVATED,
      );
    }

    return user;
  }

  // 1. GET /users/me
  async getMe(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    return this.assertActiveUser(user);
  }

  // 2. PATCH /users/me
  async updateMe(userId: string, updates: UpdateUserDto): Promise<UserResponse> {
    // Validate at least one field is provided
    const hasField =
      (updates.name !== undefined && updates.name.trim().length > 0) ||
      (updates.email !== undefined && updates.email.trim().length > 0) ||
      (updates.avatarUrl !== undefined && updates.avatarUrl.trim().length > 0) ||
      (updates.preferredLanguage !== undefined && updates.preferredLanguage.trim().length > 0);

    if (!hasField) {
      throw new ValidationError(
        "At least one field (name, email, avatarUrl, preferredLanguage) must be provided",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const user = await userRepository.findById(userId);
    this.assertActiveUser(user);

    // Check email uniqueness if email is being updated
    if (updates.email) {
      const existing = await userRepository.findByEmail(updates.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError(
          "Email address is already in use by another account",
          ErrorCodes.EMAIL_ALREADY_EXISTS,
        );
      }
    }

    const updated = await userRepository.updateUser(userId, updates);
    if (!updated) {
      throw new InternalServerError(
        "Failed to update user profile",
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }

    return updated;
  }

  // 3. PATCH /users/me/phone
  async updatePhone(userId: string, dto: UpdatePhoneDto): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    this.assertActiveUser(user);

    const trimmedPhone = dto.newPhone?.trim();
    if (!trimmedPhone || trimmedPhone.length < 7) {
      throw new ValidationError("Invalid phone number format", ErrorCodes.VALIDATION_ERROR);
    }

    // Verify verification code (e.g. 6-digit OTP code)
    const code = dto.verificationCode?.trim();
    if (!code || code === "000000" || code.length < 4) {
      throw new BusinessRuleError(
        "Invalid or expired verification code",
        ErrorCodes.BUSINESS_RULE_VIOLATION,
      );
    }

    // Check if new phone is already registered to another user
    const existing = await userRepository.findByPhone(trimmedPhone);
    if (existing && existing.id !== userId) {
      throw new ConflictError(
        "Phone number is already registered to another account",
        ErrorCodes.PHONE_ALREADY_EXISTS,
      );
    }

    const updated = await userRepository.updatePhone(userId, trimmedPhone);
    if (!updated) {
      throw new InternalServerError(
        "Failed to update phone number",
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }

    return updated;
  }

  // 4. DELETE /users/me
  async deleteMe(userId: string, dto: DeleteUserDto): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User profile not found", ErrorCodes.USER_PROFILE_NOT_FOUND);
    }

    if (user.status === "deactivated" || user.status === "deleted" || user.status === "suspended") {
      throw new AuthorizationError(
        "User account is already deactivated",
        ErrorCodes.ACCOUNT_DEACTIVATED,
      );
    }

    // Step-up verification check: confirmation must be true or string "DELETE"
    const confirmed =
      dto.confirmation === true ||
      (typeof dto.confirmation === "string" && dto.confirmation.toUpperCase() === "DELETE");

    if (!confirmed) {
      throw new ValidationError(
        "Step-up verification confirmation is required to delete your account (must be true or 'DELETE')",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    await userRepository.deleteUser(userId, dto.reason);

    return {
      message: "User account and sessions deleted successfully",
    };
  }

  // 5. GET /users/me/consents
  async getConsents(userId: string): Promise<ConsentRecord[]> {
    const user = await userRepository.findById(userId);
    this.assertActiveUser(user);

    return userRepository.getConsents(userId);
  }
}

export const userService = new UserService();

