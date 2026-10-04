// ─── Auth / User Types ────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "KITCHEN" | "DISPATCH" | "DRIVER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

// ─── Users Module Types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedUsers {
  data: User[];
  meta: PaginationMeta;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export * from "./billing";
export * from "./catalogue";
export * from "./companies";
export * from "./dispatch";
export * from "./employees";
export * from "./kitchen";
export * from "./menu";
export * from "./orders";
export * from "./permissions";
export * from "./pricing";


