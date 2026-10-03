import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import {
  CreateKitchenHolidayDto,
  UpdateKitchenHolidayDto,
} from './dto/index.js';
import type { KitchenHolidayResponse } from './types/settings.types.js';

@Injectable()
export class KitchenHolidayService {
  private readonly logger = new Logger(KitchenHolidayService.name);
  private readonly changeListeners: Array<() => void> = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a callback listener triggered whenever a holiday is created, updated, or deleted.
   */
  onHolidayChanged(listener: () => void): void {
    this.changeListeners.push(listener);
  }

  private notifyHolidayChanged(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (err) {
        this.logger.error('Error invoking holiday change listener', err);
      }
    }
  }

  /**
   * Helper to format a raw KitchenHoliday DB record into KitchenHolidayResponse.
   */
  mapToResponse(holiday: {
    id: string;
    date: Date;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): KitchenHolidayResponse {
    return {
      id: holiday.id,
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      description: holiday.description,
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
    };
  }

  /**
   * List all kitchen holidays ordered chronologically by date.
   */
  async getHolidays(): Promise<KitchenHolidayResponse[]> {
    const holidays = await this.prisma.kitchenHoliday.findMany({
      orderBy: { date: 'asc' },
    });
    return holidays.map((h) => this.mapToResponse(h));
  }

  /**
   * Get a single kitchen holiday by its ID.
   */
  async getHolidayById(id: string): Promise<KitchenHolidayResponse> {
    const holiday = await this.prisma.kitchenHoliday.findUnique({
      where: { id },
    });
    if (!holiday) {
      throw new NotFoundException(`Kitchen holiday with ID '${id}' not found`);
    }
    return this.mapToResponse(holiday);
  }

  /**
   * Create a new platform-wide kitchen holiday.
   * Rejects duplicate dates with 409 Conflict.
   */
  async createHoliday(
    dto: CreateKitchenHolidayDto,
  ): Promise<KitchenHolidayResponse> {
    const dateStr = dto.date.split('T')[0];
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await this.prisma.kitchenHoliday.findUnique({
      where: { date: dateObj },
    });
    if (existing) {
      throw new ConflictException(
        `A kitchen holiday on '${dateStr}' already exists`,
      );
    }

    try {
      const holiday = await this.prisma.kitchenHoliday.create({
        data: {
          id: randomUUID(),
          date: dateObj,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          updatedAt: new Date(),
        },
      });

      this.notifyHolidayChanged();
      this.logger.log(`Created kitchen holiday: ${holiday.name} on ${dateStr}`);
      return this.mapToResponse(holiday);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `A kitchen holiday on '${dateStr}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Update an existing kitchen holiday.
   */
  async updateHoliday(
    id: string,
    dto: UpdateKitchenHolidayDto,
  ): Promise<KitchenHolidayResponse> {
    const holiday = await this.prisma.kitchenHoliday.findUnique({
      where: { id },
    });
    if (!holiday) {
      throw new NotFoundException(`Kitchen holiday with ID '${id}' not found`);
    }

    let dateObj: Date | undefined;
    if (dto.date) {
      const dateStr = dto.date.split('T')[0];
      dateObj = new Date(`${dateStr}T00:00:00.000Z`);

      if (dateObj.getTime() !== holiday.date.getTime()) {
        const conflict = await this.prisma.kitchenHoliday.findUnique({
          where: { date: dateObj },
        });
        if (conflict) {
          throw new ConflictException(
            `A kitchen holiday on '${dateStr}' already exists`,
          );
        }
      }
    }

    try {
      const updated = await this.prisma.kitchenHoliday.update({
        where: { id },
        data: {
          ...(dateObj ? { date: dateObj } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          updatedAt: new Date(),
        },
      });

      this.notifyHolidayChanged();
      this.logger.log(`Updated kitchen holiday: ${updated.id}`);
      return this.mapToResponse(updated);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        const dateStr = dto.date?.split('T')[0];
        throw new ConflictException(
          `A kitchen holiday on '${dateStr}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete a kitchen holiday by ID.
   */
  async deleteHoliday(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const holiday = await this.prisma.kitchenHoliday.findUnique({
      where: { id },
    });
    if (!holiday) {
      throw new NotFoundException(`Kitchen holiday with ID '${id}' not found`);
    }

    await this.prisma.kitchenHoliday.delete({
      where: { id },
    });

    this.notifyHolidayChanged();
    this.logger.log(`Deleted kitchen holiday: ${holiday.name} (${holiday.id})`);
    return {
      success: true,
      message: 'Kitchen holiday deleted successfully',
    };
  }
}
