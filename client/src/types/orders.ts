import type { PaginationMeta } from "./index";

export type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "CONFIRMED"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

export interface OrderDeliveryAddress {
  deliveryAddressId?: string | null;
  deliveryAddressLabel?: string | null;
  deliveryStreet?: string | null;
  deliveryUnit?: string | null;
  deliveryCity?: string | null;
  deliveryPostcode?: string | null;
  deliveryInstructions?: string | null;
}

export interface OrderOptionSnapshot {
  id: string;
  optionGroupId: string;
  optionGroupName: string;
  optionId: string;
  optionName: string;
  unitPrice: string | number;
  portionSizeId?: string | null;
  portionSizeName?: string | null;
  portionExtraCharge?: string | number | null;
  finalPrice: string | number;
}

export interface OrderCombinationSnapshot {
  id: string;
  quantity: number;
  unitPrice: string | number;
  combinationTotal: string | number;
  options: OrderOptionSnapshot[];
}

export interface OrderLine {
  id: string;
  dishId: string;
  dishName: string;
  dishSku?: string;
  unitPrice: string | number;
  quantity: number;
  lineTotal: string | number;
  combinations?: OrderCombinationSnapshot[];
}

export interface OrderStatusHistory {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string | null; // HH:mm
  status: OrderStatus;
  packagingType?: string | null;
  subtotal: string | number;
  total: string | number;
  isInvoiced: boolean;
  placedAt?: string | null;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
  linesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderDetail extends OrderSummary {
  deliveryAddress?: OrderDeliveryAddress | null;
  deliveryInstructions?: string | null;
  lines: OrderLine[];
  statusHistory?: OrderStatusHistory[];
}

export interface PaginatedOrders {
  data: OrderSummary[];
  meta: PaginationMeta;
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface CreateOrderOptionChoice {
  optionGroupId: string;
  optionId: string;
  portionSizeId?: string;
}

export interface CreateOrderCombination {
  quantity: number;
  options?: CreateOrderOptionChoice[];
}

export interface CreateOrderLine {
  dishId: string;
  quantity: number;
  combinations?: CreateOrderCombination[];
}

export interface CreateOrderRequest {
  employeeId: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string; // HH:mm
  deliveryAddressId?: string;
  packagingType?: string;
  deliveryInstructions?: string;
  status?: OrderStatus;
  lines: CreateOrderLine[];
}

export interface UpdateOrderRequest {
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddressId?: string;
  packagingType?: string;
  deliveryInstructions?: string;
  lines?: CreateOrderLine[];
}

export interface AdminOverrideDeliveryRequest {
  deliveryTime?: string;
  deliveryAddressId?: string;
  packagingType?: string;
  deliveryInstructions?: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface CutoffCheckResponse {
  deliveryDate: string;
  cutoffDateTime: string;
  isPastCutoff: boolean;
  kitchenWorkingDays: string[];
  workingDaysBeforeDelivery: number;
  cutoffTime: string;
  timezone: string;
}

export interface ProcessCutoffResponse {
  deliveryDate: string;
  cancelledDrafts: number;
  confirmedPlaced: number;
  processedAt: string;
}
