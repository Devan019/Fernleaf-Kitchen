"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { hasAllPermissions, hasPermission } from "@/lib/permissions";
import type { Permission, UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  /** If provided, only users with this role can access. Others → /dashboard */
  requiredRole?: UserRole | UserRole[] | string | string[];
  /** If provided, only users with this permission can access. Others → /dashboard */
  requiredPermission?: Permission;
  /** If provided, only users with all of these permissions can access. */
  requiredPermissions?: Permission[];
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
}: Props) {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const router = useRouter();

  const isRoleAllowed = (role?: UserRole) => {
    if (requiredRole) {
      if (!role) return false;
      if (Array.isArray(requiredRole)) {
        if (!requiredRole.includes(role)) return false;
      } else if (role !== requiredRole) {
        return false;
      }
    }

    if (requiredPermission && !hasPermission(role, requiredPermission)) {
      return false;
    }

    if (requiredPermissions && !hasAllPermissions(role, requiredPermissions)) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isRoleAllowed(currentUser?.role)) {
      router.replace("/dashboard");
    }
  }, [
    loading,
    isAuthenticated,
    requiredRole,
    requiredPermission,
    requiredPermissions,
    currentUser,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <span className="loader" aria-label="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!isRoleAllowed(currentUser?.role)) return null;

  return <>{children}</>;
}
