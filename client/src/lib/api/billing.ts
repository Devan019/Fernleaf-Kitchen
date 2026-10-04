import { client } from "./client";
import type {
  BillingAdjustment,
  CompanyBillingSummary,
  CreateAdjustmentRequest,
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoiceStatus,
  PaginatedCompanyBillingSummaries,
  PaginatedInvoices,
  UninvoicedOrdersResponse,
} from "@/types";

export interface ListCompanyBillingParams {
  page?: number;
  limit?: number;
  search?: string;
  hasUninvoicedOrders?: boolean;
  hasOpenInvoices?: boolean;
}

export interface ListUninvoicedOrdersParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  companyId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const billingApi = {
  /**
   * GET /api/billing/companies
   * Lists companies with summarized financial metrics.
   */
  getCompanies: async (
    params: ListCompanyBillingParams = {}
  ): Promise<PaginatedCompanyBillingSummaries> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (typeof params.hasUninvoicedOrders === "boolean") {
      qs.set("hasUninvoicedOrders", String(params.hasUninvoicedOrders));
    }
    if (typeof params.hasOpenInvoices === "boolean") {
      qs.set("hasOpenInvoices", String(params.hasOpenInvoices));
    }
    const query = qs.toString();
    return client.get<PaginatedCompanyBillingSummaries>(
      `/api/billing/companies${query ? `?${query}` : ""}`
    );
  },

  /**
   * GET /api/billing/companies/:companyId
   * Retrieves billing summary metrics for a specific company.
   */
  getCompanySummary: async (companyId: string): Promise<CompanyBillingSummary> => {
    return client.get<CompanyBillingSummary>(`/api/billing/companies/${companyId}`);
  },

  /**
   * GET /api/billing/companies/:companyId/uninvoiced-orders
   * Lists eligible uninvoiced confirmed orders for a company.
   */
  getUninvoicedOrders: async (
    companyId: string,
    params: ListUninvoicedOrdersParams = {}
  ): Promise<UninvoicedOrdersResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    if (params.search) qs.set("search", params.search);
    const query = qs.toString();
    return client.get<UninvoicedOrdersResponse>(
      `/api/billing/companies/${companyId}/uninvoiced-orders${query ? `?${query}` : ""}`
    );
  },

  /**
   * POST /api/billing/companies/:companyId/invoices
   * Groups selected confirmed orders into a single immutable invoice.
   */
  createInvoice: async (
    companyId: string,
    payload: CreateInvoiceRequest
  ): Promise<InvoiceDetail> => {
    return client.post<InvoiceDetail>(
      `/api/billing/companies/${companyId}/invoices`,
      payload
    );
  },

  /**
   * GET /api/billing/invoices
   * Lists invoices with pagination and filters.
   */
  getInvoices: async (
    params: ListInvoicesParams = {}
  ): Promise<PaginatedInvoices> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.companyId) qs.set("companyId", params.companyId);
    if (params.status) qs.set("status", params.status);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    if (params.search) qs.set("search", params.search);
    const query = qs.toString();
    return client.get<PaginatedInvoices>(
      `/api/billing/invoices${query ? `?${query}` : ""}`
    );
  },

  /**
   * GET /api/billing/invoices/:invoiceId
   * Retrieves full details for a single invoice including lines and adjustments.
   */
  getInvoice: async (invoiceId: string): Promise<InvoiceDetail> => {
    return client.get<InvoiceDetail>(`/api/billing/invoices/${invoiceId}`);
  },

  /**
   * POST /api/billing/invoices/:invoiceId/pay
   * Marks an OPEN invoice as PAID.
   */
  payInvoice: async (invoiceId: string): Promise<InvoiceDetail> => {
    return client.post<InvoiceDetail>(`/api/billing/invoices/${invoiceId}/pay`);
  },

  /**
   * POST /api/billing/invoices/:invoiceId/adjustments
   * Records a debit/credit post-invoice adjustment.
   */
  createAdjustment: async (
    invoiceId: string,
    payload: CreateAdjustmentRequest
  ): Promise<BillingAdjustment> => {
    return client.post<BillingAdjustment>(
      `/api/billing/invoices/${invoiceId}/adjustments`,
      payload
    );
  },
};
