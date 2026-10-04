"use client";

import { useAuth } from "@/features/auth/AuthContext";
import type { UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  /** If provided, only users with this role can access. Others → /dashboard */
  requiredRole?: UserRole | UserRole[] | string | string[];
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const router = useRouter();

  const isRoleAllowed = (role?: string) => {
    if (!requiredRole) return true;
    if (!role) return false;
    if (Array.isArray(requiredRole)) {
      return (requiredRole as string[]).includes(role);
    }
    return role === requiredRole;
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
  }, [loading, isAuthenticated, requiredRole, currentUser, router]);

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
