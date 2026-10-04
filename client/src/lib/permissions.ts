import type { UserRole } from "@/types";
import { Permission } from "@/types/permissions";

/**
 * Centralized mapping of staff roles to permissions on the frontend.
 * Matches backend server/src/modules/auth/constants/permissions.constant.ts
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: Object.values(Permission),

  KITCHEN: [
    Permission.KITCHEN_READ,
    Permission.KITCHEN_UPDATE,
    Permission.USER_READ,
    Permission.DELIVERY_READ_ALL,
    Permission.CATALOGUE_READ,
    Permission.MENU_READ,
    Permission.PRICING_READ,
    Permission.COMPANY_READ,
    Permission.EMPLOYEE_READ,
    Permission.ORDER_READ,
    Permission.SETTINGS_READ,
  ],

  DISPATCH: [
    Permission.DISPATCH_READ,
    Permission.DISPATCH_UPDATE,
    Permission.DISPATCH_ASSIGN_DRIVER,
    Permission.DELIVERY_TRACK,
    Permission.DELIVERY_READ_ALL,
    Permission.USER_READ,
    Permission.CATALOGUE_READ,
    Permission.MENU_READ,
    Permission.PRICING_READ,
    Permission.COMPANY_READ,
    Permission.EMPLOYEE_READ,
    Permission.ORDER_READ,
    Permission.KITCHEN_READ,
    Permission.SETTINGS_READ,
  ],

  DRIVER: [
    Permission.DELIVERY_READ_OWN,
    Permission.DELIVERY_UPDATE_OWN,
  ],
} as const;

/**
 * Check if a role possesses a specific permission.
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Check if a role possesses all specified permissions.
 */
export function hasAllPermissions(
  role: UserRole | undefined | null,
  requiredPermissions: Permission[],
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return requiredPermissions.every((perm) => permissions.includes(perm));
}

/**
 * Check if a role possesses at least one of the specified permissions.
 */
export function hasAnyPermission(
  role: UserRole | undefined | null,
  candidatePermissions: Permission[],
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return candidatePermissions.some((perm) => permissions.includes(perm));
}
