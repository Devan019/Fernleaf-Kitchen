import { client } from "./client";
import type {
  DeliveryDrop,
  DeliveryDropStatus,
  DispatchBoardResponse,
  DispatchDropDetail,
  DriverTodayDropsResponse,
  MarkDeliveredRequest,
  UploadPhotoResponse,
} from "@/types";

export interface GetDispatchBoardParams {
  deliveryDate: string; // YYYY-MM-DD
  status?: DeliveryDropStatus;
  driverId?: string;
}

export const dispatchApi = {
  /**
   * GET /api/dispatch/board
   * Retrieves delivery drops for a delivery date ordered by delivery time ascending.
   */
  getBoard: async (params: GetDispatchBoardParams): Promise<DispatchBoardResponse> => {
    const qs = new URLSearchParams();
    qs.set("deliveryDate", params.deliveryDate);
    if (params.status) qs.set("status", params.status);
    if (params.driverId) qs.set("driverId", params.driverId);
    return client.get<DispatchBoardResponse>(`/api/dispatch/board?${qs.toString()}`);
  },

  /**
   * GET /api/dispatch/drivers
   * Retrieves active staff users with DRIVER role for drop assignments.
   */
  getDrivers: async (): Promise<{ id: string; name: string; email: string }[]> => {
    return client.get<{ id: string; name: string; email: string }[]>("/api/dispatch/drivers");
  },

  /**
   * GET /api/dispatch/drops/:dropId
   * Detailed operational information for a delivery drop with attached orders.
   */
  getDrop: async (dropId: string): Promise<DispatchDropDetail> => {
    return client.get<DispatchDropDetail>(`/api/dispatch/drops/${dropId}`);
  },

  /**
   * POST /api/dispatch/drops/:dropId/driver
   * Assigns a driver staff member to a delivery drop.
   */
  assignDriver: async (
    dropId: string,
    driverId: string
  ): Promise<{ id: string; driverId: string; status: DeliveryDropStatus }> => {
    return client.post(`/api/dispatch/drops/${dropId}/driver`, { driverId });
  },

  /**
   * POST /api/dispatch/drops/:dropId/ready
   * Transitions an eligible drop from KITCHEN_READY to DISPATCH_READY.
   */
  markReady: async (dropId: string): Promise<DeliveryDrop> => {
    return client.post(`/api/dispatch/drops/${dropId}/ready`);
  },

  /**
   * POST /api/dispatch/orders/:orderId/ready
   * Convenience route to mark the drop containing an order as DISPATCH_READY.
   */
  markOrderReady: async (orderId: string): Promise<DeliveryDrop> => {
    return client.post(`/api/dispatch/orders/${orderId}/ready`);
  },

  /**
   * POST /api/dispatch/drops/:dropId/out-for-delivery
   * Transitions a DISPATCH_READY drop to OUT_FOR_DELIVERY.
   */
  markOutForDelivery: async (dropId: string): Promise<DeliveryDrop> => {
    return client.post(`/api/dispatch/drops/${dropId}/out-for-delivery`);
  },
};

export const driverApi = {
  /**
   * GET /api/driver/drops/today
   * Retrieves drops assigned to the calling driver for today.
   */
  getTodayDrops: async (): Promise<DriverTodayDropsResponse> => {
    return client.get<DriverTodayDropsResponse>("/api/driver/drops/today");
  },

  /**
   * GET /api/driver/drops/:dropId
   * Returns operational drop details for the assigned driver.
   */
  getDrop: async (dropId: string): Promise<DispatchDropDetail> => {
    return client.get<DispatchDropDetail>(`/api/driver/drops/${dropId}`);
  },

  /**
   * POST /api/driver/drops/:dropId/deliver
   * Transitions the drop to DELIVERED. Computes isOnTime and records completion notes.
   */
  markDelivered: async (
    dropId: string,
    payload: MarkDeliveredRequest
  ): Promise<DeliveryDrop> => {
    return client.post<DeliveryDrop>(`/api/driver/drops/${dropId}/deliver`, payload);
  },

  /**
   * POST /api/driver/drops/:dropId/delivery-photo
   * Uploads proof-of-delivery image.
   */
  uploadPhoto: async (dropId: string, file: File): Promise<UploadPhotoResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post<UploadPhotoResponse>(
      `/api/driver/drops/${dropId}/delivery-photo`,
      formData
    );
  },
};
