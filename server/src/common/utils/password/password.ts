import * as argon2 from 'argon2';

/**
 * Hashes a plaintext password using Argon2id.
 *
 * @param password - Plaintext password to hash
 * @returns Promise resolving to the hashed string
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verifies a plaintext password against an Argon2 hash.
 *
 * @param hash - Stored hash to compare against
 * @param plain - Plaintext password to verify
 * @returns Promise resolving to true if valid, false otherwise
 */
export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}
