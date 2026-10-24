import { createAuthenticate } from "@zyvo/common";
import { userRepository } from "../storage/index.js";

// Authenticate middleware with session revocation check
export const authenticate = createAuthenticate({
  isSessionActive: (sessionId: string) => userRepository.isSessionActive(sessionId),
});
