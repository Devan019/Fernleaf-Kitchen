import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { KitchenHolidayService } from '../kitchen-holiday.service.js';

describe('KitchenHolidayService', () => {
  let service: KitchenHolidayService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      kitchenHoliday: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new KitchenHolidayService(prismaMock as unknown as PrismaService);
  });

  describe('getHolidays', () => {
    it('returns all kitchen holidays formatted as YYYY-MM-DD', async () => {
      prismaMock.kitchenHoliday.findMany.mockResolvedValue([
        {
          id: 'h-1',
          date: new Date('2026-12-25T00:00:00.000Z'),
          name: 'Christmas Day',
          description: 'Kitchen closed',
          createdAt: new Date('2026-10-01T00:00:00.000Z'),
          updatedAt: new Date('2026-10-01T00:00:00.000Z'),
        },
      ]);

      const result = await service.getHolidays();
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-12-25');
      expect(result[0].name).toBe('Christmas Day');
      expect(prismaMock.kitchenHoliday.findMany).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('getHolidayById', () => {
    it('returns holiday details when found', async () => {
      prismaMock.kitchenHoliday.findUnique.mockResolvedValue({
        id: 'h-1',
        date: new Date('2026-12-25T00:00:00.000Z'),
        name: 'Christmas Day',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getHolidayById('h-1');
      expect(result.id).toBe('h-1');
      expect(result.name).toBe('Christmas Day');
      expect(result.date).toBe('2026-12-25');
    });

    it('throws NotFoundException when holiday does not exist', async () => {
      prismaMock.kitchenHoliday.findUnique.mockResolvedValue(null);

      await expect(service.getHolidayById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createHoliday', () => {
    it('creates a new holiday and notifies change listeners', async () => {
      const listener = vi.fn();
      service.onHolidayChanged(listener);

      prismaMock.kitchenHoliday.findUnique.mockResolvedValue(null);
      prismaMock.kitchenHoliday.create.mockResolvedValue({
        id: 'h-new',
        date: new Date('2027-01-01T00:00:00.000Z'),
        name: "New Year's Day",
        description: 'Office holiday',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createHoliday({
        date: '2027-01-01',
        name: "New Year's Day",
        description: 'Office holiday',
      });

      expect(result.id).toBe('h-new');
      expect(result.date).toBe('2027-01-01');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException if holiday already exists on the date', async () => {
      prismaMock.kitchenHoliday.findUnique.mockResolvedValue({
        id: 'existing-h',
        date: new Date('2027-01-01T00:00:00.000Z'),
      });

      await expect(
        service.createHoliday({
          date: '2027-01-01',
          name: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateHoliday', () => {
    it('updates holiday fields and notifies listeners', async () => {
      const listener = vi.fn();
      service.onHolidayChanged(listener);

      prismaMock.kitchenHoliday.findUnique.mockResolvedValue({
        id: 'h-1',
        date: new Date('2026-12-25T00:00:00.000Z'),
        name: 'Christmas',
        description: null,
      });

      prismaMock.kitchenHoliday.update.mockResolvedValue({
        id: 'h-1',
        date: new Date('2026-12-25T00:00:00.000Z'),
        name: 'Christmas Day Updated',
        description: 'Updated desc',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateHoliday('h-1', {
        name: 'Christmas Day Updated',
        description: 'Updated desc',
      });

      expect(result.name).toBe('Christmas Day Updated');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when updating non-existent holiday', async () => {
      prismaMock.kitchenHoliday.findUnique.mockResolvedValue(null);

      await expect(
        service.updateHoliday('missing', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if updating date to an already occupied date', async () => {
      prismaMock.kitchenHoliday.findUnique
        .mockResolvedValueOnce({
          id: 'h-1',
          date: new Date('2026-12-25T00:00:00.000Z'),
          name: 'Christmas',
        })
        .mockResolvedValueOnce({
          id: 'h-2',
          date: new Date('2026-12-26T00:00:00.000Z'),
          name: 'Boxing Day',
        });

      await expect(
        service.updateHoliday('h-1', { date: '2026-12-26' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteHoliday', () => {
    it('deletes an existing holiday and notifies listeners', async () => {
      const listener = vi.fn();
      service.onHolidayChanged(listener);

      prismaMock.kitchenHoliday.findUnique.mockResolvedValue({
        id: 'h-1',
        name: 'Christmas Day',
      });
      prismaMock.kitchenHoliday.delete.mockResolvedValue({});

      const result = await service.deleteHoliday('h-1');
      expect(result.success).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when deleting non-existent holiday', async () => {
      prismaMock.kitchenHoliday.findUnique.mockResolvedValue(null);

      await expect(service.deleteHoliday('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
