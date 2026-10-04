import type { PaginationMeta } from "./index";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface EmailDomain {
  id: string;
  domain: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryAddress {
  id: string;
  companyId: string;
  label: string;
  street: string;
  unit?: string | null;
  city: string;
  postcode: string;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyHoliday {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface DeliveryDefaults {
  defaultDeliveryTime?: string | null;
  leaveKitchenMinutes?: number;
  defaultPackagingType?: string | null;
  standingDriverInstructions?: string | null;
  defaultDriverId?: string | null;
  defaultDriver?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
}

export interface Company {
  id: string;
  name: string;
  isActive: boolean;
  priceTierId?: string | null;
  priceTier?: {
    id: string;
    name: string;
  } | null;
  ownerId?: string | null;
  owner?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  employeeCount?: number;
  emailDomains?: (string | EmailDomain)[];
  billingContact?: BillingContact | null;
  workingDays?: DayOfWeek[];
  deliveryDefaults?: DeliveryDefaults | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyDetail extends Company {
  billingContact: BillingContact | null;
  workingDays: DayOfWeek[];
  deliveryDefaults: DeliveryDefaults | null;
  employeeCount: number;
  emailDomains: EmailDomain[];
  deliveryAddresses: DeliveryAddress[];
  holidays: CompanyHoliday[];
  hiddenCategoryIds: string[];
  hiddenDishIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCompanies {
  data: Company[];
  meta: PaginationMeta;
}

export interface CreateCompanyRequest {
  name: string;
  domains?: string[];
  billingContactName?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
  workingDays?: DayOfWeek[];
  defaultDeliveryTime?: string;
  leaveKitchenMinutes?: number;
  defaultPackagingType?: string;
  standingDriverInstructions?: string;
  defaultDriverId?: string;
  priceTierId?: string;
  isActive?: boolean;
}

export interface UpdateCompanyRequest {
  name?: string;
  defaultDeliveryTime?: string;
  leaveKitchenMinutes?: number;
  defaultPackagingType?: string;
  standingDriverInstructions?: string;
  defaultDriverId?: string | null;
  priceTierId?: string | null;
  isActive?: boolean;
}

export interface CreateDeliveryAddressRequest {
  label: string;
  street: string;
  unit?: string;
  city: string;
  postcode: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface UpdateDeliveryAddressRequest {
  label?: string;
  street?: string;
  unit?: string | null;
  city?: string;
  postcode?: string;
  deliveryInstructions?: string | null;
  isDefault?: boolean;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
  description?: string;
}

export interface UpdateHolidayRequest {
  date?: string;
  name?: string;
  description?: string;
}

export interface UpdateBillingContactRequest {
  billingContactName?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
}

export interface UpdateDeliveryDefaultsRequest {
  defaultDeliveryTime?: string;
  leaveKitchenMinutes?: number;
  defaultPackagingType?: string;
  standingDriverInstructions?: string;
  defaultDriverId?: string | null;
}

export interface DeliveryAvailabilityResponse {
  allowed: boolean;
  reason?: string;
}

export interface CsvImportError {
  row: number;
  error: string;
}

export interface CsvImportResponse {
  totalRows: number;
  imported: number;
  failed: number;
  errors: CsvImportError[];
}
