import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../generated/prisma/client.js';
import { isPrismaError } from './prisma-error.js';

describe('prisma error utility', () => {
  it('returns true when error is PrismaClientKnownRequestError with matching code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Duplicate error', {
      code: 'P2002',
      clientVersion: '7.10.0',
    });

    expect(isPrismaError(error, 'P2002')).toBe(true);
  });

  it('returns false when error code does not match', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.10.0',
    });

    expect(isPrismaError(error, 'P2002')).toBe(false);
  });

  it('returns false for generic JavaScript errors or non-Prisma errors', () => {
    const genericError = new Error('Some random error');
    expect(isPrismaError(genericError, 'P2002')).toBe(false);
    expect(isPrismaError('string error', 'P2002')).toBe(false);
    expect(isPrismaError(null, 'P2002')).toBe(false);
    expect(isPrismaError(undefined, 'P2002')).toBe(false);
  });
});
