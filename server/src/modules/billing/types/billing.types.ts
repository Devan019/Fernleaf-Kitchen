import {
  BillingAdjustmentType,
  InvoiceStatus,
  OrderStatus,
} from '../../../generated/prisma/enums.js';
import type { PaginationMeta } from '../../../common/utils/pagination/index.js';

export { BillingAdjustmentType, InvoiceStatus };

export interface CompanyBillingSummaryResponse {
  company: {
    id: string;
    name: string;
  };
  uninvoicedOrderCount: number;
  uninvoicedAmount: string;
  openInvoiceCount: number;
  openInvoiceAmount: string;
  paidInvoiceCount: number;
  paidAmount: string;
}

export interface PaginatedCompanyBillingSummariesResponse {
  data: CompanyBillingSummaryResponse[];
  meta: PaginationMeta;
}

export interface UninvoicedOrderSummary {
  id: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  deliveryDate: string;
  deliveryTime: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
}

export interface PaginatedUninvoicedOrdersResponse {
  company: {
    id: string;
    name: string;
  };
  orders: UninvoicedOrderSummary[];
  meta: PaginationMeta;
}

export interface InvoiceLineDetail {
  id: string;
  invoiceId: string;
  orderId: string;
  orderNumber: string;
  employeeName: string;
  deliveryDate: string;
  description: string;
  quantity: number;
  unitAmount: string;
  amount: string;
  createdAt: string;
}

export interface BillingAdjustmentDetail {
  id: string;
  invoiceId: string;
  orderId: string;
  orderNumber: string;
  type: BillingAdjustmentType;
  amount: string;
  reason: string;
  createdAt: string;
  createdByUserId: string | null;
  createdByUser: {
    id: string;
    name: string;
  } | null;
}

export interface InvoiceDetailResponse {
  id: string;
  invoiceNumber: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    billingContactName?: string | null;
    billingContactEmail?: string | null;
    billingContactPhone?: string | null;
  };
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  subtotal: string;
  adjustmentTotal: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  lines: InvoiceLineDetail[];
  adjustments: BillingAdjustmentDetail[];
}

export interface InvoiceSummaryResponse {
  id: string;
  invoiceNumber: string;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  subtotal: string;
  adjustmentTotal: string;
  total: string;
  lineCount: number;
  createdAt: string;
}

export interface PaginatedInvoicesResponse {
  data: InvoiceSummaryResponse[];
  meta: PaginationMeta;
}
