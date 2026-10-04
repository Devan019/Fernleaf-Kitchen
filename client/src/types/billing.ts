import type { PaginationMeta } from "./index";

export type InvoiceStatus = "OPEN" | "PAID" | "VOID";

export type BillingAdjustmentType = "DEBIT" | "CREDIT";

export interface CompanyBillingSummary {
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

export interface PaginatedCompanyBillingSummaries {
  data: CompanyBillingSummary[];
  meta: PaginationMeta;
}

export interface UninvoicedOrder {
  id: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  total: string;
  createdAt: string;
}

export interface UninvoicedOrdersResponse {
  company: {
    id: string;
    name: string;
  };
  orders: UninvoicedOrder[];
  meta: PaginationMeta;
}

export interface CreateInvoiceRequest {
  orderIds: string[];
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  orderId: string;
  orderNumber: string;
  employeeName: string;
  deliveryDate: string;
  description?: string;
  quantity: number;
  unitAmount: string;
  amount: string;
  createdAt: string;
}

export interface BillingAdjustment {
  id: string;
  invoiceId: string;
  orderId: string;
  orderNumber?: string;
  type: BillingAdjustmentType;
  amount: string;
  reason: string;
  createdAt: string;
  createdByUserId?: string;
  createdByUser?: {
    id: string;
    name: string;
  } | null;
}

export interface InvoiceCompany {
  id: string;
  name: string;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  billingContactPhone?: string | null;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  companyId: string;
  company: InvoiceCompany;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string | null;
  subtotal: string;
  adjustmentTotal: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  lines: InvoiceLine[];
  adjustments: BillingAdjustment[];
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string | null;
  subtotal: string;
  adjustmentTotal: string;
  total: string;
  linesCount?: number;
  createdAt: string;
}

export interface PaginatedInvoices {
  data: InvoiceSummary[];
  meta: PaginationMeta;
}

export interface CreateAdjustmentRequest {
  orderId: string;
  reason: string;
  type?: BillingAdjustmentType;
  amount?: string;
  newBillableAmount?: string;
}
