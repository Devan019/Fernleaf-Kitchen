import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DispatchService } from '../dispatch.service.js';
import { DropService } from '../drop.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  KitchenUnitStatus,
  OrderStatus,
} from '../../../generated/prisma/enums.js';

describe('DispatchService', () => {
  let service: DispatchService;
  let prismaMock: any;
  let dropServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      deliveryDrop: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    dropServiceMock = {
      reconcileDropsForDate: vi.fn().mockResolvedValue(1),
    };

    service = new DispatchService(
      prismaMock as unknown as PrismaService,
      dropServiceMock as unknown as DropService,
    );
  });

  describe('getBoard (Requirements 14, 15, 29)', () => {
    it('returns drops for the delivery date with action flags and sorted by delivery time', async () => {
      const mockDrops = [
        {
          id: 'drop-1',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:00',
          deliveryStreet: '123 Main St',
          deliveryUnit: null,
          deliveryCity: 'London',
          deliveryPostcode: 'SW1A 1AA',
          deliveryInstructions: null,
          status: DeliveryDropStatus.KITCHEN_READY,
          driverId: 'driver-1',
          dispatchReadyAt: null,
          outForDeliveryAt: null,
          deliveredAt: null,
          deliveredNote: null,
          deliveredPhotoUrl: null,
          isOnTime: null,
          company: { id: 'comp-1', name: 'Google' },
          driver: { id: 'driver-1', name: 'John Doe', email: 'john@kitchen.com' },
          orders: [
            {
              id: 'ord-1',
              orderNumber: 'ORD-001',
              status: OrderStatus.CONFIRMED,
              kitchenReadyAt: new Date(),
              kitchenUnits: [{ id: 'u-1', status: KitchenUnitStatus.DONE }],
            },
          ],
        },
        {
          id: 'drop-2',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          deliveryStreet: '456 High St',
          deliveryUnit: null,
          deliveryCity: 'London',
          deliveryPostcode: 'EC2M 4PL',
          deliveryInstructions: null,
          status: DeliveryDropStatus.DISPATCH_READY,
          driverId: 'driver-1',
          dispatchReadyAt: new Date(),
          outForDeliveryAt: null,
          deliveredAt: null,
          deliveredNote: null,
          deliveredPhotoUrl: null,
          isOnTime: null,
          company: { id: 'comp-2', name: 'Microsoft' },
          driver: { id: 'driver-1', name: 'John Doe', email: 'john@kitchen.com' },
          orders: [
            {
              id: 'ord-2',
              orderNumber: 'ORD-002',
              status: OrderStatus.CONFIRMED,
              kitchenReadyAt: new Date(),
              kitchenUnits: [{ id: 'u-2', status: KitchenUnitStatus.DONE }],
            },
          ],
        },
      ];

      prismaMock.deliveryDrop.findMany.mockResolvedValue(mockDrops);

      const board = await service.getBoard({
        deliveryDate: '2026-10-14',
      });

      expect(dropServiceMock.reconcileDropsForDate).toHaveBeenCalled();
      expect(board.deliveryDate).toBe('2026-10-14');
      expect(board.drops).toHaveLength(2);

      // Check drop-1 flags (KITCHEN_READY with completed units -> canMarkReady: true)
      expect(board.drops[0].canMarkReady).toBe(true);
      expect(board.drops[0].canMarkOutForDelivery).toBe(false);
      expect(board.drops[0].canDeliver).toBe(false);

      // Check drop-2 flags (DISPATCH_READY with assigned driver -> canMarkOutForDelivery: true)
      expect(board.drops[1].canMarkReady).toBe(false);
      expect(board.drops[1].canMarkOutForDelivery).toBe(true);
      expect(board.drops[1].canDeliver).toBe(false);
    });

    it('passes status, driverId, and companyId filters to the query', async () => {
      prismaMock.deliveryDrop.findMany.mockResolvedValue([]);

      await service.getBoard({
        deliveryDate: '2026-10-14',
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: 'driver-john',
        companyId: 'comp-google',
      });

      expect(prismaMock.deliveryDrop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DeliveryDropStatus.DISPATCH_READY,
            driverId: 'driver-john',
            companyId: 'comp-google',
          }),
        }),
      );
    });
  });

  describe('getDropDetail', () => {
    it('returns complete drop details with orders and status history timeline', async () => {
      const mockDrop = {
        id: 'drop-1',
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        deliveryStreet: '123 Main St',
        deliveryUnit: null,
        deliveryCity: 'London',
        deliveryPostcode: 'SW1A 1AA',
        deliveryInstructions: null,
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: 'driver-1',
        dispatchReadyAt: new Date(),
        outForDeliveryAt: null,
        deliveredAt: null,
        deliveredNote: null,
        deliveredPhotoUrl: null,
        isOnTime: null,
        company: { id: 'comp-1', name: 'Google' },
        driver: { id: 'driver-1', name: 'John Doe', email: 'john@kitchen.com' },
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-001',
            packagingType: 'Standard Box',
            deliveryInstructions: null,
            status: OrderStatus.CONFIRMED,
            fulfillmentStatus: 'DISPATCH_READY',
            kitchenReadyAt: new Date(),
            total: '25.00',
            Employee: { id: 'emp-1', name: 'Alice' },
            OrderLine: [{ quantity: 2 }],
            kitchenUnits: [{ id: 'u-1', status: KitchenUnitStatus.DONE }],
          },
        ],
        statusHistory: [
          {
            id: 'hist-1',
            fromStatus: null,
            toStatus: DeliveryDropStatus.KITCHEN_READY,
            changedByUser: null,
            note: 'Created',
            createdAt: new Date(),
          },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(mockDrop);

      const detail = await service.getDropDetail('drop-1');

      expect(detail.id).toBe('drop-1');
      expect(detail.orders).toHaveLength(1);
      expect(detail.orders[0].employee.name).toBe('Alice');
      expect(detail.orders[0].itemsCount).toBe(2);
      expect(detail.statusHistory).toHaveLength(1);
    });

    it('throws NotFoundException if drop does not exist', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);

      await expect(service.getDropDetail('drop-none')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
