import { settingsApi } from "@/lib/api/settings";
import type {
  CreateKitchenHolidayRequest,
  UpdateKitchenHolidayRequest,
  UpdateKitchenSettingsRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const settingsKeys = {
  all: ["settings"] as const,
  kitchen: ["settings", "kitchen"] as const,
  holidays: ["settings", "holidays"] as const,
};

export function useKitchenSettings() {
  return useQuery({
    queryKey: settingsKeys.kitchen,
    queryFn: () => settingsApi.getKitchenSettings(),
  });
}

export function useKitchenHolidays() {
  return useQuery({
    queryKey: settingsKeys.holidays,
    queryFn: () => settingsApi.getHolidays(),
  });
}

export function useUpdateKitchenSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateKitchenSettingsRequest) =>
      settingsApi.updateKitchenSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useCreateKitchenHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateKitchenHolidayRequest) =>
      settingsApi.createHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdateKitchenHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateKitchenHolidayRequest;
    }) => settingsApi.updateHoliday(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useDeleteKitchenHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
