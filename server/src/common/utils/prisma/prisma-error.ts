import { Prisma } from '../../../generated/prisma/client.js';

/**
 * Type guard for Prisma known request errors checking specific error codes.
 *
 * Frequently used codes:
 * - P2002: Unique constraint violation (e.g., duplicate email)
 * - P2025: Record not found for operation (e.g., target record does not exist)
 *
 * @param error - The error caught in a try/catch block
 * @param code - The expected Prisma error code (e.g., 'P2002', 'P2025')
 * @returns True if error is a PrismaClientKnownRequestError matching the code
 */
export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
