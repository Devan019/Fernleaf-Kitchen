import { PaginatedResult } from '../../../common/utils/pagination/index.js';

export interface EmployeeSummaryResponse {
  id: string;
  name: string;
  email: string | null;
  companyId: string;
  company: {
    id: string;
    name: string;
    isActive: boolean;
  };
  canChooseDeliveryAddress: boolean;
  canChangeDeliveryTime: boolean;
  canChangePackaging: boolean;
  allergens: {
    id: string;
    name: string;
  }[];
  dietaryTags: {
    id: string;
    name: string;
  }[];
  isOwnerOfCompany: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedEmployeesResponse = PaginatedResult<EmployeeSummaryResponse>;

export interface BulkImportRowError {
  row: number;
  errors: string[];
}

export interface BulkImportResultResponse {
  totalRows: number;
  imported: number;
  failed: number;
  errors: BulkImportRowError[];
}
