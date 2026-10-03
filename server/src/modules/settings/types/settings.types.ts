import { DayOfWeek } from '../../../generated/prisma/enums.js';

export { DayOfWeek };

export interface KitchenHolidayResponse {
  id: string;
  date: string; // 'YYYY-MM-DD'
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenSettingsResponse {
  workingDays: DayOfWeek[];
  cutOffTime: string;
  cutOffWorkingDays: number;
  timezone: string;
  holidays: KitchenHolidayResponse[];
  updatedAt: Date;
}

export interface KitchenSettingsConfig {
  cutoffTime: string;
  cutoffWorkingDays: number;
  kitchenWorkingDays: DayOfWeek[];
  timezone: string;
}
