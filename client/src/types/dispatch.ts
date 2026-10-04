export type DeliveryDropStatus =
  | "KITCHEN_READY"
  | "DISPATCH_READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

export interface DeliveryDropAddress {
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  postcode?: string | null;
  deliveryInstructions?: string | null;
}

export interface DeliveryDropCompany {
  id: string;
  name: string;
  standingDriverInstructions?: string | null;
}

export interface DeliveryDropDriver {
  id: string;
  name: string;
}

export interface DeliveryDrop {
  id: string;
  deliveryDate: string;
  deliveryTime: string;
  company: DeliveryDropCompany;
  address: DeliveryDropAddress;
  driver?: DeliveryDropDriver | null;
  status: DeliveryDropStatus;
  ordersCount: number;
  dispatchReadyAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  deliveredNote?: string | null;
  deliveredPhotoUrl?: string | null;
  isOnTime?: boolean | null;
  canMarkReady: boolean;
  canMarkOutForDelivery: boolean;
  canDeliver: boolean;
}

export interface DispatchDropOrder {
  id: string;
  orderNumber: string;
  employeeName: string;
  packagingType?: string | null;
  deliveryInstructions?: string | null;
  itemsCount: number;
  subtotal?: string | number;
  total?: string | number;
}

export interface DispatchDropDetail extends DeliveryDrop {
  orders: DispatchDropOrder[];
}

export interface DispatchBoardResponse {
  deliveryDate: string;
  drops: DeliveryDrop[];
}

export interface DriverTodayDropsResponse {
  date: string;
  drops: DeliveryDrop[];
}

export interface AssignDriverRequest {
  driverId: string;
}

export interface MarkDeliveredRequest {
  note?: string;
  photoUrl?: string;
}

export interface UploadPhotoResponse {
  photoUrl: string;
}
