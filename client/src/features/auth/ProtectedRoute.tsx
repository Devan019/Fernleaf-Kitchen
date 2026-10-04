"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  /** If provided, only users with this role can access. Others → /dashboard */
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiredRole && currentUser?.role !== requiredRole) {
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
  if (requiredRole && currentUser?.role !== requiredRole) return null;

  return <>{children}</>;
}
