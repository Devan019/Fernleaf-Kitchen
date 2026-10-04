import { employeesApi, type ListEmployeesParams } from "@/lib/api/employees";
import type {
  CreateEmployeeRequest,
  UpdateEmployeePermissionsRequest,
  UpdateEmployeePreferencesRequest,
  UpdateEmployeeRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const employeeKeys = {
  all: ["employees"] as const,
  list: (params: ListEmployeesParams = {}) => ["employees", "list", params] as const,
  detail: (id: string) => ["employees", "detail", id] as const,
};

// ── Query Hooks ──────────────────────────────────────────────────────────────

export function useEmployees(params: ListEmployeesParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeesApi.list(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: Boolean(id),
  });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateEmployee(employeeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateEmployeeRequest }) =>
      employeesApi.update(id ?? employeeId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      const targetId = vars.id ?? employeeId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(targetId) });
      }
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.deactivate(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}

export function useUpdateEmployeePermissions(employeeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: string;
      data: UpdateEmployeePermissionsRequest;
    }) => employeesApi.updatePermissions(id ?? employeeId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      const targetId = vars.id ?? employeeId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(targetId) });
      }
    },
  });
}

export function useUpdateEmployeePreferences(employeeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: string;
      data: UpdateEmployeePreferencesRequest;
    }) => employeesApi.updatePreferences(id ?? employeeId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      const targetId = vars.id ?? employeeId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(targetId) });
      }
    },
  });
}
