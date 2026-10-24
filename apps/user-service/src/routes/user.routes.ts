import type { FastifyInstance } from "fastify";
import {
  updateUserValidationSchema,
  updatePhoneValidationSchema,
  deleteUserValidationSchema,
  type UpdateUserDto,
  type UpdatePhoneDto,
  type DeleteUserDto,
} from "../schemas/index.js";
import { userService } from "../services/index.js";
import { authenticate, authorizeRoles } from "../middleware/index.js";
import { sendResponse } from "../utils/index.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Helper for empty JSON bodies
  const ensureBody = async (req: any) => {
    if (!req.body) req.body = {};
  };

  // 1. GET /users/me (Access: Passenger / Driver)
  app.get(
    "/users/me",
    {
      preHandler: [authenticate, authorizeRoles(["passenger", "driver", "admin"])],
    },
    async (request, reply) => {
      const userId = request.authUser!.userId;
      const user = await userService.getMe(userId);

      return sendResponse(reply, {
        statusCode: 200,
        user,
      });
    },
  );

  // 2. PATCH /users/me (Access: Authenticated)
  app.patch<{ Body: UpdateUserDto }>(
    "/users/me",
    {
      preHandler: [authenticate],
      schema: updateUserValidationSchema,
    },
    async (request, reply) => {
      const userId = request.authUser!.userId;
      const updatedUser = await userService.updateMe(userId, request.body || {});

      return sendResponse(reply, {
        statusCode: 200,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    },
  );

  // 3. PATCH /users/me/phone (Access: Authenticated + verification)
  app.patch<{ Body: UpdatePhoneDto }>(
    "/users/me/phone",
    {
      preHandler: [authenticate],
      schema: updatePhoneValidationSchema,
    },
    async (request, reply) => {
      const userId = request.authUser!.userId;
      const updatedUser = await userService.updatePhone(userId, request.body);

      return sendResponse(reply, {
        statusCode: 200,
        message: "Phone number updated successfully",
        user: updatedUser,
      });
    },
  );

  // 4. DELETE /users/me (Access: Authenticated + step-up verification)
  app.delete<{ Body: DeleteUserDto }>(
    "/users/me",
    {
      preHandler: [ensureBody, authenticate],
      schema: deleteUserValidationSchema,
    },
    async (request, reply) => {
      const userId = request.authUser!.userId;
      const result = await userService.deleteMe(userId, request.body);

      return sendResponse(reply, {
        statusCode: 200,
        message: result.message,
      });
    },
  );

  // 5. GET /users/me/consents (Access: Authenticated)
  app.get(
    "/users/me/consents",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = request.authUser!.userId;
      const consents = await userService.getConsents(userId);

      return sendResponse(reply, {
        statusCode: 200,
        consents,
      });
    },
  );
}
