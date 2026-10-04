import { ordersApi, type ListOrdersParams } from "@/lib/api/orders";
import type {
  AdminOverrideDeliveryRequest,
  CreateOrderLine,
  CreateOrderRequest,
  UpdateOrderRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const orderKeys = {
  all: ["orders"] as const,
  list: (params: ListOrdersParams = {}) => ["orders", "list", params] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
  cutoff: (deliveryDate: string) => ["orders", "cutoff", deliveryDate] as const,
};

// ── Query Hooks ──────────────────────────────────────────────────────────────

export function useOrders(
  params: ListOrdersParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.list(params),
    enabled: options?.enabled,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCutoffCheck(deliveryDate: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.cutoff(deliveryDate),
    queryFn: () => ordersApi.checkCutoff(deliveryDate),
    enabled: Boolean(deliveryDate && enabled),
  });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function usePlaceOrder(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => ordersApi.place(id ?? orderId ?? ""),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      const targetId = vars ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useUpdateOrder(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UpdateOrderRequest }) =>
      ordersApi.update(id ?? orderId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useAdminOverrideDelivery(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: string;
      data: AdminOverrideDeliveryRequest;
    }) => ordersApi.overrideDelivery(id ?? orderId ?? "", data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useCancelOrder(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id?: string; reason?: string }) =>
      ordersApi.cancel(id ?? orderId ?? "", reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useAddOrderLine(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, line }: { id?: string; line: CreateOrderLine }) =>
      ordersApi.addLine(id ?? orderId ?? "", line),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useUpdateOrderLine(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      lineId,
      line,
    }: {
      id?: string;
      lineId: string;
      line: Partial<CreateOrderLine>;
    }) => ordersApi.updateLine(id ?? orderId ?? "", lineId, line),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useRemoveOrderLine(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lineId }: { id?: string; lineId: string }) =>
      ordersApi.removeLine(id ?? orderId ?? "", lineId),
    onSuccess: (_data, vars) => {
      const targetId = vars.id ?? orderId;
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) });
      }
    },
  });
}

export function useProcessCutoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryDate: string) => ordersApi.processCutoff(deliveryDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
