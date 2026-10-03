import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { MenuService } from '../../menu/menu.service.js';
import { OrderCutoffService } from './order-cutoff.service.js';
import { OrderValidationService } from './order-validation.service.js';

describe('OrderValidationService', () => {
  let service: OrderValidationService;
  let prismaMock: any;
  let menuMock: any;
  let cutoffMock: any;

  beforeEach(() => {
    prismaMock = {
      employee: {
        findUnique: vi.fn(),
      },
      companyHoliday: {
        findFirst: vi.fn(),
      },
      dish: {
        findUnique: vi.fn(),
      },
    };

    menuMock = {
      getEffectiveMenuForEmployee: vi.fn(),
    };

    cutoffMock = {
      isPastCutoff: vi.fn(),
    };

    service = new OrderValidationService(
      prismaMock as unknown as PrismaService,
      menuMock as unknown as MenuService,
      cutoffMock as unknown as OrderCutoffService,
    );
  });

  describe('validateEmployeeAndCompany', () => {
    it('throws NotFoundException if employee not found', async () => {
      prismaMock.employee.findUnique.mockResolvedValue(null);
      await expect(
        service.validateEmployeeAndCompany('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if employee is inactive', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'John',
        isActive: false,
      });
      await expect(service.validateEmployeeAndCompany('emp-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if company is inactive', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'John',
        isActive: true,
        company: { id: 'comp-1', name: 'Acme', isActive: false },
      });
      await expect(service.validateEmployeeAndCompany('emp-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns employee and company when valid and active', async () => {
      const validData = {
        id: 'emp-1',
        name: 'John',
        isActive: true,
        company: { id: 'comp-1', name: 'Acme', isActive: true },
      };
      prismaMock.employee.findUnique.mockResolvedValue(validData);

      const result = await service.validateEmployeeAndCompany('emp-1');
      expect(result.employee.id).toBe('emp-1');
      expect(result.company.id).toBe('comp-1');
    });
  });

  describe('validateCompanyDeliveryCalendar', () => {
    it('throws BadRequestException if company does not work on that day of week', async () => {
      // 2026-10-11 is a Sunday
      const workingDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ];

      await expect(
        service.validateCompanyDeliveryCalendar(
          'comp-1',
          workingDays,
          '2026-10-11',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if delivery date is a company holiday', async () => {
      // 2026-10-14 is a Wednesday
      const workingDays = [DayOfWeek.WEDNESDAY];
      prismaMock.companyHoliday.findFirst.mockResolvedValue({
        name: 'Company Annual Day',
      });

      await expect(
        service.validateCompanyDeliveryCalendar(
          'comp-1',
          workingDays,
          '2026-10-14',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateMenuAndDishes', () => {
    it('throws BadRequestException if dish is not in employee effective menu', async () => {
      menuMock.getEffectiveMenuForEmployee.mockResolvedValue({
        categories: [
          {
            items: [{ id: 'dish-visible' }],
          },
        ],
      });

      const lines = [
        {
          dishId: 'dish-hidden',
          quantity: 1,
          combinations: [{ quantity: 1, options: [] }],
        },
      ];

      await expect(
        service.validateMenuAndDishes('emp-1', 'comp-1', lines),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if combination quantities sum does not equal line quantity', async () => {
      menuMock.getEffectiveMenuForEmployee.mockResolvedValue({
        categories: [
          {
            items: [{ id: 'dish-1' }],
          },
        ],
      });

      const lines = [
        {
          dishId: 'dish-1',
          quantity: 10,
          combinations: [
            { quantity: 5, options: [] },
            { quantity: 3, options: [] }, // 5 + 3 = 8 != 10
          ],
        },
      ];

      await expect(
        service.validateMenuAndDishes('emp-1', 'comp-1', lines),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if a required option group is missing a selection', async () => {
      menuMock.getEffectiveMenuForEmployee.mockResolvedValue({
        categories: [{ items: [{ id: 'dish-1' }] }],
      });

      prismaMock.dish.findUnique.mockResolvedValue({
        id: 'dish-1',
        name: 'Paneer Bowl',
        isActive: true,
        optionGroups: [
          {
            id: 'grp-protein',
            name: 'Protein',
            isRequired: true,
            optionGroupOptions: [{ optionId: 'opt-paneer', option: { isActive: true } }],
            optionGroupPortions: [],
          },
        ],
      });

      const lines = [
        {
          dishId: 'dish-1',
          quantity: 2,
          combinations: [
            {
              quantity: 2,
              options: [], // Missing required protein!
            },
          ],
        },
      ];

      await expect(
        service.validateMenuAndDishes('emp-1', 'comp-1', lines),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateCutoff', () => {
    it('throws BadRequestException if past cut-off for normal users', async () => {
      cutoffMock.isPastCutoff.mockResolvedValue(true);
      await expect(service.validateCutoff('2026-10-10', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows Admin to bypass cut-off restrictions', async () => {
      cutoffMock.isPastCutoff.mockResolvedValue(true);
      await expect(
        service.validateCutoff('2026-10-10', true),
      ).resolves.not.toThrow();
    });
  });
});
