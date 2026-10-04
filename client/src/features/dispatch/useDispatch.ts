import {
  dispatchApi,
  driverApi,
  type GetDispatchBoardParams,
} from "@/lib/api/dispatch";
import type { MarkDeliveredRequest } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const dispatchKeys = {
  all: ["dispatch"] as const,
  board: (params: GetDispatchBoardParams) => ["dispatch", "board", params] as const,
  drop: (id: string) => ["dispatch", "drop", id] as const,
  drivers: ["dispatch", "drivers"] as const,
  driverToday: ["driver", "drops", "today"] as const,
  driverDrop: (id: string) => ["driver", "drop", id] as const,
};

// ── Dispatch Board Queries & Mutations ────────────────────────────────────────

export function useDispatchDrivers() {
  return useQuery({
    queryKey: dispatchKeys.drivers,
    queryFn: () => dispatchApi.getDrivers(),
    staleTime: 60 * 1000,
  });
}

export function useDispatchBoard(
  params: GetDispatchBoardParams,
  options?: { refetchInterval?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchKeys.board(params),
    queryFn: () => dispatchApi.getBoard(params),
    enabled: Boolean(params.deliveryDate) && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 25000,
  });
}

export function useDispatchDrop(dropId: string) {
  return useQuery({
    queryKey: dispatchKeys.drop(dropId),
    queryFn: () => dispatchApi.getDrop(dropId),
    enabled: Boolean(dropId),
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dropId, driverId }: { dropId: string; driverId: string }) =>
      dispatchApi.assignDriver(dropId, driverId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.all });
      queryClient.invalidateQueries({ queryKey: dispatchKeys.drop(vars.dropId) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useMarkDropReady() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dropId: string) => dispatchApi.markReady(dropId),
    onSuccess: (_data, dropId) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.all });
      queryClient.invalidateQueries({ queryKey: dispatchKeys.drop(dropId) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useMarkDropOutForDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dropId: string) => dispatchApi.markOutForDelivery(dropId),
    onSuccess: (_data, dropId) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.all });
      queryClient.invalidateQueries({ queryKey: dispatchKeys.drop(dropId) });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ── Driver Mobile Portal Queries & Mutations ──────────────────────────────────

export function useDriverTodayDrops(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: dispatchKeys.driverToday,
    queryFn: () => driverApi.getTodayDrops(),
    refetchInterval: options?.refetchInterval ?? 20000,
  });
}

export function useDriverDrop(dropId: string) {
  return useQuery({
    queryKey: dispatchKeys.driverDrop(dropId),
    queryFn: () => driverApi.getDrop(dropId),
    enabled: Boolean(dropId),
  });
}

export function useDriverDeliverDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      dropId,
      payload,
    }: {
      dropId: string;
      payload: MarkDeliveredRequest;
    }) => driverApi.markDelivered(dropId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: dispatchKeys.driverToday });
      queryClient.invalidateQueries({ queryKey: dispatchKeys.driverDrop(vars.dropId) });
      queryClient.invalidateQueries({ queryKey: dispatchKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDriverUploadPhoto() {
  return useMutation({
    mutationFn: ({ dropId, file }: { dropId: string; file: File }) =>
      driverApi.uploadPhoto(dropId, file),
  });
}
