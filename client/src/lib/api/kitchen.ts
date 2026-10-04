import { client } from "./client";
import type {
  ForceCompleteOrderResponse,
  KitchenBoardResponse,
  KitchenUnit,
} from "@/types";

export interface GetKitchenBoardParams {
  deliveryDate: string; // YYYY-MM-DD
  stationId?: string;
}

export const kitchenApi = {
  /**
   * GET /api/kitchen/board
   * Retrieves all kitchen preparation units for confirmed orders on a delivery date.
   */
  getBoard: async (params: GetKitchenBoardParams): Promise<KitchenBoardResponse> => {
    const qs = new URLSearchParams();
    qs.set("deliveryDate", params.deliveryDate);
    if (params.stationId) {
      qs.set("stationId", params.stationId);
    }
    return client.get<KitchenBoardResponse>(`/api/kitchen/board?${qs.toString()}`);
  },

  /**
   * POST /api/kitchen/units/:unitId/start
   * Transitions a PENDING kitchen unit to STARTED.
   */
  startUnit: async (unitId: string): Promise<KitchenUnit> => {
    return client.post<KitchenUnit>(`/api/kitchen/units/${unitId}/start`);
  },

  /**
   * POST /api/kitchen/units/:unitId/complete
   * Transitions a unit to DONE (from PENDING or STARTED).
   */
  completeUnit: async (unitId: string): Promise<KitchenUnit> => {
    return client.post<KitchenUnit>(`/api/kitchen/units/${unitId}/complete`);
  },

  /**
   * POST /api/kitchen/orders/:orderId/force-complete
   * Administrative override that marks all units for an order as DONE.
   */
  forceCompleteOrder: async (orderId: string): Promise<ForceCompleteOrderResponse> => {
    return client.post<ForceCompleteOrderResponse>(
      `/api/kitchen/orders/${orderId}/force-complete`
    );
  },
};
