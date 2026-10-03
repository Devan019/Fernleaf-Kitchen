import { UserRole } from '../../../generated/prisma/enums.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
