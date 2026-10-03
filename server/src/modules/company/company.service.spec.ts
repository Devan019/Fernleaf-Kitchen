import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';
import { CompaniesService } from './company.service.js';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      company: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      companyEmailDomain: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      deliveryAddress: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      companyHoliday: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      companyHiddenCategory: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      companyHiddenDish: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      employee: {
        findUnique: vi.fn(),
      },
      priceTier: {
        findUnique: vi.fn(),
      },
      menuCategory: {
        findUnique: vi.fn(),
      },
      dish: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects public email domains on domain addition', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({ id: 'comp-1' });

    await expect(
      service.addDomain('comp-1', { domain: 'gmail.com' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid domain format on domain addition', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({ id: 'comp-1' });

    await expect(
      service.addDomain('comp-1', { domain: 'invalid domain' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects setting an owner who belongs to another company', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({ id: 'comp-1' });
    prisma.employee.findUnique.mockResolvedValueOnce({
      id: 'emp-2',
      companyId: 'comp-other',
    });

    await expect(
      service.setOwner('comp-1', { employeeId: 'emp-2' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('checks delivery availability returns false on non-working day', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({
      id: 'comp-1',
      isActive: true,
      workingDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
      holidays: [],
    });

    // 2026-10-04 is Sunday (non-working)
    const result = await service.checkDeliveryAvailability(
      'comp-1',
      '2026-10-04',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('non-working');
  });
});
