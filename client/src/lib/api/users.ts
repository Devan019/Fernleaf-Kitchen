import { client } from "./client";
import type {
  CreateUserRequest,
  PaginatedUsers,
  UpdateUserRequest,
  User,
} from "@/types";

export interface ListUsersParams {
  page?: number;
  limit?: number;
}

export const usersApi = {
  /**
   * GET /api/users
   * Paginated list of staff users. ADMIN only.
   */
  list: (params: ListUsersParams = {}): Promise<PaginatedUsers> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return client.get<PaginatedUsers>(`/api/users${query ? `?${query}` : ""}`);
  },

  /**
   * GET /api/users/:id
   * Retrieve a single staff user by ID. ADMIN only.
   */
  getById: (id: string): Promise<User> =>
    client.get<User>(`/api/users/${id}`),

  /**
   * POST /api/users
   * Create a new staff user. ADMIN only.
   */
  create: (data: CreateUserRequest): Promise<User> =>
    client.post<User>("/api/users", data),

  /**
   * PATCH /api/users/:id
   * Update profile, role, password, or active status. ADMIN only.
   */
  update: (id: string, data: UpdateUserRequest): Promise<User> =>
    client.patch<User>(`/api/users/${id}`, data),

  /**
   * DELETE /api/users/:id
   * Soft-deactivates (sets isActive: false) a staff user. ADMIN only.
   */
  deactivate: (id: string): Promise<User> =>
    client.delete<User>(`/api/users/${id}`),
};
