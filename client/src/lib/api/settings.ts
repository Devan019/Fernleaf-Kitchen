import { client } from "./client";
import type {
  CreateKitchenHolidayRequest,
  KitchenHoliday,
  KitchenSettings,
  UpdateKitchenHolidayRequest,
  UpdateKitchenSettingsRequest,
} from "@/types";

export const settingsApi = {
  /**
   * GET /api/settings/kitchen
   * Retrieves operational parameters including working days, cut-off rules, timezone, and holidays.
   */
  getKitchenSettings: async (): Promise<KitchenSettings> => {
    return client.get<KitchenSettings>("/api/settings/kitchen");
  },

  /**
   * PATCH /api/settings/kitchen
   * Updates platform-wide kitchen operational parameters in an atomic transaction.
   */
  updateKitchenSettings: async (
    payload: UpdateKitchenSettingsRequest
  ): Promise<KitchenSettings> => {
    return client.patch<KitchenSettings>("/api/settings/kitchen", payload);
  },

  /**
   * GET /api/settings/kitchen/holidays
   * Retrieves all registered platform-wide kitchen closure dates.
   */
  getHolidays: async (): Promise<KitchenHoliday[]> => {
    return client.get<KitchenHoliday[]>("/api/settings/kitchen/holidays");
  },

  /**
   * POST /api/settings/kitchen/holidays
   * Registers a new platform-wide kitchen holiday closure.
   */
  createHoliday: async (
    payload: CreateKitchenHolidayRequest
  ): Promise<KitchenHoliday> => {
    return client.post<KitchenHoliday>("/api/settings/kitchen/holidays", payload);
  },

  /**
   * PATCH /api/settings/kitchen/holidays/:id
   * Updates an existing kitchen holiday.
   */
  updateHoliday: async (
    id: string,
    payload: UpdateKitchenHolidayRequest
  ): Promise<KitchenHoliday> => {
    return client.patch<KitchenHoliday>(`/api/settings/kitchen/holidays/${id}`, payload);
  },

  /**
   * DELETE /api/settings/kitchen/holidays/:id
   * Removes a kitchen holiday closure.
   */
  deleteHoliday: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return client.delete<{ success: boolean; message: string }>(
      `/api/settings/kitchen/holidays/${id}`
    );
  },
};
