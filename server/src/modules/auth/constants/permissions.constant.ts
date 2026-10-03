import { UserRole } from '../../../generated/prisma/enums.js';
import { Permission } from '../types/permission.enum.js';

/**
 * Centralized mapping of staff roles to permissions.
 * Adding or changing roles/permissions only requires updating this mapping.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),

  [UserRole.KITCHEN]: [
    Permission.KITCHEN_READ,
    // Permission.KITCHEN_UPDATE,
    Permission.USER_READ,
    Permission.DELIVERY_READ_ALL,
    Permission.CATALOGUE_READ,
    Permission.MENU_READ,
    Permission.PRICING_READ,
  ],

  [UserRole.DISPATCH]: [
    Permission.DISPATCH_READ,
    Permission.DISPATCH_UPDATE,
    Permission.DISPATCH_ASSIGN_DRIVER,
    Permission.DELIVERY_TRACK,
    Permission.DELIVERY_READ_ALL,
    Permission.USER_READ,
    Permission.CATALOGUE_READ,
    Permission.MENU_READ,
    Permission.PRICING_READ,
  ],

  [UserRole.DRIVER]: [
    Permission.DELIVERY_READ_OWN,
    Permission.DELIVERY_UPDATE_OWN,
  ],
} as const;

/**
 * Check if a role possesses a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Check if a role possesses all specified permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  requiredPermissions: Permission[],
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return requiredPermissions.every((perm) => permissions.includes(perm));
}
