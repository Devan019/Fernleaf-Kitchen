import { client } from "./client";
import type {
  AdminOverrideDeliveryRequest,
  CreateOrderLine,
  CreateOrderRequest,
  CutoffCheckResponse,
  OrderDetail,
  OrderStatus,
  PaginatedOrders,
  ProcessCutoffResponse,
  UpdateOrderRequest,
} from "@/types";

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  companyId?: string;
  employeeId?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  startDate?: string;
  endDate?: string;
  isInvoiced?: boolean;
  search?: string;
}

export const ordersApi = {
  /**
   * GET /api/order
   * Retrieves a paginated list of orders with filters.
   */
  list: async (params: ListOrdersParams = {}): Promise<PaginatedOrders> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    if (params.companyId) qs.set("companyId", params.companyId);
    if (params.employeeId) qs.set("employeeId", params.employeeId);
    const dateFrom = params.deliveryDateFrom || params.startDate;
    const dateTo = params.deliveryDateTo || params.endDate;
    if (dateFrom) qs.set("deliveryDateFrom", dateFrom);
    if (dateTo) qs.set("deliveryDateTo", dateTo);
    if (params.isInvoiced !== undefined) qs.set("isInvoiced", String(params.isInvoiced));
    if (params.search) qs.set("search", params.search);
    const query = qs.toString();
    const res = await client.get<any>(`/api/order${query ? `?${query}` : ""}`);

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
   * GET /api/order/:id
   * Retrieves complete order details.
   */
  getById: (id: string): Promise<OrderDetail> =>
    client.get<OrderDetail>(`/api/order/${id}`),

  /**
   * POST /api/order
   * Creates a new customer order on behalf of an employee.
   */
  create: (data: CreateOrderRequest): Promise<OrderDetail> =>
    client.post<OrderDetail>("/api/order", data),

  /**
   * POST /api/order/:id/place
   * Transitions a DRAFT order to PLACED status.
   */
  place: (id: string): Promise<OrderDetail> =>
    client.post<OrderDetail>(`/api/order/${id}/place`),

  /**
   * PATCH /api/order/:id
   * Modifies order items or delivery details before cut-off deadline.
   */
  update: (id: string, data: UpdateOrderRequest): Promise<OrderDetail> =>
    client.patch<OrderDetail>(`/api/order/${id}`, data),

  /**
   * PATCH /api/order/:id/delivery
   * Admin override: updates delivery details after cut-off.
   */
  overrideDelivery: (
    id: string,
    data: AdminOverrideDeliveryRequest,
  ): Promise<OrderDetail> =>
    client.patch<OrderDetail>(`/api/order/${id}/delivery`, data),

  /**
   * POST /api/order/:id/cancel
   * Cancels an order.
   */
  cancel: (id: string, reason?: string): Promise<OrderDetail> =>
    client.post<OrderDetail>(`/api/order/${id}/cancel`, { reason }),

  /**
   * POST /api/order/:id/lines
   * Adds a line item to an order before cut-off.
   */
  addLine: (id: string, line: CreateOrderLine): Promise<OrderDetail> =>
    client.post<OrderDetail>(`/api/order/${id}/lines`, line),

  /**
   * PATCH /api/order/:id/lines/:lineId
   * Updates an order line item before cut-off.
   */
  updateLine: (
    id: string,
    lineId: string,
    line: Partial<CreateOrderLine>,
  ): Promise<OrderDetail> =>
    client.patch<OrderDetail>(`/api/order/${id}/lines/${lineId}`, line),

  /**
   * DELETE /api/order/:id/lines/:lineId
   * Removes a line item from an order before cut-off.
   */
  removeLine: (id: string, lineId: string): Promise<OrderDetail> =>
    client.delete<OrderDetail>(`/api/order/${id}/lines/${lineId}`),

  /**
   * GET /api/order/cutoff/check?deliveryDate=YYYY-MM-DD
   * Calculates exact cut-off deadline for delivery date.
   */
  checkCutoff: (deliveryDate: string): Promise<CutoffCheckResponse> =>
    client.get<CutoffCheckResponse>(
      `/api/order/cutoff/check?deliveryDate=${encodeURIComponent(deliveryDate)}`,
    ),

  /**
   * POST /api/order/cutoff/process
   * Manually triggers cut-off execution for a delivery date.
   */
  processCutoff: (deliveryDate: string): Promise<ProcessCutoffResponse> =>
    client.post<ProcessCutoffResponse>("/api/order/cutoff/process", { deliveryDate }),
};
