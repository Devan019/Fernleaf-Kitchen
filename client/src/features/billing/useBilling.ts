import {
  billingApi,
  type ListCompanyBillingParams,
  type ListInvoicesParams,
  type ListUninvoicedOrdersParams,
} from "@/lib/api/billing";
import type {
  CreateAdjustmentRequest,
  CreateInvoiceRequest,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const billingKeys = {
  all: ["billing"] as const,
  companies: (params: ListCompanyBillingParams = {}) =>
    ["billing", "companies", params] as const,
  companySummary: (companyId: string) =>
    ["billing", "company", companyId, "summary"] as const,
  uninvoicedOrders: (
    companyId: string,
    params: ListUninvoicedOrdersParams = {}
  ) => ["billing", "company", companyId, "uninvoiced-orders", params] as const,
  invoices: (params: ListInvoicesParams = {}) =>
    ["billing", "invoices", params] as const,
  invoice: (invoiceId: string) => ["billing", "invoice", invoiceId] as const,
};

export function useCompanyBilling(
  params: ListCompanyBillingParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: billingKeys.companies(params),
    queryFn: () => billingApi.getCompanies(params),
    enabled: options?.enabled,
  });
}

export function useCompanyBillingSummary(
  companyId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: billingKeys.companySummary(companyId),
    queryFn: () => billingApi.getCompanySummary(companyId),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  });
}

export function useUninvoicedOrders(
  companyId: string,
  params: ListUninvoicedOrdersParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: billingKeys.uninvoicedOrders(companyId, params),
    queryFn: () => billingApi.getUninvoicedOrders(companyId, params),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  });
}

export function useInvoices(
  params: ListInvoicesParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: billingKeys.invoices(params),
    queryFn: () => billingApi.getInvoices(params),
    enabled: options?.enabled,
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: billingKeys.invoice(invoiceId),
    queryFn: () => billingApi.getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload: CreateInvoiceRequest;
    }) => billingApi.createInvoice(companyId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => billingApi.payInvoice(invoiceId),
    onSuccess: (data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
    },
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: CreateAdjustmentRequest;
    }) => billingApi.createAdjustment(invoiceId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoice(vars.invoiceId) });
    },
  });
}
