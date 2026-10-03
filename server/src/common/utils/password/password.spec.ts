import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password utility', () => {
  it('hashPassword generates a valid Argon2 hash', async () => {
    const plain = 'Staff@Pass1234';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(plain);
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifyPassword returns true for matching password and false for incorrect password', async () => {
    const plain = 'Staff@Pass1234';
    const hash = await hashPassword(plain);

    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, 'WrongPassword')).toBe(false);
  });
});
