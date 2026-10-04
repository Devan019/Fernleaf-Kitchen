import { companiesApi, type ListCompaniesParams } from "@/lib/api/companies";
import type {
  CreateCompanyRequest,
  CreateDeliveryAddressRequest,
  CreateHolidayRequest,
  DayOfWeek,
  UpdateBillingContactRequest,
  UpdateCompanyRequest,
  UpdateDeliveryAddressRequest,
  UpdateDeliveryDefaultsRequest,
  UpdateHolidayRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const companyKeys = {
  all: ["companies"] as const,
  list: (params: ListCompaniesParams = {}) => ["companies", "list", params] as const,
  detail: (id: string) => ["companies", "detail", id] as const,
  addresses: (companyId: string) => ["companies", "detail", companyId, "addresses"] as const,
  holidays: (companyId: string) => ["companies", "detail", companyId, "holidays"] as const,
  availability: (companyId: string, date: string) =>
    ["companies", "detail", companyId, "availability", date] as const,
};

// ── Query Hooks ──────────────────────────────────────────────────────────────

export function useCompanies(params: ListCompaniesParams = {}) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => companiesApi.list(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCompanyAddresses(companyId: string) {
  return useQuery({
    queryKey: companyKeys.addresses(companyId),
    queryFn: () => companiesApi.listAddresses(companyId),
    enabled: Boolean(companyId),
  });
}

export function useCompanyHolidays(companyId: string) {
  return useQuery({
    queryKey: companyKeys.holidays(companyId),
    queryFn: () => companiesApi.listHolidays(companyId),
    enabled: Boolean(companyId),
  });
}

export function useDeliveryAvailability(companyId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: companyKeys.availability(companyId, date),
    queryFn: () => companiesApi.checkDeliveryAvailability(companyId, date),
    enabled: Boolean(companyId && date && enabled),
  });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useUpdateCompany(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateCompanyRequest }) =>
      companiesApi.update(id ?? companyId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useDeactivateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companiesApi.deactivate(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
    },
  });
}

export function useAddCompanyDomain(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, domain }: { id?: string; domain: string }) =>
      companiesApi.addDomain(id ?? companyId ?? "", domain),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useRemoveCompanyDomain(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, domainId }: { id?: string; domainId: string }) =>
      companiesApi.removeDomain(id ?? companyId ?? "", domainId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useAddCompanyAddress(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CreateDeliveryAddressRequest }) =>
      companiesApi.addAddress(id ?? companyId ?? "", data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.addresses(targetId) });
      }
    },
  });
}

export function useUpdateCompanyAddress(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      addressId,
      data,
    }: {
      id?: string;
      addressId: string;
      data: UpdateDeliveryAddressRequest;
    }) => companiesApi.updateAddress(id ?? companyId ?? "", addressId, data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.addresses(targetId) });
      }
    },
  });
}

export function useDeleteCompanyAddress(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, addressId }: { id?: string; addressId: string }) =>
      companiesApi.deleteAddress(id ?? companyId ?? "", addressId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.addresses(targetId) });
      }
    },
  });
}

export function useUpdateBillingContact(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateBillingContactRequest }) =>
      companiesApi.updateBillingContact(id ?? companyId ?? "", data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useSetCompanyOwner(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ownerId }: { id?: string; ownerId: string }) =>
      companiesApi.setOwner(id ?? companyId ?? "", ownerId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.all });
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useUpdateCompanyCalendar(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, workingDays }: { id?: string; workingDays: DayOfWeek[] }) =>
      companiesApi.updateCalendar(id ?? companyId ?? "", workingDays),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useAddCompanyHoliday(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CreateHolidayRequest }) =>
      companiesApi.addHoliday(id ?? companyId ?? "", data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.holidays(targetId) });
      }
    },
  });
}

export function useUpdateCompanyHoliday(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      holidayId,
      data,
    }: {
      id?: string;
      holidayId: string;
      data: UpdateHolidayRequest;
    }) => companiesApi.updateHoliday(id ?? companyId ?? "", holidayId, data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.holidays(targetId) });
      }
    },
  });
}

export function useDeleteCompanyHoliday(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, holidayId }: { id?: string; holidayId: string }) =>
      companiesApi.deleteHoliday(id ?? companyId ?? "", holidayId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: companyKeys.holidays(targetId) });
      }
    },
  });
}

export function useUpdateDeliveryDefaults(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateDeliveryDefaultsRequest }) =>
      companiesApi.updateDeliveryDefaults(id ?? companyId ?? "", data),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useAssignCompanyPriceTier(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priceTierId }: { id?: string; priceTierId: string | null }) =>
      companiesApi.assignPriceTier(id ?? companyId ?? "", priceTierId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useHideCompanyCategory(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id?: string; categoryId: string }) =>
      companiesApi.hideCategory(id ?? companyId ?? "", categoryId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useUnhideCompanyCategory(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id?: string; categoryId: string }) =>
      companiesApi.unhideCategory(id ?? companyId ?? "", categoryId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useHideCompanyDish(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dishId }: { id?: string; dishId: string }) =>
      companiesApi.hideDish(id ?? companyId ?? "", dishId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useUnhideCompanyDish(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dishId }: { id?: string; dishId: string }) =>
      companiesApi.unhideDish(id ?? companyId ?? "", dishId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}

export function useImportEmployeesCsv(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, csvContent }: { id?: string; csvContent: string }) =>
      companiesApi.importEmployeesCsv(id ?? companyId ?? "", csvContent),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      const targetId = vars.id ?? companyId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(targetId) });
      }
    },
  });
}
