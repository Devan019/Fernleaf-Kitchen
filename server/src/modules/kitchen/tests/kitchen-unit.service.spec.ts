import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { KitchenUnitService } from '../kitchen-unit.service.js';
import { KitchenUnitStatus, OrderStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

describe('KitchenUnitService', () => {
  let service: KitchenUnitService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenSetting: {
        findMany: vi.fn().mockResolvedValue([
          { key: 'KITCHEN_TIMEZONE', value: 'UTC' },
          { key: 'AT_RISK_THRESHOLD_MINUTES', value: '30' },
        ]),
      },
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      kitchenUnit: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    service = new KitchenUnitService(prismaMock as unknown as PrismaService);
  });

  describe('Unit Creation & Combinations (Requirements 3, 4, 5, 6)', () => {
    it('creates exactly one kitchen unit per combination, not per individual quantity', async () => {
      // OrderLine with quantity 5, but single combination with quantity 5
      const mockOrder = {
        id: 'ord-100',
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        plannedKitchenReadyAt: new Date('2026-10-14T11:00:00.000Z'),
        plannedDispatchReadyAt: new Date('2026-10-14T11:30:00.000Z'),
        Company: { leaveKitchenMinutes: 60 },
        OrderLine: [
          {
            id: 'line-1',
            dishId: 'dish-1',
            Dish: { id: 'dish-1', kitchenStationId: 'st-grill' },
            OrderLineCombination: [
              {
                id: 'comb-1',
                quantity: 5,
                kitchenUnit: null,
              },
            ],
          },
        ],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.kitchenUnit.findUnique.mockResolvedValue(null);

      await service.ensureUnitsForOrder('ord-100');

      // Exactly ONE kitchen unit is created, with quantity 5
      expect(prismaMock.kitchenUnit.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.kitchenUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'ord-100',
            orderLineId: 'line-1',
            combinationId: 'comb-1',
            quantity: 5,
            kitchenStationId: 'st-grill',
            status: KitchenUnitStatus.PENDING,
          }),
        }),
      );
    });

    it('creates exactly two kitchen units for an order line with two distinct combinations', async () => {
      // OrderLine Chicken Biryani x 5: 3 x Regular, 2 x Large
      const mockOrder = {
        id: 'ord-101',
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        plannedKitchenReadyAt: new Date('2026-10-14T11:00:00.000Z'),
        plannedDispatchReadyAt: new Date('2026-10-14T11:30:00.000Z'),
        Company: { leaveKitchenMinutes: 60 },
        OrderLine: [
          {
            id: 'line-10',
            dishId: 'dish-biryani',
            Dish: { id: 'dish-biryani', kitchenStationId: 'st-indian' },
            OrderLineCombination: [
              { id: 'comb-reg-3', quantity: 3, kitchenUnit: null },
              { id: 'comb-lrg-2', quantity: 2, kitchenUnit: null },
            ],
          },
        ],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.kitchenUnit.findUnique.mockResolvedValue(null);

      await service.ensureUnitsForOrder('ord-101');

      // Exactly TWO units created: Unit 1 qty 3, Unit 2 qty 2
      expect(prismaMock.kitchenUnit.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.kitchenUnit.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            combinationId: 'comb-reg-3',
            quantity: 3,
            kitchenStationId: 'st-indian',
          }),
        }),
      );
      expect(prismaMock.kitchenUnit.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            combinationId: 'comb-lrg-2',
            quantity: 2,
            kitchenStationId: 'st-indian',
          }),
        }),
      );
    });

    it('routes dish without kitchen station to null (Unassigned)', async () => {
      const mockOrder = {
        id: 'ord-102',
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        plannedKitchenReadyAt: null,
        plannedDispatchReadyAt: null,
        Company: { leaveKitchenMinutes: 60 },
        OrderLine: [
          {
            id: 'line-salad',
            dishId: 'dish-salad',
            Dish: { id: 'dish-salad', kitchenStationId: null },
            OrderLineCombination: [
              { id: 'comb-salad', quantity: 1, kitchenUnit: null },
            ],
          },
        ],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.kitchenUnit.findUnique.mockResolvedValue(null);

      await service.ensureUnitsForOrder('ord-102');

      expect(prismaMock.kitchenUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kitchenStationId: null,
          }),
        }),
      );
    });

    it('does not create kitchen units for non-confirmed orders (DRAFT, PLACED, CANCELLED)', async () => {
      const draftOrder = {
        id: 'ord-draft',
        status: OrderStatus.DRAFT,
        OrderLine: [],
      };
      prismaMock.order.findUnique.mockResolvedValue(draftOrder);

      await service.ensureUnitsForOrder('ord-draft');
      expect(prismaMock.kitchenUnit.create).not.toHaveBeenCalled();

      const placedOrder = {
        id: 'ord-placed',
        status: OrderStatus.PLACED,
        OrderLine: [],
      };
      prismaMock.order.findUnique.mockResolvedValue(placedOrder);

      await service.ensureUnitsForOrder('ord-placed');
      expect(prismaMock.kitchenUnit.create).not.toHaveBeenCalled();
    });

    it('is idempotent and skips creation if unit already exists', async () => {
      const mockOrder = {
        id: 'ord-existing',
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        plannedKitchenReadyAt: new Date(),
        plannedDispatchReadyAt: new Date(),
        Company: { leaveKitchenMinutes: 60 },
        OrderLine: [
          {
            id: 'line-1',
            dishId: 'dish-1',
            Dish: { id: 'dish-1', kitchenStationId: null },
            OrderLineCombination: [
              {
                id: 'comb-1',
                quantity: 2,
                kitchenUnit: { id: 'unit-existing' }, // already exists
              },
            ],
          },
        ],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await service.ensureUnitsForOrder('ord-existing');
      expect(prismaMock.kitchenUnit.create).not.toHaveBeenCalled();
    });
  });

  describe('Start Unit Lifecycle & Order Timestamps (Requirements 7, 9, 10, 14, 15, 28)', () => {
    it('allows a PENDING unit to be started and records startedAt and startedByUserId', async () => {
      const mockUnit = {
        id: 'unit-1',
        orderId: 'ord-1',
        status: KitchenUnitStatus.PENDING,
        startedAt: null,
        order: {
          id: 'ord-1',
          status: OrderStatus.CONFIRMED,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
        },
      };

      prismaMock.kitchenUnit.findUnique
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce({
          ...mockUnit,
          status: KitchenUnitStatus.STARTED,
          startedAt: new Date('2026-10-14T10:00:00.000Z'),
          startedByUser: { id: 'user-kitchen', name: 'Chef Mario' },
          orderLine: { dishId: 'dish-1', Dish: { name: 'Pasta' } },
          combination: { OrderCombinationOption: [] },
          order: {
            ...mockUnit.order,
            Company: { id: 'c1', name: 'Acme' },
            Employee: { id: 'e1', name: 'Bob' },
          },
        });

      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.startUnit('unit-1', 'user-kitchen');

      expect(result.status).toBe(KitchenUnitStatus.STARTED);
      expect(result.startedByUser?.name).toBe('Chef Mario');
      expect(prismaMock.kitchenUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'unit-1',
            status: KitchenUnitStatus.PENDING,
          },
        }),
      );
    });

    it('sets order.kitchenStartedAt when the first unit starts', async () => {
      const mockUnit = {
        id: 'unit-first',
        orderId: 'ord-1',
        status: KitchenUnitStatus.PENDING,
        startedAt: null,
        order: {
          id: 'ord-1',
          status: OrderStatus.CONFIRMED,
          kitchenStartedAt: null,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
        },
      };

      prismaMock.kitchenUnit.findUnique
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce({
          ...mockUnit,
          status: KitchenUnitStatus.STARTED,
          startedAt: new Date(),
          orderLine: { dishId: 'd1', Dish: {} },
          combination: { OrderCombinationOption: [] },
          order: { ...mockUnit.order, Company: {}, Employee: {} },
        });

      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 1 });

      await service.startUnit('unit-first', 'user-kitchen');

      // Conditional update on order: where kitchenStartedAt is null
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'ord-1',
            kitchenStartedAt: null,
          },
          data: expect.objectContaining({
            kitchenStartedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects starting an already started unit with 409 Conflict', async () => {
      const mockUnit = {
        id: 'unit-started',
        orderId: 'ord-1',
        status: KitchenUnitStatus.STARTED,
        order: { id: 'ord-1', status: OrderStatus.CONFIRMED },
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);

      await expect(
        service.startUnit('unit-started', 'user-kitchen'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects starting a completed unit with 409 Conflict', async () => {
      const mockUnit = {
        id: 'unit-done',
        orderId: 'ord-1',
        status: KitchenUnitStatus.DONE,
        order: { id: 'ord-1', status: OrderStatus.CONFIRMED },
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);

      await expect(
        service.startUnit('unit-done', 'user-kitchen'),
      ).rejects.toThrow(ConflictException);
    });

    it('fails safely when two concurrent requests try to start the same unit (Requirement 28)', async () => {
      const mockUnit = {
        id: 'unit-concurrent',
        orderId: 'ord-1',
        status: KitchenUnitStatus.PENDING,
        order: { id: 'ord-1', status: OrderStatus.CONFIRMED },
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);
      // Simulate that another request updated it first: updateMany matches 0 rows!
      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.startUnit('unit-concurrent', 'user-2'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects starting a unit if order is not CONFIRMED', async () => {
      const mockUnit = {
        id: 'unit-draft',
        orderId: 'ord-draft',
        status: KitchenUnitStatus.PENDING,
        order: { id: 'ord-draft', status: OrderStatus.PLACED }, // PLACED, not CONFIRMED
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);

      await expect(
        service.startUnit('unit-draft', 'user-kitchen'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Complete Unit Lifecycle & Order Ready Time (Requirements 8, 11, 12, 13, 16, 17, 29)', () => {
    it('allows a STARTED unit to be completed and preserves existing startedAt', async () => {
      const startedTime = new Date('2026-10-14T10:00:00.000Z');
      const mockUnit = {
        id: 'unit-started',
        orderId: 'ord-1',
        status: KitchenUnitStatus.STARTED,
        startedAt: startedTime,
        startedByUserId: 'chef-1',
        order: {
          id: 'ord-1',
          status: OrderStatus.CONFIRMED,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
        },
      };

      prismaMock.kitchenUnit.findUnique
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce({
          ...mockUnit,
          status: KitchenUnitStatus.DONE,
          completedAt: new Date('2026-10-14T10:25:00.000Z'),
          startedByUser: { id: 'chef-1', name: 'Chef Mario' },
          completedByUser: { id: 'chef-2', name: 'Chef Luigi' },
          orderLine: { dishId: 'd1', Dish: {} },
          combination: { OrderCombinationOption: [] },
          order: { ...mockUnit.order, Company: {}, Employee: {} },
        });

      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 1 });
      // 1 unit still incomplete
      prismaMock.kitchenUnit.count.mockResolvedValue(1);

      const result = await service.completeUnit('unit-started', 'chef-2');

      expect(result.status).toBe(KitchenUnitStatus.DONE);
      expect(result.startedAt).toEqual(startedTime);
      expect(result.startedByUser?.name).toBe('Chef Mario');
      expect(result.completedByUser?.name).toBe('Chef Luigi');
      // kitchenReadyAt not set on order because 1 unit is still incomplete
      expect(prismaMock.order.update).not.toHaveBeenCalled();
    });

    it('allows completing a PENDING unit directly and records both start and completion (Requirement 11, 13)', async () => {
      const mockUnit = {
        id: 'unit-pending',
        orderId: 'ord-1',
        status: KitchenUnitStatus.PENDING,
        startedAt: null,
        startedByUserId: null,
        order: {
          id: 'ord-1',
          status: OrderStatus.CONFIRMED,
          kitchenStartedAt: null,
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
        },
      };

      prismaMock.kitchenUnit.findUnique
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce({
          ...mockUnit,
          status: KitchenUnitStatus.DONE,
          startedAt: new Date('2026-10-14T10:15:00.000Z'),
          completedAt: new Date('2026-10-14T10:15:00.000Z'),
          startedByUser: { id: 'chef-fast', name: 'Fast Chef' },
          completedByUser: { id: 'chef-fast', name: 'Fast Chef' },
          orderLine: { dishId: 'd1', Dish: {} },
          combination: { OrderCombinationOption: [] },
          order: { ...mockUnit.order, Company: {}, Employee: {} },
        });

      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.kitchenUnit.count.mockResolvedValue(0); // All units now done!

      const result = await service.completeUnit('unit-pending', 'chef-fast');

      expect(result.status).toBe(KitchenUnitStatus.DONE);
      expect(prismaMock.kitchenUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'unit-pending', status: KitchenUnitStatus.PENDING },
          data: expect.objectContaining({
            status: KitchenUnitStatus.DONE,
            startedByUserId: 'chef-fast',
            completedByUserId: 'chef-fast',
          }),
        }),
      );

      // Order kitchenStartedAt was set because it was previously null
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-1', kitchenStartedAt: null },
        }),
      );

      // Order kitchenReadyAt was set because remaining incomplete count is 0!
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-1' },
          data: expect.objectContaining({
            kitchenReadyAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects completing an already completed unit with 409 Conflict', async () => {
      const mockUnit = {
        id: 'unit-already-done',
        orderId: 'ord-1',
        status: KitchenUnitStatus.DONE,
        order: { id: 'ord-1', status: OrderStatus.CONFIRMED },
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);

      await expect(
        service.completeUnit('unit-already-done', 'user-kitchen'),
      ).rejects.toThrow(ConflictException);
    });

    it('fails safely when two concurrent requests try to complete the same unit (Requirement 29)', async () => {
      const mockUnit = {
        id: 'unit-concurrent-comp',
        orderId: 'ord-1',
        status: KitchenUnitStatus.STARTED,
        order: { id: 'ord-1', status: OrderStatus.CONFIRMED },
      };

      prismaMock.kitchenUnit.findUnique.mockResolvedValue(mockUnit);
      // Another thread completed it: updateMany affects 0 rows
      prismaMock.kitchenUnit.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.completeUnit('unit-concurrent-comp', 'chef-2'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Admin Force Complete (Requirements 23, 25, 26, 27, 30)', () => {
    it('marks all units as DONE, preserves existing startedAt, records startedAt for PENDING units, and sets kitchenReadyAt', async () => {
      const existingStartedAt = new Date('2026-10-14T09:30:00.000Z');
      const orderId = 'ord-force-1';

      const mockOrder = {
        id: orderId,
        orderNumber: 'ORD-FORCE-100',
        status: OrderStatus.CONFIRMED,
        kitchenStartedAt: existingStartedAt,
        kitchenReadyAt: null,
        kitchenUnits: [
          { id: 'u-pending', status: KitchenUnitStatus.PENDING, startedAt: null },
          { id: 'u-started', status: KitchenUnitStatus.STARTED, startedAt: existingStartedAt },
        ],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        kitchenStartedAt: existingStartedAt,
        kitchenReadyAt: new Date(),
      });

      prismaMock.kitchenUnit.findMany.mockResolvedValue([
        {
          id: 'u-pending',
          orderId,
          status: KitchenUnitStatus.DONE,
          startedAt: new Date(),
          completedAt: new Date(),
          order: { ...mockOrder, deliveryDate: new Date('2026-10-14T00:00:00.000Z'), deliveryTime: '12:00' },
          orderLine: { dishId: 'd1', Dish: {} },
          combination: { OrderCombinationOption: [] },
        },
        {
          id: 'u-started',
          orderId,
          status: KitchenUnitStatus.DONE,
          startedAt: existingStartedAt,
          completedAt: new Date(),
          order: { ...mockOrder, deliveryDate: new Date('2026-10-14T00:00:00.000Z'), deliveryTime: '12:00' },
          orderLine: { dishId: 'd2', Dish: {} },
          combination: { OrderCombinationOption: [] },
        },
      ]);

      const result = await service.forceCompleteOrder(orderId, 'admin-1');

      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe(OrderStatus.CONFIRMED); // Does not change Order status to DELIVERED

      // Update PENDING units with both startedAt and completedAt
      expect(prismaMock.kitchenUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId, status: KitchenUnitStatus.PENDING },
          data: expect.objectContaining({
            status: KitchenUnitStatus.DONE,
            startedByUserId: 'admin-1',
            completedByUserId: 'admin-1',
          }),
        }),
      );

      // Update STARTED units preserving startedAt and only setting completedAt
      expect(prismaMock.kitchenUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId, status: KitchenUnitStatus.STARTED },
          data: expect.objectContaining({
            status: KitchenUnitStatus.DONE,
            completedByUserId: 'admin-1',
          }),
        }),
      );

      // Order kitchenStartedAt was preserved
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({
            kitchenStartedAt: existingStartedAt,
            kitchenReadyAt: expect.any(Date),
          }),
        }),
      );
    });

    it('sets kitchenStartedAt if no units were previously started', async () => {
      const orderId = 'ord-no-start';
      const mockOrder = {
        id: orderId,
        orderNumber: 'ORD-NO-START',
        status: OrderStatus.CONFIRMED,
        kitchenStartedAt: null,
        kitchenReadyAt: null,
        kitchenUnits: [{ id: 'u1', status: KitchenUnitStatus.PENDING }],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        kitchenStartedAt: new Date(),
        kitchenReadyAt: new Date(),
      });
      prismaMock.kitchenUnit.findMany.mockResolvedValue([]);

      await service.forceCompleteOrder(orderId, 'admin-1');

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kitchenStartedAt: expect.any(Date),
            kitchenReadyAt: expect.any(Date),
          }),
        }),
      );
    });

    it('is fully idempotent when called multiple times (Requirement 27)', async () => {
      const existingStarted = new Date('2026-10-14T09:00:00.000Z');
      const existingReady = new Date('2026-10-14T10:00:00.000Z');
      const orderId = 'ord-already-force';

      const mockOrder = {
        id: orderId,
        orderNumber: 'ORD-ALREADY',
        status: OrderStatus.CONFIRMED,
        kitchenStartedAt: existingStarted,
        kitchenReadyAt: existingReady,
        kitchenUnits: [{ id: 'u1', status: KitchenUnitStatus.DONE }],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue(mockOrder);
      prismaMock.kitchenUnit.findMany.mockResolvedValue([]);

      await service.forceCompleteOrder(orderId, 'admin-1');

      // Preserves existing timestamps
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kitchenStartedAt: existingStarted,
            kitchenReadyAt: existingReady,
          }),
        }),
      );
    });

    it('rejects force-complete for non-confirmed orders with 400 BadRequest', async () => {
      const mockOrder = {
        id: 'ord-placed',
        status: OrderStatus.PLACED,
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.forceCompleteOrder('ord-placed', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 NotFound if order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.forceCompleteOrder('ord-missing', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
