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
