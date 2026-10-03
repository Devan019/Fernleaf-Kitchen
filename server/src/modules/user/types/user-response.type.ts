import { UserRole } from '../../../generated/prisma/enums.js';
import {
  PaginatedResult,
  PaginationMeta,
} from '../../../common/utils/index.js';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type { PaginationMeta };
export type PaginatedUsersResponse = PaginatedResult<UserResponse>;

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
