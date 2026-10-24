import { createAuthenticate } from "@zyvo/common";
import { authRepository } from "../storage/index.js";

// Authenticate middleware with session revocation check
export const authenticate = createAuthenticate({
  isSessionActive: async (sessionId: string) => {
    const session = await authRepository.findSessionById(sessionId);
    return Boolean(session);
  },
});
