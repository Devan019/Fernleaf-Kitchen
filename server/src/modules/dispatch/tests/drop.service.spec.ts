import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DropService } from '../drop.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DeliveryDropStatus, OrderStatus, UserRole } from '../../../generated/prisma/enums.js';

describe('DropService', () => {
  let service: DropService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      order: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      deliveryDrop: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      dropStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    service = new DropService(prismaMock as unknown as PrismaService);
  });

  describe('Reconciliation & Drop Grouping (Requirements 1-10, 34, 35)', () => {
    const defaultAddress = {
      deliveryStreet: '123 Main St',
      deliveryUnit: 'Suite 100',
      deliveryCity: 'London',
      deliveryPostcode: 'SW1A 1AA',
      deliveryInstructions: 'Reception entrance',
    };

    it('groups multiple orders with same company, address snapshot, and delivery time into one drop', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: {
            id: 'comp-google',
            name: 'Google',
            defaultDriverId: null,
            defaultDriver: null,
          },
        },
        {
          id: 'ord-2',
          orderNumber: 'ORD-002',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: {
            id: 'comp-google',
            name: 'Google',
            defaultDriverId: null,
            defaultDriver: null,
          },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);
      prismaMock.deliveryDrop.create.mockResolvedValue({
        id: 'drop-100',
        companyId: 'comp-google',
      });

      const count = await service.reconcileDropsForDate('2026-10-14');

      expect(count).toBe(1);
      expect(prismaMock.deliveryDrop.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ord-1', 'ord-2'] } },
        data: { dropId: 'drop-100' },
      });
    });

    it('creates different drops for different companies', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: { id: 'comp-google', defaultDriverId: null },
        },
        {
          id: 'ord-2',
          orderNumber: 'ORD-002',
          companyId: 'comp-microsoft',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: { id: 'comp-microsoft', defaultDriverId: null },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);
      prismaMock.deliveryDrop.create
        .mockResolvedValueOnce({ id: 'drop-g' })
        .mockResolvedValueOnce({ id: 'drop-m' });

      const count = await service.reconcileDropsForDate('2026-10-14');

      expect(count).toBe(2);
      expect(prismaMock.deliveryDrop.create).toHaveBeenCalledTimes(2);
    });

    it('creates different drops for different delivery times', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: { id: 'comp-google', defaultDriverId: null },
        },
        {
          id: 'ord-2',
          orderNumber: 'ORD-002',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:45',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: { id: 'comp-google', defaultDriverId: null },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);
      prismaMock.deliveryDrop.create
        .mockResolvedValueOnce({ id: 'drop-1' })
        .mockResolvedValueOnce({ id: 'drop-2' });

      const count = await service.reconcileDropsForDate('2026-10-14');

      expect(count).toBe(2);
      expect(prismaMock.deliveryDrop.create).toHaveBeenCalledTimes(2);
    });

    it('is idempotent and preserves existing drops on re-reconciliation', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: { id: 'comp-google', defaultDriverId: null },
        },
      ];

      const existingDrop = {
        id: 'drop-existing',
        driverId: 'driver-sarah',
        status: DeliveryDropStatus.KITCHEN_READY,
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(existingDrop);

      const count = await service.reconcileDropsForDate('2026-10-14');

      expect(count).toBe(1);
      expect(prismaMock.deliveryDrop.create).not.toHaveBeenCalled();
      expect(prismaMock.deliveryDrop.update).not.toHaveBeenCalled();
    });

    it('auto-assigns company default driver when drop has no driver', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: {
            id: 'comp-google',
            defaultDriverId: 'driver-john',
            defaultDriver: {
              id: 'driver-john',
              isActive: true,
              role: UserRole.DRIVER,
            },
          },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);
      prismaMock.deliveryDrop.create.mockResolvedValue({ id: 'drop-new' });

      await service.reconcileDropsForDate('2026-10-14');

      expect(prismaMock.deliveryDrop.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            driverId: 'driver-john',
          }),
        }),
      );
    });

    it('preserves manually assigned driver and does not overwrite with company default driver', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-google',
          deliveryDate: new Date('2026-10-14T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          ...defaultAddress,
          Company: {
            id: 'comp-google',
            defaultDriverId: 'driver-john',
            defaultDriver: {
              id: 'driver-john',
              isActive: true,
              role: UserRole.DRIVER,
            },
          },
        },
      ];

      // Drop already has Sarah manually assigned
      const existingDrop = {
        id: 'drop-existing',
        driverId: 'driver-sarah',
        status: DeliveryDropStatus.KITCHEN_READY,
        orders: [{ id: 'ord-1' }],
      };

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(existingDrop);

      await service.reconcileDropsForDate('2026-10-14');

      // Should NOT update driverId back to driver-john
      expect(prismaMock.deliveryDrop.update).not.toHaveBeenCalled();
    });
  });

  describe('Manual Driver Assignment (Requirements 10, 12)', () => {
    it('successfully assigns an active driver to a drop', async () => {
      const drop = { id: 'drop-1', status: DeliveryDropStatus.KITCHEN_READY };
      const driver = { id: 'driver-1', name: 'John Doe', isActive: true, role: UserRole.DRIVER };

      prismaMock.deliveryDrop.findUnique.mockResolvedValue(drop);
      prismaMock.user.findUnique.mockResolvedValue(driver);
      prismaMock.deliveryDrop.update.mockResolvedValue({
        id: 'drop-1',
        driverId: 'driver-1',
      });

      const result = await service.assignDriver('drop-1', 'driver-1', 'admin-id');

      expect(result.driverId).toBe('driver-1');
      expect(prismaMock.deliveryDrop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'drop-1' },
          data: { driverId: 'driver-1' },
        }),
      );
    });

    it('throws NotFoundException if drop does not exist', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue(null);

      await expect(service.assignDriver('drop-999', 'driver-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if drop is already DELIVERED', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.DELIVERED,
      });

      await expect(service.assignDriver('drop-1', 'driver-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if assigned user does not have DRIVER role', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-kitchen',
        name: 'Cook',
        isActive: true,
        role: UserRole.KITCHEN,
      });

      await expect(service.assignDriver('drop-1', 'user-kitchen')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if driver is deactivated', async () => {
      prismaMock.deliveryDrop.findUnique.mockResolvedValue({
        id: 'drop-1',
        status: DeliveryDropStatus.KITCHEN_READY,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'driver-inactive',
        name: 'Inactive Driver',
        isActive: false,
        role: UserRole.DRIVER,
      });

      await expect(service.assignDriver('drop-1', 'driver-inactive')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
