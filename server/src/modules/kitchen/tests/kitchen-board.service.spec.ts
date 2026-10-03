import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KitchenBoardService } from '../kitchen-board.service.js';
import { KitchenUnitService } from '../kitchen-unit.service.js';
import { KitchenUnitStatus, OrderStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { calculatePlannedTimes, calculateWorkStatus } from '../utils/kitchen-time.utils.js';

describe('KitchenBoardService', () => {
  let service: KitchenBoardService;
  let unitService: KitchenUnitService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenSetting: {
        findMany: vi.fn().mockResolvedValue([
          { key: 'KITCHEN_TIMEZONE', value: 'UTC' },
          { key: 'AT_RISK_THRESHOLD_MINUTES', value: '30' },
        ]),
      },
      kitchenStation: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'st-hot', name: 'Hot Kitchen' },
          { id: 'st-bakery', name: 'Bakery' },
        ]),
        findUnique: vi.fn(),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      kitchenUnit: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    unitService = new KitchenUnitService(prismaMock as unknown as PrismaService);
    service = new KitchenBoardService(
      prismaMock as unknown as PrismaService,
      unitService,
    );
  });

  describe('Board Query & Filters (Requirements 1, 2, 5, 6)', () => {
    it('returns units for selected delivery date and ensures only CONFIRMED orders appear', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          orderId: 'ord-1',
          orderLineId: 'line-1',
          combinationId: 'comb-1',
          kitchenStationId: 'st-hot',
          status: KitchenUnitStatus.PENDING,
          quantity: 3,
          startedAt: null,
          completedAt: null,
          createdAt: new Date('2026-10-14T08:00:00.000Z'),
          updatedAt: new Date('2026-10-14T08:00:00.000Z'),
          order: {
            id: 'ord-1',
            orderNumber: 'ORD-1001',
            deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
            deliveryTime: '12:30',
            status: OrderStatus.CONFIRMED,
            plannedKitchenReadyAt: new Date('2026-10-14T11:00:00.000Z'),
            plannedDispatchReadyAt: new Date('2026-10-14T11:30:00.000Z'),
            Company: { id: 'comp-1', name: 'Acme Corp' },
            Employee: { id: 'emp-1', name: 'Alice' },
          },
          orderLine: {
            dishId: 'dish-1',
            dishNameSnapshot: 'Chicken Biryani',
            dishSkuSnapshot: 'SKU-001',
            Dish: { id: 'dish-1', name: 'Chicken Biryani', sku: 'SKU-001' },
          },
          combination: {
            OrderCombinationOption: [
              {
                optionId: 'opt-1',
                optionNameSnapshot: 'Regular Portion',
                optionGroupNameSnapshot: 'Portion',
                portionSizeNameSnapshot: 'Regular',
              },
            ],
          },
          kitchenStation: { id: 'st-hot', name: 'Hot Kitchen' },
          startedByUser: null,
          completedByUser: null,
        },
      ];

      prismaMock.kitchenUnit.findMany.mockResolvedValue(mockUnits);

      const result = await service.getBoard({ deliveryDate: '2026-10-14' });

      expect(result.deliveryDate).toBe('2026-10-14');
      expect(result.totalUnits).toBe(1);

      // Verify Prisma query enforced CONFIRMED status and deliveryDate
      expect(prismaMock.kitchenUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: {
              deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
              status: OrderStatus.CONFIRMED,
            },
          }),
        }),
      );

      const hotStation = result.stations.find((s) => s.id === 'st-hot');
      expect(hotStation).toBeDefined();
      expect(hotStation?.units).toHaveLength(1);
      expect(hotStation?.units[0].dish.name).toBe('Chicken Biryani');
      expect(hotStation?.units[0].quantity).toBe(3);
    });

    it('routes dish with no station to Unassigned (station.id === null, station.name === "Unassigned")', async () => {
      const mockUnits = [
        {
          id: 'unit-unassigned',
          orderId: 'ord-2',
          orderLineId: 'line-2',
          combinationId: 'comb-2',
          kitchenStationId: null,
          status: KitchenUnitStatus.PENDING,
          quantity: 2,
          startedAt: null,
          completedAt: null,
          createdAt: new Date('2026-10-14T08:00:00.000Z'),
          updatedAt: new Date('2026-10-14T08:00:00.000Z'),
          order: {
            id: 'ord-2',
            orderNumber: 'ORD-1002',
            deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
            deliveryTime: '13:00',
            status: OrderStatus.CONFIRMED,
            plannedKitchenReadyAt: new Date('2026-10-14T11:30:00.000Z'),
            plannedDispatchReadyAt: new Date('2026-10-14T12:00:00.000Z'),
            Company: { id: 'comp-1', name: 'Acme Corp' },
            Employee: { id: 'emp-2', name: 'Bob' },
          },
          orderLine: {
            dishId: 'dish-2',
            dishNameSnapshot: 'Fresh Salad',
            dishSkuSnapshot: null,
            Dish: { id: 'dish-2', name: 'Fresh Salad', sku: null },
          },
          combination: {
            OrderCombinationOption: [],
          },
          kitchenStation: null,
          startedByUser: null,
          completedByUser: null,
        },
      ];

      prismaMock.kitchenUnit.findMany.mockResolvedValue(mockUnits);

      const result = await service.getBoard({ deliveryDate: '2026-10-14' });

      const unassignedGroup = result.stations.find((s) => s.id === null);
      expect(unassignedGroup).toBeDefined();
      expect(unassignedGroup?.name).toBe('Unassigned');
      expect(unassignedGroup?.units).toHaveLength(1);
      expect(unassignedGroup?.units[0].station.id).toBeNull();
      expect(unassignedGroup?.units[0].station.name).toBe('Unassigned');
    });

    it('filters by stationId when stationId is passed in query', async () => {
      prismaMock.kitchenStation.findUnique.mockResolvedValue({
        id: 'st-hot',
        name: 'Hot Kitchen',
      });
      prismaMock.kitchenUnit.findMany.mockResolvedValue([]);

      await service.getBoard({
        deliveryDate: '2026-10-14',
        stationId: 'st-hot',
      });

      expect(prismaMock.kitchenUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            kitchenStationId: 'st-hot',
          }),
        }),
      );
    });

    it('filters by status when status is passed in query', async () => {
      prismaMock.kitchenUnit.findMany.mockResolvedValue([]);

      await service.getBoard({
        deliveryDate: '2026-10-14',
        status: KitchenUnitStatus.PENDING,
      });

      expect(prismaMock.kitchenUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: KitchenUnitStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('Planned Times & Recalculation (Requirements 18, 19, 20)', () => {
    it('calculates planned dispatch time as delivery time minus company delivery minutes', () => {
      // delivery: 12:30, delivery minutes: 60
      const planned = calculatePlannedTimes('2026-10-14', '12:30', 60, 'UTC');

      // Dispatch-ready should be 11:30 UTC
      expect(planned.plannedDispatchReadyAt.toISOString()).toBe('2026-10-14T11:30:00.000Z');
    });

    it('calculates planned kitchen-ready time as dispatch-ready minus 30 minutes buffer', () => {
      // delivery: 12:30, delivery minutes: 60 -> dispatch: 11:30 -> kitchen: 11:00
      const planned = calculatePlannedTimes('2026-10-14', '12:30', 60, 'UTC');

      expect(planned.plannedKitchenReadyAt.toISOString()).toBe('2026-10-14T11:00:00.000Z');
    });

    it('recalculates planned times when delivery time changes', () => {
      // Original delivery: 12:30 -> dispatch: 11:30, kitchen: 11:00
      const original = calculatePlannedTimes('2026-10-14', '12:30', 60, 'UTC');
      expect(original.plannedDispatchReadyAt.toISOString()).toBe('2026-10-14T11:30:00.000Z');
      expect(original.plannedKitchenReadyAt.toISOString()).toBe('2026-10-14T11:00:00.000Z');

      // Updated delivery: 13:30 -> dispatch: 12:30, kitchen: 12:00
      const updated = calculatePlannedTimes('2026-10-14', '13:30', 60, 'UTC');
      expect(updated.plannedDispatchReadyAt.toISOString()).toBe('2026-10-14T12:30:00.000Z');
      expect(updated.plannedKitchenReadyAt.toISOString()).toBe('2026-10-14T12:00:00.000Z');
    });
  });

  describe('Late and At-Risk Detection (Requirements 21, 22)', () => {
    const plannedKitchenReady = new Date('2026-10-14T11:00:00.000Z');
    const thresholdMinutes = 30;

    it('detects ON_TRACK when current time is well before planned time', () => {
      // 10:00 UTC is 60 minutes before 11:00 (> 30 min threshold)
      const now = new Date('2026-10-14T10:00:00.000Z');
      const status = calculateWorkStatus(plannedKitchenReady, false, now, thresholdMinutes);

      expect(status.isLate).toBe(false);
      expect(status.isAtRisk).toBe(false);
      expect(status.operationalStatus).toBe('ON_TRACK');
    });

    it('detects AT_RISK when current time is approaching planned time within threshold', () => {
      // 10:45 UTC is 15 minutes before 11:00 (<= 30 min threshold)
      const now = new Date('2026-10-14T10:45:00.000Z');
      const status = calculateWorkStatus(plannedKitchenReady, false, now, thresholdMinutes);

      expect(status.isLate).toBe(false);
      expect(status.isAtRisk).toBe(true);
      expect(status.operationalStatus).toBe('AT_RISK');
    });

    it('detects LATE when current time has passed plannedKitchenReadyAt and work is incomplete', () => {
      // 11:05 UTC is past 11:00
      const now = new Date('2026-10-14T11:05:00.000Z');
      const status = calculateWorkStatus(plannedKitchenReady, false, now, thresholdMinutes);

      expect(status.isLate).toBe(true);
      expect(status.isAtRisk).toBe(false);
      expect(status.operationalStatus).toBe('LATE');
    });

    it('detects COMPLETED when work is done, regardless of current time', () => {
      // Even if past planned time, if isDone is true, it is COMPLETED and not late/at-risk
      const now = new Date('2026-10-14T12:00:00.000Z');
      const status = calculateWorkStatus(plannedKitchenReady, true, now, thresholdMinutes);

      expect(status.isLate).toBe(false);
      expect(status.isAtRisk).toBe(false);
      expect(status.operationalStatus).toBe('COMPLETED');
    });
  });
});
