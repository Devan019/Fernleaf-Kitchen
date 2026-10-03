import { DeliveryDropStatus, FulfillmentStatus } from '../../../generated/prisma/enums.js';

export { DeliveryDropStatus, FulfillmentStatus };

export interface DispatchDropAddress {
  street: string;
  unit: string | null;
  city: string;
  postcode: string;
  deliveryInstructions: string | null;
}

export interface DispatchBoardDropItem {
  id: string;
  deliveryDate: string;
  deliveryTime: string;
  company: {
    id: string;
    name: string;
  };
  address: DispatchDropAddress;
  driver: {
    id: string;
    name: string;
    email?: string;
  } | null;
  status: DeliveryDropStatus;
  ordersCount: number;
  dispatchReadyAt: Date | null;
  outForDeliveryAt: Date | null;
  deliveredAt: Date | null;
  deliveredNote: string | null;
  deliveredPhotoUrl: string | null;
  isOnTime: boolean | null;
  canMarkReady: boolean;
  canMarkOutForDelivery: boolean;
  canDeliver: boolean;
}

export interface DispatchBoardResponse {
  deliveryDate: string;
  drops: DispatchBoardDropItem[];
}

export interface DriverDropCardItem {
  id: string;
  deliveryTime: string;
  company: {
    id: string;
    name: string;
  };
  address: DispatchDropAddress;
  ordersCount: number;
  status: DeliveryDropStatus;
  isOnTime: boolean | null;
  canDeliver: boolean;
}

export interface DriverTodayDropsResponse {
  date: string;
  drops: DriverDropCardItem[];
}

export interface DriverDropOrderDetail {
  id: string;
  orderNumber: string;
  employeeName: string;
  packagingType: string;
  deliveryInstructions: string | null;
  itemsCount: number;
}

export interface DriverDropDetailResponse {
  id: string;
  deliveryDate: string;
  deliveryTime: string;
  status: DeliveryDropStatus;
  company: {
    id: string;
    name: string;
    standingDriverInstructions: string | null;
  };
  address: DispatchDropAddress;
  ordersCount: number;
  orders: DriverDropOrderDetail[];
  isOnTime: boolean | null;
  dispatchReadyAt: Date | null;
  outForDeliveryAt: Date | null;
  deliveredAt: Date | null;
  deliveredNote: string | null;
  deliveredPhotoUrl: string | null;
  canDeliver: boolean;
}

export interface DropStatusHistoryItem {
  id: string;
  fromStatus: DeliveryDropStatus | null;
  toStatus: DeliveryDropStatus;
  changedByUser: {
    id: string;
    name: string;
  } | null;
  note: string | null;
  createdAt: Date;
}

export interface DispatchDropDetailResponse extends DispatchBoardDropItem {
  orders: Array<{
    id: string;
    orderNumber: string;
    employee: {
      id: string;
      name: string;
    };
    packagingType: string;
    deliveryInstructions: string | null;
    status: string;
    fulfillmentStatus: FulfillmentStatus;
    kitchenReadyAt: Date | null;
    total: string;
    itemsCount: number;
  }>;
  statusHistory: DropStatusHistoryItem[];
}
