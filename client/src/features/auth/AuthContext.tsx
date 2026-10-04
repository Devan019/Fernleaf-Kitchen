"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { AuthUser, LoginRequest, Permission } from "@/types";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify existing session on mount
  useEffect(() => {
    authApi
      .me()
      .then((user) => setCurrentUser(user))
      .catch((err) => {
        // 401 = no active session; network errors = backend unreachable.
        // Neither should surface as a console error during bootstrap.
        if (
          err instanceof ApiClientError &&
          err.statusCode !== 401 &&
          err.statusCode !== 0
        ) {
          console.error("Auth bootstrap error:", err);
        }
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { user } = await authApi.login(credentials);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setCurrentUser(null);
  }, []);

  const can = useCallback(
    (permission: Permission) => hasPermission(currentUser?.role, permission),
    [currentUser?.role],
  );

  const canAll = useCallback(
    (permissions: Permission[]) => hasAllPermissions(currentUser?.role, permissions),
    [currentUser?.role],
  );

  const canAny = useCallback(
    (permissions: Permission[]) => hasAnyPermission(currentUser?.role, permissions),
    [currentUser?.role],
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: currentUser !== null,
        currentUser,
        loading,
        login,
        logout,
        can,
        canAll,
        canAny,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
