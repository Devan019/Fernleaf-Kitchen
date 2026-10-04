import { client } from "./client";
import type { AuthUser, LoginRequest, LoginResponse } from "@/types";

export const authApi = {
  /**
   * POST /api/auth/login
   * Returns the authenticated user object and sets HTTP-only cookie.
   */
  login: (credentials: LoginRequest): Promise<LoginResponse> =>
    client.post<LoginResponse>("/api/auth/login", credentials),

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user from the cookie.
   */
  me: (): Promise<AuthUser> => client.get<AuthUser>("/api/auth/me"),

  /**
   * POST /api/auth/logout
   * Clears the HTTP-only token cookie (idempotent).
   */
  logout: (): Promise<{ message: string }> =>
    client.post<{ message: string }>("/api/auth/logout"),
};
