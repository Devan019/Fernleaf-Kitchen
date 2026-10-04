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
import type { AuthUser, LoginRequest } from "@/types";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
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

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: currentUser !== null,
        currentUser,
        loading,
        login,
        logout,
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
