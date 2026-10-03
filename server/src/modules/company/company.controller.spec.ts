import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CompaniesController } from './company.controller.js';
import { CompaniesService } from './company.service.js';
import { EmployeesService } from '../employee/employee.service.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let companiesService: Partial<CompaniesService>;
  let employeesService: Partial<EmployeesService>;

  beforeEach(async () => {
    companiesService = {
      create: (dto: any) =>
        Promise.resolve({
          id: 'comp-1',
          name: dto.name,
          isActive: true,
          billingContact: { name: null, email: null, phone: null },
          workingDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
          deliveryDefaults: {
            defaultDeliveryTime: null,
            leaveKitchenMinutes: 60,
            defaultPackagingType: null,
            standingDriverInstructions: null,
            defaultDriverId: null,
            defaultDriver: null,
          },
          priceTierId: null,
          priceTier: null,
          ownerId: null,
          owner: null,
          employeeCount: 0,
          emailDomains: [],
          deliveryAddresses: [],
          holidays: [],
          hiddenCategoryIds: [],
          hiddenDishIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      findAll: () =>
        Promise.resolve({
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      findById: (id: string) =>
        Promise.resolve({
          id,
          name: 'Acme Corp',
          isActive: true,
          billingContact: { name: null, email: null, phone: null },
          workingDays: [DayOfWeek.MONDAY],
          deliveryDefaults: {
            defaultDeliveryTime: null,
            leaveKitchenMinutes: 60,
            defaultPackagingType: null,
            standingDriverInstructions: null,
            defaultDriverId: null,
            defaultDriver: null,
          },
          priceTierId: null,
          priceTier: null,
          ownerId: null,
          owner: null,
          employeeCount: 1,
          emailDomains: [],
          deliveryAddresses: [],
          holidays: [],
          hiddenCategoryIds: [],
          hiddenDishIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      update: (id: string, dto: any) =>
        Promise.resolve({
          id,
          name: dto.name ?? 'Acme Corp',
          isActive: true,
          billingContact: { name: null, email: null, phone: null },
          workingDays: [DayOfWeek.MONDAY],
          deliveryDefaults: {
            defaultDeliveryTime: null,
            leaveKitchenMinutes: 60,
            defaultPackagingType: null,
            standingDriverInstructions: null,
            defaultDriverId: null,
            defaultDriver: null,
          },
          priceTierId: null,
          priceTier: null,
          ownerId: null,
          owner: null,
          employeeCount: 1,
          emailDomains: [],
          deliveryAddresses: [],
          holidays: [],
          hiddenCategoryIds: [],
          hiddenDishIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      remove: (id: string) =>
        Promise.resolve({
          id,
          name: 'Acme Corp',
          isActive: false,
          billingContact: { name: null, email: null, phone: null },
          workingDays: [DayOfWeek.MONDAY],
          deliveryDefaults: {
            defaultDeliveryTime: null,
            leaveKitchenMinutes: 60,
            defaultPackagingType: null,
            standingDriverInstructions: null,
            defaultDriverId: null,
            defaultDriver: null,
          },
          priceTierId: null,
          priceTier: null,
          ownerId: null,
          owner: null,
          employeeCount: 1,
          emailDomains: [],
          deliveryAddresses: [],
          holidays: [],
          hiddenCategoryIds: [],
          hiddenDishIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      checkDeliveryAvailability: (_id: string, _date: string) =>
        Promise.resolve({ allowed: true }),
    };

    employeesService = {
      bulkImport: (_companyId: string, _csv: string) =>
        Promise.resolve({
          totalRows: 1,
          imported: 1,
          failed: 0,
          errors: [],
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        { provide: CompaniesService, useValue: companiesService },
        { provide: EmployeesService, useValue: employeesService },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a company', async () => {
    const res = await controller.create({ name: 'New Co' });
    expect(res.name).toBe('New Co');
  });

  it('lists companies', async () => {
    const res = await controller.findAll({});
    expect(res.data).toEqual([]);
  });

  it('gets company by ID', async () => {
    const res = await controller.findById('comp-1');
    expect(res.id).toBe('comp-1');
  });

  it('checks delivery availability', async () => {
    const res = await controller.checkDeliveryAvailability('comp-1', '2026-10-05');
    expect(res.allowed).toBe(true);
  });

  it('runs bulk import', async () => {
    const res = await controller.bulkImport('comp-1', { csvContent: 'name\nTest' });
    expect(res.imported).toBe(1);
  });
});
