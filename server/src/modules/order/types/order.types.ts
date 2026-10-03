import { OrderStatus } from '../../../generated/prisma/enums.js';
import { PaginatedResult } from '../../../common/utils/pagination/index.js';

export interface OrderAddressSnapshot {
  deliveryAddressId: string | null;
  deliveryAddressLabel: string | null;
  deliveryStreet: string;
  deliveryUnit: string | null;
  deliveryCity: string;
  deliveryPostcode: string;
  deliveryInstructions: string | null;
}

export interface OrderCombinationOptionResponse {
  id: string;
  optionGroupId: string | null;
  optionGroupName: string | null;
  optionId: string;
  optionName: string;
  unitPrice: string;
  portionSizeId: string | null;
  portionSizeName: string | null;
  portionExtraCharge: string;
  finalPrice: string;
}

export interface OrderLineCombinationResponse {
  id: string;
  quantity: number;
  unitPrice: string;
  combinationTotal: string;
  options: OrderCombinationOptionResponse[];
}

export interface OrderLineResponse {
  id: string;
  dishId: string;
  dishName: string;
  dishSku: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  combinations: OrderLineCombinationResponse[];
}

export interface OrderStatusHistoryResponse {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId: string | null;
  changedByUserName?: string | null;
  note: string | null;
  createdAt: Date;
}

export interface OrderSummaryResponse {
  id: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  deliveryDate: string;
  deliveryTime: string;
  status: OrderStatus;
  packagingType: string;
  deliveryAddress: OrderAddressSnapshot;
  subtotal: string;
  total: string;
  isInvoiced: boolean;
  createdByUserId: string | null;
  placedAt: Date | null;
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  linesCount: number;
}

export interface OrderDetailResponse extends OrderSummaryResponse {
  lines: OrderLineResponse[];
  statusHistory: OrderStatusHistoryResponse[];
}

export type PaginatedOrdersResponse = PaginatedResult<OrderSummaryResponse>;

export interface CutoffProcessResult {
  deliveryDate: string;
  cancelledDrafts: number;
  confirmedPlaced: number;
  processedAt: Date;
}

export interface CutoffCheckResult {
  deliveryDate: string;
  cutoffDateTime: Date;
  isPastCutoff: boolean;
  kitchenWorkingDays: string[];
  workingDaysBeforeDelivery: number;
  cutoffTime: string;
  timezone: string;
}
