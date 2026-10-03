import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { EmployeesService } from './employee.service.js';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      employee: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      company: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      allergen: {
        count: vi.fn(),
      },
      dietaryTag: {
        count: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when creating employee for non-existent company', async () => {
    prisma.company.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'Rahul',
        companyId: 'non-existent',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when creating employee with duplicate email', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({ id: 'comp-1' });
    prisma.employee.findUnique.mockResolvedValueOnce({ id: 'existing-emp' });

    await expect(
      service.create({
        name: 'Rahul',
        email: 'rahul@google.com',
        companyId: 'comp-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when moving employee to non-existent company', async () => {
    prisma.employee.findUnique.mockResolvedValueOnce({
      id: 'emp-1',
      companyId: 'comp-1',
      ownedCompanies: [],
    });
    prisma.company.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update('emp-1', { companyId: 'comp-non-existent' }),
    ).rejects.toThrow(NotFoundException);
  });
});
