import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types/permission.enum.js';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
