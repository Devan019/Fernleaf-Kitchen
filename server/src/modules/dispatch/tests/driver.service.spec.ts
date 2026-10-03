import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DriverService } from '../driver.service.js';
import { DropService } from '../drop.service.js';
import { DispatchStatusService } from '../dispatch-status.service.js';
import { StorageService } from '../../../common/storage/storage.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DeliveryDropStatus } from '../../../generated/prisma/enums.js';

describe('DriverService', () => {
  let service: DriverService;
  let prismaMock: any;
  let dropServiceMock: any;
  let statusServiceMock: any;
  let storageServiceMock: any;

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

    statusServiceMock = {
      getBusinessTimezone: vi.fn().mockResolvedValue('UTC'),
    };

    storageServiceMock = {
      upload: vi.fn().mockResolvedValue({
        key: 'catalogue/delivery/drops/drop-1/proof.webp',
        url: 'https://storage.local/proof.webp',
      }),
    };

    service = new DriverService(
      prismaMock as unknown as PrismaService,
      dropServiceMock as unknown as DropService,
      statusServiceMock as unknown as DispatchStatusService,
      storageServiceMock as unknown as StorageService,
    );
  });

  describe('getTodayDropsForDriver (Requirements 19, 20, 37, 38)', () => {
    it('returns only drops assigned to the calling driver for today, sorted by delivery time', async () => {
      const mockDrops = [
        {
          id: 'drop-1',
          deliveryTime: '11:30',
          deliveryStreet: '123 Main St',
          deliveryUnit: null,
          deliveryCity: 'London',
          deliveryPostcode: 'SW1A 1AA',
          deliveryInstructions: null,
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
          isOnTime: null,
          company: { id: 'comp-1', name: 'Google' },
          orders: [{ id: 'ord-1' }, { id: 'ord-2' }],
        },
        {
          id: 'drop-2',
          deliveryTime: '12:30',
          deliveryStreet: '456 High St',
          deliveryUnit: 'Floor 2',
          deliveryCity: 'London',
          deliveryPostcode: 'EC2M 4PL',
          deliveryInstructions: 'Ring bell',
          status: DeliveryDropStatus.DISPATCH_READY,
          isOnTime: null,
          company: { id: 'comp-2', name: 'Microsoft' },
          orders: [{ id: 'ord-3' }],
        },
      ];

      prismaMock.deliveryDrop.findMany.mockResolvedValue(mockDrops);

      const result = await service.getTodayDropsForDriver('driver-john');

      expect(dropServiceMock.reconcileDropsForDate).toHaveBeenCalled();
      expect(prismaMock.deliveryDrop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driverId: 'driver-john',
          }),
          orderBy: { deliveryTime: 'asc' },
        }),
      );

      expect(result.drops).toHaveLength(2);
      expect(result.drops[0].deliveryTime).toBe('11:30');
      expect(result.drops[0].canDeliver).toBe(true);
      expect(result.drops[1].canDeliver).toBe(false);
    });
  });

  describe('getDriverDropDetail (Requirements 20, 21, 25, 39)', () => {
    it('returns mobile-friendly drop details when accessed by the assigned driver', async () => {
      const mockDrop = {
        id: 'drop-1',
        deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
        deliveryTime: '12:30',
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: 'driver-john',
        deliveryStreet: '123 Main St',
        deliveryUnit: null,
        deliveryCity: 'London',
        deliveryPostcode: 'SW1A 1AA',
        deliveryInstructions: 'Reception entrance',
        isOnTime: null,
        dispatchReadyAt: new Date(),
        outForDeliveryAt: new Date(),
        deliveredAt: null,
        deliveredNote: null,
        deliveredPhotoUrl: null,
        company: {
          id: 'comp-1',
          name: 'Google',
          standingDriverInstructions: 'Park at bay 3',
        },
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-001',
            packagingType: 'Eco Bag',
            deliveryInstructions: null,
            Employee: { name: 'Alice' },
            OrderLine: [{ quantity: 2 }, { quantity: 1 }],
          },
        ],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(mockDrop);

      const detail = await service.getDriverDropDetail('drop-1', 'driver-john');

      expect(detail.id).toBe('drop-1');
      expect(detail.company.name).toBe('Google');
      expect(detail.company.standingDriverInstructions).toBe('Park at bay 3');
      expect(detail.orders).toHaveLength(1);
      expect(detail.orders[0].employeeName).toBe('Alice');
      expect(detail.orders[0].itemsCount).toBe(3);
    });

    it('strictly forbids driver from accessing another driver drop (403 Forbidden)', async () => {
      const mockDrop = {
        id: 'drop-1',
        driverId: 'driver-john',
        company: { name: 'Google' },
        orders: [],
      };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(mockDrop);

      await expect(
        service.getDriverDropDetail('drop-1', 'driver-sarah'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if drop does not exist', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);

      await expect(
        service.getDriverDropDetail('drop-999', 'driver-john'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadDeliveryPhoto (Requirements 18, 25)', () => {
    it('successfully uploads photo for assigned drop', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        driverId: 'driver-john',
      });

      const file = {
        buffer: Buffer.from('mock-image'),
        mimetype: 'image/jpeg',
        originalname: 'proof.jpg',
        size: 1024,
      } as Express.Multer.File;

      const result = await service.uploadDeliveryPhoto('drop-1', 'driver-john', file);

      expect(result.photoUrl).toBe('https://storage.local/proof.webp');
      expect(storageServiceMock.upload).toHaveBeenCalledTimes(1);
    });

    it('rejects photo upload if driver is not assigned to the drop (403 Forbidden)', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        driverId: 'driver-john',
      });

      const file = {
        buffer: Buffer.from('mock-image'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      await expect(
        service.uploadDeliveryPhoto('drop-1', 'driver-sarah', file),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects photo upload with invalid MIME type', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        driverId: 'driver-john',
      });

      const file = {
        buffer: Buffer.from('text-file'),
        mimetype: 'text/plain',
        size: 100,
      } as Express.Multer.File;

      await expect(
        service.uploadDeliveryPhoto('drop-1', 'driver-john', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects photo upload exceeding 5MB limit', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        driverId: 'driver-john',
      });

      const file = {
        buffer: Buffer.from('large-image'),
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      await expect(
        service.uploadDeliveryPhoto('drop-1', 'driver-john', file),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
