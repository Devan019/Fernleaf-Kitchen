"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Show spinner while auth is resolving to prevent flash
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <span className="loader" aria-label="Loading…" />
    </div>
  );
}