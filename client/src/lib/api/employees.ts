import { client } from "./client";
import type {
  CreateEmployeeRequest,
  EmployeeSummary,
  PaginatedEmployees,
  UpdateEmployeePermissionsRequest,
  UpdateEmployeePreferencesRequest,
  UpdateEmployeeRequest,
} from "@/types";

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  isActive?: boolean;
}

export const employeesApi = {
  /**
   * GET /api/employees
   * List customer employees with pagination, search, and filtering.
   */
  list: async (params: ListEmployeesParams = {}): Promise<PaginatedEmployees> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.companyId) qs.set("companyId", params.companyId);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const query = qs.toString();
    const res = await client.get<any>(`/api/employees${query ? `?${query}` : ""}`);

    if (Array.isArray(res)) {
      return {
        data: res,
        meta: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          total: res.length,
          totalPages: Math.ceil(res.length / (params.limit ?? 20)) || 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return {
      data: Array.isArray(res?.data) ? res.data : [],
      meta: res?.meta ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  /**
   * GET /api/employees/:id
   * Retrieve single customer employee details.
   */
  getById: (id: string): Promise<EmployeeSummary> =>
    client.get<EmployeeSummary>(`/api/employees/${id}`),

  /**
   * POST /api/employees
   * Create a new customer employee profile linked to an existing company.
   */
  create: (data: CreateEmployeeRequest): Promise<EmployeeSummary> =>
    client.post<EmployeeSummary>("/api/employees", data),

  /**
   * PATCH /api/employees/:id
   * Update employee name, email, company association (relocating employee), or active status.
   */
  update: (id: string, data: UpdateEmployeeRequest): Promise<EmployeeSummary> =>
    client.patch<EmployeeSummary>(`/api/employees/${id}`, data),

  /**
   * DELETE /api/employees/:id
   * Soft-deactivates an employee account (isActive: false).
   */
  deactivate: (id: string): Promise<EmployeeSummary> =>
    client.delete<EmployeeSummary>(`/api/employees/${id}`),

  /**
   * PATCH /api/employees/:id/permissions
   * Updates business permission flags.
   */
  updatePermissions: (
    id: string,
    data: UpdateEmployeePermissionsRequest,
  ): Promise<EmployeeSummary> =>
    client.patch<EmployeeSummary>(`/api/employees/${id}/permissions`, data),

  /**
   * PATCH /api/employees/:id/preferences
   * Updates allergen warnings and dietary tag preferences simultaneously.
   */
  updatePreferences: (
    id: string,
    data: UpdateEmployeePreferencesRequest,
  ): Promise<EmployeeSummary> =>
    client.patch<EmployeeSummary>(`/api/employees/${id}/preferences`, data),

  /**
   * PUT /api/employees/:id/allergies
   * Replaces all allergen warnings linked to employee.
   */
  replaceAllergies: (id: string, allergenIds: string[]): Promise<EmployeeSummary> =>
    client.put<EmployeeSummary>(`/api/employees/${id}/allergies`, { allergenIds }),

  /**
   * PUT /api/employees/:id/dietary-preferences
   * Replaces all dietary tag preferences linked to employee.
   */
  replaceDietaryPreferences: (id: string, dietaryTagIds: string[]): Promise<EmployeeSummary> =>
    client.put<EmployeeSummary>(`/api/employees/${id}/dietary-preferences`, { dietaryTagIds }),
};
