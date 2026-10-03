import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmployeesController } from './employee.controller.js';
import { EmployeesService } from './employee.service.js';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let employeesService: Partial<EmployeesService>;

  beforeEach(async () => {
    employeesService = {
      create: (dto: any) =>
        Promise.resolve({
          id: 'emp-1',
          name: dto.name,
          email: dto.email ?? null,
          companyId: dto.companyId,
          company: { id: dto.companyId, name: 'Acme Corp', isActive: true },
          canChooseDeliveryAddress: dto.canChooseDeliveryAddress ?? false,
          canChangeDeliveryTime: dto.canChangeDeliveryTime ?? false,
          canChangePackaging: dto.canChangePackaging ?? false,
          allergens: [],
          dietaryTags: [],
          isOwnerOfCompany: false,
          isActive: true,
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
          name: 'Rahul Sharma',
          email: 'rahul@google.com',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'Google', isActive: true },
          canChooseDeliveryAddress: true,
          canChangeDeliveryTime: false,
          canChangePackaging: true,
          allergens: [],
          dietaryTags: [],
          isOwnerOfCompany: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      update: (id: string, dto: any) =>
        Promise.resolve({
          id,
          name: dto.name ?? 'Rahul Sharma',
          email: 'rahul@google.com',
          companyId: dto.companyId ?? 'comp-1',
          company: {
            id: dto.companyId ?? 'comp-1',
            name: 'Google',
            isActive: true,
          },
          canChooseDeliveryAddress: true,
          canChangeDeliveryTime: false,
          canChangePackaging: true,
          allergens: [],
          dietaryTags: [],
          isOwnerOfCompany: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      remove: (id: string) =>
        Promise.resolve({
          id,
          name: 'Rahul Sharma',
          email: 'rahul@google.com',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'Google', isActive: true },
          canChooseDeliveryAddress: true,
          canChangeDeliveryTime: false,
          canChangePackaging: true,
          allergens: [],
          dietaryTags: [],
          isOwnerOfCompany: false,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updatePermissions: (id: string, dto: any) =>
        Promise.resolve({
          id,
          name: 'Rahul Sharma',
          email: 'rahul@google.com',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'Google', isActive: true },
          canChooseDeliveryAddress: dto.canChooseDeliveryAddress ?? true,
          canChangeDeliveryTime: dto.canChangeDeliveryTime ?? false,
          canChangePackaging: dto.canChangePackaging ?? true,
          allergens: [],
          dietaryTags: [],
          isOwnerOfCompany: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: employeesService }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates an employee', async () => {
    const res = await controller.create({
      name: 'Alice',
      companyId: 'comp-1',
    });
    expect(res.name).toBe('Alice');
    expect(res.companyId).toBe('comp-1');
  });

  it('lists employees', async () => {
    const res = await controller.findAll({});
    expect(res.data).toEqual([]);
  });

  it('gets employee by ID', async () => {
    const res = await controller.findById('emp-1');
    expect(res.name).toBe('Rahul Sharma');
    expect(res.isOwnerOfCompany).toBe(true);
  });

  it('updates permissions', async () => {
    const res = await controller.updatePermissions('emp-1', {
      canChooseDeliveryAddress: false,
    });
    expect(res.canChooseDeliveryAddress).toBe(false);
  });
});
