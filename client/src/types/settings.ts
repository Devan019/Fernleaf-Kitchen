import type { DayOfWeek } from "./companies";

export type { DayOfWeek };

export interface KitchenHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenSettings {
  workingDays: DayOfWeek[];
  cutOffTime: string; // HH:mm
  cutOffWorkingDays: number;
  timezone: string;
  holidays?: KitchenHoliday[];
}

export interface UpdateKitchenSettingsRequest {
  workingDays?: DayOfWeek[];
  cutOffTime?: string;
  cutOffWorkingDays?: number;
  timezone?: string;
}

export interface CreateKitchenHolidayRequest {
  date: string; // YYYY-MM-DD
  name: string;
  description?: string;
}

export interface UpdateKitchenHolidayRequest {
  date?: string;
  name?: string;
  description?: string;
}
