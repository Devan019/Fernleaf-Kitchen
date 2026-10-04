import { client } from "./client";
import type { EmployeeSummary, PaginatedEmployees } from "@/types";

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
};
