import type { PaginationMeta } from "./index";

export interface EmployeeCompany {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  email?: string | null;
  companyId: string;
  company?: EmployeeCompany;
  canChooseDeliveryAddress?: boolean;
  canChangeDeliveryTime?: boolean;
  canChangePackaging?: boolean;
  allergens?: Array<{ id: string; name: string }>;
  dietaryTags?: Array<{ id: string; name: string }>;
  isOwnerOfCompany?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedEmployees {
  data: EmployeeSummary[];
  meta: PaginationMeta;
}

export interface CreateEmployeeRequest {
  name: string;
  email?: string;
  companyId: string;
  canChooseDeliveryAddress?: boolean;
  canChangeDeliveryTime?: boolean;
  canChangePackaging?: boolean;
  allergenIds?: string[];
  dietaryTagIds?: string[];
  isActive?: boolean;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  companyId?: string;
  canChooseDeliveryAddress?: boolean;
  canChangeDeliveryTime?: boolean;
  canChangePackaging?: boolean;
  isActive?: boolean;
}

export interface UpdateEmployeePermissionsRequest {
  canChooseDeliveryAddress?: boolean;
  canChangeDeliveryTime?: boolean;
  canChangePackaging?: boolean;
}

export interface UpdateEmployeePreferencesRequest {
  allergenIds?: string[];
  dietaryTagIds?: string[];
}
