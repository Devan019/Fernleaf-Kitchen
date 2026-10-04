import { client } from "./client";
import type {
  CompanyDetail,
  CompanyHoliday,
  CreateCompanyRequest,
  CreateDeliveryAddressRequest,
  CreateHolidayRequest,
  CsvImportResponse,
  DayOfWeek,
  DeliveryAddress,
  DeliveryAvailabilityResponse,
  EmailDomain,
  PaginatedCompanies,
  UpdateBillingContactRequest,
  UpdateCompanyRequest,
  UpdateDeliveryAddressRequest,
  UpdateDeliveryDefaultsRequest,
  UpdateHolidayRequest,
} from "@/types";

export interface ListCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  priceTierId?: string;
}

export const companiesApi = {
  /**
   * GET /api/companies
   * Lists customer companies with pagination, search, price tier filter, and active status filters.
   */
  list: async (params: ListCompaniesParams = {}): Promise<PaginatedCompanies> => {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    if (params.priceTierId) qs.set("priceTierId", params.priceTierId);
    const query = qs.toString();
    const res = await client.get<any>(`/api/companies${query ? `?${query}` : ""}`);

    if (Array.isArray(res)) {
      return {
        data: res,
        meta: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          total: res.length,
          totalPages: Math.ceil(res.length / (params.limit ?? 20)) || 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return {
      data: Array.isArray(res?.data) ? res.data : [],
      meta: res?.meta ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  /**
   * GET /api/companies/:id
   * Retrieves full configuration details for a company.
   */
  getById: (id: string): Promise<CompanyDetail> =>
    client.get<CompanyDetail>(`/api/companies/${id}`),

  /**
   * POST /api/companies
   * Creates a new customer company.
   */
  create: (data: CreateCompanyRequest): Promise<CompanyDetail> =>
    client.post<CompanyDetail>("/api/companies", data),

  /**
   * PATCH /api/companies/:id
   * Updates company properties.
   */
  update: (id: string, data: UpdateCompanyRequest): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${id}`, data),

  /**
   * DELETE /api/companies/:id
   * Soft-deactivates a company by setting isActive: false.
   */
  deactivate: (id: string): Promise<CompanyDetail> =>
    client.delete<CompanyDetail>(`/api/companies/${id}`),

  /**
   * POST /api/companies/:companyId/domains
   * Registers an email domain for the company.
   */
  addDomain: (companyId: string, domain: string): Promise<EmailDomain> =>
    client.post<EmailDomain>(`/api/companies/${companyId}/domains`, { domain }),

  /**
   * DELETE /api/companies/:companyId/domains/:domainId
   * Removes an email domain from the company.
   */
  removeDomain: (companyId: string, domainId: string): Promise<{ success: boolean; message?: string }> =>
    client.delete<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/domains/${domainId}`,
    ),

  /**
   * GET /api/companies/:companyId/addresses
   * Lists all delivery addresses associated with a company.
   */
  listAddresses: async (companyId: string): Promise<DeliveryAddress[]> => {
    const res = await client.get<any>(`/api/companies/${companyId}/addresses`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },

  /**
   * POST /api/companies/:companyId/addresses
   * Adds a new delivery address to a company.
   */
  addAddress: (companyId: string, data: CreateDeliveryAddressRequest): Promise<DeliveryAddress> =>
    client.post<DeliveryAddress>(`/api/companies/${companyId}/addresses`, data),

  /**
   * PATCH /api/companies/:companyId/addresses/:addressId
   * Updates an existing delivery address.
   */
  updateAddress: (
    companyId: string,
    addressId: string,
    data: UpdateDeliveryAddressRequest,
  ): Promise<DeliveryAddress> =>
    client.patch<DeliveryAddress>(`/api/companies/${companyId}/addresses/${addressId}`, data),

  /**
   * DELETE /api/companies/:companyId/addresses/:addressId
   * Deletes a delivery address.
   */
  deleteAddress: (companyId: string, addressId: string): Promise<{ success: boolean; message?: string }> =>
    client.delete<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/addresses/${addressId}`,
    ),

  /**
   * PATCH /api/companies/:companyId/billing-contact
   * Updates billing contact information.
   */
  updateBillingContact: (
    companyId: string,
    data: UpdateBillingContactRequest,
  ): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${companyId}/billing-contact`, data),

  /**
   * PATCH /api/companies/:companyId/owner
   * Sets or replaces company owner.
   */
  setOwner: (companyId: string, ownerId: string): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${companyId}/owner`, { ownerId }),

  /**
   * PATCH /api/companies/:companyId/calendar
   * Configures company operational delivery working days.
   */
  updateCalendar: (companyId: string, workingDays: DayOfWeek[]): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${companyId}/calendar`, { workingDays }),

  /**
   * GET /api/companies/:companyId/holidays
   * Lists registered delivery holidays for the company.
   */
  listHolidays: async (companyId: string): Promise<CompanyHoliday[]> => {
    const res = await client.get<any>(`/api/companies/${companyId}/holidays`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },

  /**
   * POST /api/companies/:companyId/holidays
   * Adds a delivery holiday for the company.
   */
  addHoliday: (companyId: string, data: CreateHolidayRequest): Promise<CompanyHoliday> =>
    client.post<CompanyHoliday>(`/api/companies/${companyId}/holidays`, data),

  /**
   * PATCH /api/companies/:companyId/holidays/:holidayId
   * Updates an existing company holiday.
   */
  updateHoliday: (
    companyId: string,
    holidayId: string,
    data: UpdateHolidayRequest,
  ): Promise<CompanyHoliday> =>
    client.patch<CompanyHoliday>(`/api/companies/${companyId}/holidays/${holidayId}`, data),

  /**
   * DELETE /api/companies/:companyId/holidays/:holidayId
   * Deletes a company holiday.
   */
  deleteHoliday: (companyId: string, holidayId: string): Promise<{ success: boolean; message?: string }> =>
    client.delete<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/holidays/${holidayId}`,
    ),

  /**
   * PATCH /api/companies/:companyId/delivery-defaults
   * Updates company delivery defaults.
   */
  updateDeliveryDefaults: (
    companyId: string,
    data: UpdateDeliveryDefaultsRequest,
  ): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${companyId}/delivery-defaults`, data),

  /**
   * PATCH /api/companies/:companyId/price-tier
   * Assigns or clears the custom price tier for the company. Pass null to clear.
   */
  assignPriceTier: (companyId: string, priceTierId: string | null): Promise<CompanyDetail> =>
    client.patch<CompanyDetail>(`/api/companies/${companyId}/price-tier`, { priceTierId }),

  /**
   * POST /api/companies/:companyId/hidden-categories/:categoryId
   * Hides a menu category from this company.
   */
  hideCategory: (
    companyId: string,
    categoryId: string,
  ): Promise<{ success: boolean; message?: string }> =>
    client.post<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/hidden-categories/${categoryId}`,
    ),

  /**
   * DELETE /api/companies/:companyId/hidden-categories/:categoryId
   * Unhides a menu category for this company.
   */
  unhideCategory: (
    companyId: string,
    categoryId: string,
  ): Promise<{ success: boolean; message?: string }> =>
    client.delete<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/hidden-categories/${categoryId}`,
    ),

  /**
   * POST /api/companies/:companyId/hidden-dishes/:dishId
   * Hides a dish from this company.
   */
  hideDish: (
    companyId: string,
    dishId: string,
  ): Promise<{ success: boolean; message?: string }> =>
    client.post<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/hidden-dishes/${dishId}`,
    ),

  /**
   * DELETE /api/companies/:companyId/hidden-dishes/:dishId
   * Unhides a dish for this company.
   */
  unhideDish: (
    companyId: string,
    dishId: string,
  ): Promise<{ success: boolean; message?: string }> =>
    client.delete<{ success: boolean; message?: string }>(
      `/api/companies/${companyId}/hidden-dishes/${dishId}`,
    ),

  /**
   * GET /api/companies/:companyId/delivery-availability?date=YYYY-MM-DD
   * Checks whether delivery is available for this company on date.
   */
  checkDeliveryAvailability: (
    companyId: string,
    date: string,
  ): Promise<DeliveryAvailabilityResponse> =>
    client.get<DeliveryAvailabilityResponse>(
      `/api/companies/${companyId}/delivery-availability?date=${encodeURIComponent(date)}`,
    ),

  /**
   * POST /api/companies/:companyId/employees/import
   * Bulk imports employees from CSV text.
   */
  importEmployeesCsv: (companyId: string, csvContent: string): Promise<CsvImportResponse> =>
    client.post<CsvImportResponse>(`/api/companies/${companyId}/employees/import`, { csvContent }),
};
