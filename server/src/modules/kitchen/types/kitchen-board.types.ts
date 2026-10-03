import { KitchenUnitStatus, OrderStatus } from '../../../generated/prisma/enums.js';

export type KitchenUnitOperationalStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'LATE'
  | 'COMPLETED';

export interface KitchenUnitSelectedOption {
  optionId: string;
  optionName: string;
  optionGroupName: string | null;
  portionSizeName: string | null;
}

export interface KitchenStationSummary {
  id: string | null;
  name: string;
}

export interface KitchenUserSummary {
  id: string;
  name: string;
}

export interface KitchenUnitResponse {
  unitId: string;
  orderId: string;
  orderNumber: string;
  company: {
    id: string;
    name: string;
  };
  employee: {
    id: string;
    name: string;
  };
  dish: {
    id: string;
    name: string;
    sku: string | null;
  };
  quantity: number;
  selectedOptions: KitchenUnitSelectedOption[];
  station: KitchenStationSummary;
  status: KitchenUnitStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  startedByUser: KitchenUserSummary | null;
  completedByUser: KitchenUserSummary | null;
  plannedKitchenReadyAt: Date | null;
  plannedDispatchReadyAt: Date | null;
  deliveryDate: string;
  deliveryTime: string;
  isLate: boolean;
  isAtRisk: boolean;
  operationalStatus: KitchenUnitOperationalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenStationGroup {
  id: string | null;
  name: string;
  unitsCount: number;
  units: KitchenUnitResponse[];
}

export interface KitchenBoardResponse {
  deliveryDate: string;
  stations: KitchenStationGroup[];
  totalUnits: number;
}

export interface OrderKitchenForceCompleteResult {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  kitchenStartedAt: Date | null;
  kitchenReadyAt: Date | null;
  units: KitchenUnitResponse[];
}
