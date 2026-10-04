import { employeesApi } from "@/lib/api/employees";
import type { ListEmployeesParams } from "@/lib/api/employees";
import { useQuery } from "@tanstack/react-query";

export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => ["employees", "list"] as const,
  list: (params: ListEmployeesParams = {}) => ["employees", "list", params] as const,
  detail: (id: string) => ["employees", "detail", id] as const,
};

export function useEmployees(params: ListEmployeesParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeesApi.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useEmployee(id: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
