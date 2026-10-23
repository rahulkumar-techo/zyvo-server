import type { PrismaClient } from "@prisma/client";

export type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
}

// Executes an operation within a database transaction with configurable timeouts
export async function withTransaction<T>(
  client: PrismaClient,
  action: (tx: TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return client.$transaction(async (tx) => {
    return action(tx);
  }, options);
}
