import { DayOfWeek } from '../../../generated/prisma/enums.js';
import { PaginatedResult } from '../../../common/utils/pagination/index.js';

export interface CompanyDomainResponse {
  id: string;
  domain: string;
  companyId: string;
  createdAt: Date;
}

export interface DeliveryAddressResponse {
  id: string;
  companyId: string;
  label: string | null;
  street: string;
  unit: string | null;
  city: string;
  postcode: string;
  deliveryInstructions: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyHolidayResponse {
  id: string;
  companyId: string;
  date: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySummaryResponse {
  id: string;
  name: string;
  isActive: boolean;
  priceTierId: string | null;
  priceTier: {
    id: string;
    name: string;
  } | null;
  ownerId: string | null;
  owner: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  employeeCount: number;
  emailDomains: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyDetailResponse {
  id: string;
  name: string;
  isActive: boolean;
  billingContact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  workingDays: DayOfWeek[];
  deliveryDefaults: {
    defaultDeliveryTime: string | null;
    leaveKitchenMinutes: number;
    defaultPackagingType: string | null;
    standingDriverInstructions: string | null;
    defaultDriverId: string | null;
    defaultDriver: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  priceTierId: string | null;
  priceTier: {
    id: string;
    name: string;
  } | null;
  ownerId: string | null;
  owner: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  employeeCount: number;
  emailDomains: CompanyDomainResponse[];
  deliveryAddresses: DeliveryAddressResponse[];
  holidays: CompanyHolidayResponse[];
  hiddenCategoryIds: string[];
  hiddenDishIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedCompaniesResponse = PaginatedResult<CompanySummaryResponse>;
