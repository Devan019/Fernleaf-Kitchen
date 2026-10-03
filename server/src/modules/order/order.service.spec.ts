import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { OrderStatus, UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { OrderCutoffService } from './services/order-cutoff.service.js';
import { OrderPricingService } from './services/order-pricing.service.js';
import { OrderStatusService } from './services/order-status.service.js';
import { OrderValidationService } from './services/order-validation.service.js';
import { OrderService } from './order.service.js';

describe('OrderService', () => {
  let service: OrderService;
  let prismaMock: any;
  let cutoffMock: any;
  let pricingMock: any;
  let statusMock: any;
  let validationMock: any;

  beforeEach(() => {
    prismaMock = {
      order: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      orderLine: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      orderLineCombination: {
        create: vi.fn(),
      },
      orderCombinationOption: {
        create: vi.fn(),
      },
      orderStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    cutoffMock = {
      isPastCutoff: vi.fn().mockResolvedValue(false),
      calculateCutoff: vi.fn(),
      processCutoffForDate: vi.fn(),
      checkCutoff: vi.fn(),
    };

    pricingMock = {
      calculateOrderPricing: vi.fn().mockResolvedValue({
        subtotal: new Prisma.Decimal('100.00'),
        total: new Prisma.Decimal('100.00'),
        lines: [
          {
            dishId: 'dish-1',
            dishNameSnapshot: 'Paneer Bowl',
            dishSkuSnapshot: 'DISH-PNR-001',
            unitPrice: new Prisma.Decimal('10.00'),
            quantity: 10,
            lineTotal: new Prisma.Decimal('100.00'),
            combinations: [
              {
                quantity: 10,
                unitPrice: new Prisma.Decimal('10.00'),
                combinationTotal: new Prisma.Decimal('100.00'),
                options: [],
              },
            ],
          },
        ],
      }),
    };

    statusMock = new OrderStatusService();

    validationMock = {
      validateEmployeeAndCompany: vi.fn().mockResolvedValue({
        employee: { id: 'emp-1', name: 'Rahul', isActive: true },
        company: { id: 'comp-1', name: 'Google', workingDays: ['MONDAY'] },
      }),
      validateCompanyDeliveryCalendar: vi.fn().mockResolvedValue(undefined),
      validateDeliveryDetails: vi.fn().mockResolvedValue({
        addressSnapshot: {
          deliveryAddressId: 'addr-1',
          deliveryAddressLabel: 'HQ',
          deliveryStreet: '123 Main St',
          deliveryUnit: null,
          deliveryCity: 'London',
          deliveryPostcode: 'EC1A 1BB',
          deliveryInstructions: null,
        },
        deliveryTime: '12:30',
        packagingType: 'STANDARD',
        deliveryInstructions: null,
      }),
      validateCutoff: vi.fn().mockResolvedValue(undefined),
      validateMenuAndDishes: vi.fn().mockResolvedValue(undefined),
    };

    service = new OrderService(
      prismaMock as unknown as PrismaService,
      cutoffMock as unknown as OrderCutoffService,
      pricingMock as unknown as OrderPricingService,
      statusMock,
      validationMock as unknown as OrderValidationService,
    );
  });

  describe('createOrder', () => {
    it('creates a DRAFT order with Decimal calculations and snapshots', async () => {
      // Mock findOrderById after transaction
      vi.spyOn(service, 'findOrderById').mockResolvedValue({
        id: 'mock-order-id',
        orderNumber: 'ORD-20261010-ABCD',
        status: OrderStatus.DRAFT,
      } as any);

      const dto = {
        employeeId: 'emp-1',
        deliveryDate: '2026-10-10',
        deliveryTime: '12:30',
        status: OrderStatus.DRAFT,
        lines: [
          {
            dishId: 'dish-1',
            quantity: 10,
            combinations: [{ quantity: 10, options: [] }],
          },
        ],
      };

      const result = await service.createOrder(dto, 'admin-id', UserRole.ADMIN);

      expect(validationMock.validateEmployeeAndCompany).toHaveBeenCalledWith('emp-1');
      expect(pricingMock.calculateOrderPricing).toHaveBeenCalled();
      expect(prismaMock.order.create).toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.DRAFT);
    });
  });

  describe('placeOrder', () => {
    it('places a DRAFT order and transitions to PLACED', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        employeeId: 'emp-1',
        deliveryDate: new Date('2026-10-10T00:00:00.000Z'),
        status: OrderStatus.DRAFT,
        OrderLine: [
          {
            dishId: 'dish-1',
            quantity: 5,
            OrderLineCombination: [{ quantity: 5, OrderCombinationOption: [] }],
          },
        ],
      });

      vi.spyOn(service, 'findOrderById').mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PLACED,
      } as any);

      const result = await service.placeOrder('order-1', 'admin-id', UserRole.ADMIN);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.PLACED }),
        }),
      );
      expect(result.status).toBe(OrderStatus.PLACED);
    });

    it('rejects placing an order that is not DRAFT', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        OrderLine: [],
      });

      await expect(service.placeOrder('order-1', 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelOrder', () => {
    it('cancels a PLACED order before cut-off', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PLACED,
        deliveryDate: new Date('2026-10-10T00:00:00.000Z'),
      });

      vi.spyOn(service, 'findOrderById').mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      } as any);

      const result = await service.cancelOrder('order-1', { reason: 'Customer requested' }, 'admin-id');

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
        }),
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('returns idempotently if already CANCELLED', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      });

      vi.spyOn(service, 'findOrderById').mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      } as any);

      const result = await service.cancelOrder('order-1');
      expect(prismaMock.order.update).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('rejects cancelling DELIVERED orders', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DELIVERED,
        deliveryDate: new Date('2026-10-10T00:00:00.000Z'),
      });

      await expect(service.cancelOrder('order-1', {}, 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateOrderDelivery (Admin override)', () => {
    it('updates delivery details without changing price snapshots', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date('2026-10-10T00:00:00.000Z'),
        deliveryTime: '12:00',
        packagingType: 'STANDARD',
        Company: {
          name: 'Google',
          deliveryAddresses: [{ id: 'addr-2', label: 'Branch 2', street: '456 High St', city: 'London', postcode: 'W1 1AA' }],
        },
        Employee: { id: 'emp-1' },
      });

      vi.spyOn(service, 'findOrderById').mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        deliveryTime: '13:30',
      } as any);

      const result = await service.updateOrderDelivery(
        'order-1',
        { deliveryTime: '13:30', deliveryAddressId: 'addr-2' },
        'admin-id',
        UserRole.ADMIN,
      );

      // Verify delivery details updated in order table
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            deliveryTime: '13:30',
            deliveryStreet: '456 High St',
          }),
        }),
      );
      // Pricing was NOT recalculated or modified
      expect(pricingMock.calculateOrderPricing).not.toHaveBeenCalled();
      expect(result.deliveryTime).toBe('13:30');
    });
  });
});
