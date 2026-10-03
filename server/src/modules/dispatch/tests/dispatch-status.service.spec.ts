import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DispatchStatusService } from '../dispatch-status.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  FulfillmentStatus,
  KitchenUnitStatus,
  OrderStatus,
} from '../../../generated/prisma/enums.js';

describe('DispatchStatusService', () => {
  let service: DispatchStatusService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenSetting: {
        findUnique: vi.fn().mockResolvedValue({ key: 'KITCHEN_TIMEZONE', value: 'UTC' }),
      },
      order: {
        findUnique: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      orderStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'osh-1' }),
      },
      deliveryDrop: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      dropStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'dsh-1' }),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    service = new DispatchStatusService(prismaMock as unknown as PrismaService);
  });

  describe('markDispatchReady (Requirements 4, 5, 11, 12, 19)', () => {
    it('successfully transitions from KITCHEN_READY to DISPATCH_READY when kitchen work is complete', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-001',
            status: OrderStatus.CONFIRMED,
            kitchenReadyAt: new Date(),
            kitchenUnits: [
              { id: 'u-1', status: KitchenUnitStatus.DONE },
              { id: 'u-2', status: KitchenUnitStatus.DONE },
            ],
          },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);
      prismaMock.deliveryDrop.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.deliveryDrop.findUniqueOrThrow.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.DISPATCH_READY,
      });

      await service.markDispatchReady('drop-1', 'staff-1');

      expect(prismaMock.deliveryDrop.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'drop-1',
          status: DeliveryDropStatus.KITCHEN_READY,
        },
        data: expect.objectContaining({
          status: DeliveryDropStatus.DISPATCH_READY,
        }),
      });

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { dropId: 'drop-1' },
        data: expect.objectContaining({
          fulfillmentStatus: FulfillmentStatus.DISPATCH_READY,
        }),
      });

      expect(prismaMock.dropStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dropId: 'drop-1',
          fromStatus: DeliveryDropStatus.KITCHEN_READY,
          toStatus: DeliveryDropStatus.DISPATCH_READY,
        }),
      });
    });

    it('rejects dispatch ready if any order has unfinished kitchen units (Section 4)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-001',
            status: OrderStatus.CONFIRMED,
            kitchenReadyAt: null,
            kitchenUnits: [
              { id: 'u-1', status: KitchenUnitStatus.DONE },
              { id: 'u-2', status: KitchenUnitStatus.STARTED }, // Incomplete!
            ],
          },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(service.markDispatchReady('drop-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects dispatch ready if orders are CANCELLED or REJECTED', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-001',
            status: OrderStatus.CANCELLED,
            kitchenReadyAt: new Date(),
            kitchenUnits: [],
          },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(service.markDispatchReady('drop-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if drop is already DISPATCH_READY (cannot repeat)', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.DISPATCH_READY,
        orders: [{ id: 'ord-1' }],
      });

      await expect(service.markDispatchReady('drop-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if drop is already OUT_FOR_DELIVERY', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        orders: [{ id: 'ord-1' }],
      });

      await expect(service.markDispatchReady('drop-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markOutForDelivery (Requirements 6, 13, 14, 15)', () => {
    it('successfully transitions from DISPATCH_READY to OUT_FOR_DELIVERY when driver is assigned', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);
      prismaMock.deliveryDrop.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.deliveryDrop.findUniqueOrThrow.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
      });

      await service.markOutForDelivery('drop-1', 'dispatcher-1');

      expect(prismaMock.deliveryDrop.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'drop-1',
          status: DeliveryDropStatus.DISPATCH_READY,
        },
        data: expect.objectContaining({
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        }),
      });

      expect(prismaMock.dropStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dropId: 'drop-1',
          fromStatus: DeliveryDropStatus.DISPATCH_READY,
          toStatus: DeliveryDropStatus.OUT_FOR_DELIVERY,
        }),
      });
    });

    it('strictly requires an assigned driver for OUT_FOR_DELIVERY (Section 6, Requirement 14)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: null, // Missing driver!
        orders: [{ id: 'ord-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(service.markOutForDelivery('drop-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects OUT_FOR_DELIVERY if drop is still KITCHEN_READY (cannot skip DISPATCH_READY)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(service.markOutForDelivery('drop-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if drop is already OUT_FOR_DELIVERY (cannot repeat)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(service.markOutForDelivery('drop-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('markDelivered (Requirements 7, 16-18, 20-22, 24-30)', () => {
    it('successfully delivers drop and all orders when called by assigned driver', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: 'driver-john',
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        orders: [
          { id: 'ord-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED },
          { id: 'ord-2', orderNumber: 'ORD-002', status: OrderStatus.CONFIRMED },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);
      prismaMock.deliveryDrop.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.deliveryDrop.findUniqueOrThrow.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.DELIVERED,
      });

      await service.markDelivered('drop-1', 'driver-john', {
        note: 'Left at reception desk',
        photoUrl: 'https://storage/proof.webp',
      });

      expect(prismaMock.deliveryDrop.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'drop-1',
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        },
        data: expect.objectContaining({
          status: DeliveryDropStatus.DELIVERED,
          deliveredNote: 'Left at reception desk',
          deliveredPhotoUrl: 'https://storage/proof.webp',
          isOnTime: expect.any(Boolean),
        }),
      });

      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { dropId: 'drop-1' },
        data: expect.objectContaining({
          fulfillmentStatus: FulfillmentStatus.DELIVERED,
          status: OrderStatus.DELIVERED,
        }),
      });

      expect(prismaMock.orderStatusHistory.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.dropStatusHistory.create).toHaveBeenCalledTimes(1);
    });

    it('strictly enforces driver isolation: driver cannot deliver another driver drop (403 Forbidden)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(
        service.markDelivered('drop-1', 'driver-sarah', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects delivery before OUT_FOR_DELIVERY (e.g. from DISPATCH_READY)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(
        service.markDelivered('drop-1', 'driver-john', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects delivery if already DELIVERED (cannot deliver twice)', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.DELIVERED,
        driverId: 'driver-john',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);

      await expect(
        service.markDelivered('drop-1', 'driver-john', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on concurrent duplicate delivery attempts', async () => {
      const drop = {
        id: 'drop-1',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: 'driver-john',
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);
      // Simulate another concurrent transaction already completed the update
      prismaMock.deliveryDrop.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.markDelivered('drop-1', 'driver-john', {}),
      ).rejects.toThrow(ConflictException);
    });
  });
});
