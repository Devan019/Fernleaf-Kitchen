import { kitchenApi, type GetKitchenBoardParams } from "@/lib/api/kitchen";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const kitchenKeys = {
  all: ["kitchen"] as const,
  board: (params: GetKitchenBoardParams) => ["kitchen", "board", params] as const,
};

// ── Query Hooks ──────────────────────────────────────────────────────────────

export function useKitchenBoard(
  params: GetKitchenBoardParams,
  options?: { refetchInterval?: number }
) {
  return useQuery({
    queryKey: kitchenKeys.board(params),
    queryFn: () => kitchenApi.getBoard(params),
    enabled: Boolean(params.deliveryDate),
    refetchInterval: options?.refetchInterval ?? 30000, // Background refresh every 30s
  });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────────

export function useStartKitchenUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitId: string) => kitchenApi.startUnit(unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCompleteKitchenUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitId: string) => kitchenApi.completeUnit(unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useForceCompleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => kitchenApi.forceCompleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
