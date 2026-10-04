export type KitchenUnitStatus = "PENDING" | "STARTED" | "DONE";

export type KitchenUnitOperationalStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "LATE"
  | "COMPLETED";

export interface KitchenSelectedOption {
  optionId: string;
  optionName: string;
  optionGroupName: string;
  portionSizeName?: string | null;
}

export interface KitchenUnitDish {
  id: string;
  name: string;
  sku?: string | null;
}

export interface KitchenStationRef {
  id: string;
  name: string;
}

export interface KitchenUnit {
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
  dish: KitchenUnitDish;
  quantity: number;
  selectedOptions: KitchenSelectedOption[];
  station?: KitchenStationRef | null;
  status: KitchenUnitStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  startedByUser?: { id: string; name: string } | null;
  completedByUser?: { id: string; name: string } | null;
  plannedKitchenReadyAt?: string | null;
  plannedDispatchReadyAt?: string | null;
  deliveryDate: string;
  deliveryTime?: string | null;
  isLate: boolean;
  isAtRisk: boolean;
  operationalStatus: KitchenUnitOperationalStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface KitchenStationGroup {
  id: string;
  name: string;
  unitsCount: number;
  units: KitchenUnit[];
}

export interface KitchenBoardResponse {
  deliveryDate: string;
  totalUnits: number;
  stations: KitchenStationGroup[];
}

export interface ForceCompleteOrderResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  kitchenStartedAt?: string | null;
  kitchenReadyAt?: string | null;
  units: KitchenUnit[];
}
