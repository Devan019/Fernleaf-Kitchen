import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  KitchenUnitStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  KitchenUnitResponse,
  OrderKitchenForceCompleteResult,
} from './types/kitchen-board.types.js';
import {
  calculatePlannedTimes,
  calculateWorkStatus,
  DEFAULT_AT_RISK_THRESHOLD_MINUTES,
} from './utils/kitchen-time.utils.js';

@Injectable()
export class KitchenUnitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch kitchen settings for timezone and at-risk threshold.
   */
  private async getKitchenSettings(tx?: Prisma.TransactionClient): Promise<{
    timeZone: string;
    atRiskThresholdMinutes: number;
  }> {
    const client = tx ?? this.prisma;
    const settings = await client.kitchenSetting.findMany({
      where: {
        key: {
          in: ['KITCHEN_TIMEZONE', 'AT_RISK_THRESHOLD_MINUTES'],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));
    const timeZone =
      map.get('KITCHEN_TIMEZONE') || process.env.KITCHEN_TIMEZONE || 'UTC';
    const atRiskThresholdMinutes = map.get('AT_RISK_THRESHOLD_MINUTES')
      ? parseInt(map.get('AT_RISK_THRESHOLD_MINUTES')!, 10)
      : DEFAULT_AT_RISK_THRESHOLD_MINUTES;

    return { timeZone, atRiskThresholdMinutes };
  }

  /**
   * Helper to format a raw KitchenUnit record (with includes) into KitchenUnitResponse.
   */
  mapToResponse(
    unit: any,
    atRiskThresholdMinutes = DEFAULT_AT_RISK_THRESHOLD_MINUTES,
    now = new Date(),
  ): KitchenUnitResponse {
    const deliveryDateStr =
      typeof unit.order.deliveryDate === 'string'
        ? unit.order.deliveryDate.substring(0, 10)
        : unit.order.deliveryDate.toISOString().substring(0, 10);

    const isDone = unit.status === KitchenUnitStatus.DONE;
    const { isLate, isAtRisk, operationalStatus } = calculateWorkStatus(
      unit.order.plannedKitchenReadyAt,
      isDone,
      now,
      atRiskThresholdMinutes,
    );

    const selectedOptions =
      unit.combination?.OrderCombinationOption?.map((co: any) => ({
        optionId: co.optionId,
        optionName: co.optionNameSnapshot ?? co.Option?.name,
        optionGroupName: co.optionGroupNameSnapshot ?? null,
        portionSizeName: co.portionSizeNameSnapshot ?? null,
      })) ?? [];

    return {
      unitId: unit.id,
      orderId: unit.orderId,
      orderNumber: unit.order.orderNumber,
      company: {
        id: unit.order.Company?.id ?? unit.order.companyId,
        name: unit.order.Company?.name ?? '',
      },
      employee: {
        id: unit.order.Employee?.id ?? unit.order.employeeId,
        name: unit.order.Employee?.name ?? '',
      },
      dish: {
        id: unit.orderLine.dishId,
        name: unit.orderLine.dishNameSnapshot ?? unit.orderLine.Dish?.name ?? '',
        sku: unit.orderLine.dishSkuSnapshot ?? unit.orderLine.Dish?.sku ?? null,
      },
      quantity: unit.quantity,
      selectedOptions,
      station: {
        id: unit.kitchenStationId ?? null,
        name: unit.kitchenStation?.name ?? 'Unassigned',
      },
      status: unit.status,
      startedAt: unit.startedAt,
      completedAt: unit.completedAt,
      startedByUser: unit.startedByUser
        ? { id: unit.startedByUser.id, name: unit.startedByUser.name }
        : null,
      completedByUser: unit.completedByUser
        ? { id: unit.completedByUser.id, name: unit.completedByUser.name }
        : null,
      plannedKitchenReadyAt: unit.order.plannedKitchenReadyAt,
      plannedDispatchReadyAt: unit.order.plannedDispatchReadyAt,
      deliveryDate: deliveryDateStr,
      deliveryTime: unit.order.deliveryTime,
      isLate,
      isAtRisk,
      operationalStatus,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  /**
   * Ensures that KitchenUnit records exist for all OrderLineCombinations of a CONFIRMED order.
   * Completely idempotent: Running multiple times creates no duplicates.
   */
  async ensureUnitsForOrder(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        Company: { select: { id: true, name: true, leaveKitchenMinutes: true } },
        OrderLine: {
          include: {
            Dish: { select: { id: true, kitchenStationId: true } },
            OrderLineCombination: {
              include: {
                kitchenUnit: true,
              },
            },
          },
        },
      },
    });

    if (!order || order.status !== OrderStatus.CONFIRMED) {
      return;
    }

    const { timeZone } = await this.getKitchenSettings(client);

    // If planned times are missing, compute and save them
    if (!order.plannedKitchenReadyAt || !order.plannedDispatchReadyAt) {
      const { plannedDispatchReadyAt, plannedKitchenReadyAt } =
        calculatePlannedTimes(
          order.deliveryDate,
          order.deliveryTime,
          order.Company.leaveKitchenMinutes,
          timeZone,
        );

      await client.order.update({
        where: { id: order.id },
        data: {
          plannedDispatchReadyAt,
          plannedKitchenReadyAt,
        },
      });
    }

    const now = new Date();

    // Iterate through lines and combinations to ensure each combination has a unit
    for (const line of order.OrderLine) {
      const stationId = line.Dish?.kitchenStationId ?? null;

      for (const combination of line.OrderLineCombination) {
        if (combination.kitchenUnit) {
          continue;
        }

        // Check again by combinationId to protect against concurrency
        const existing = await client.kitchenUnit.findUnique({
          where: { combinationId: combination.id },
        });

        if (!existing) {
          try {
            await client.kitchenUnit.create({
              data: {
                orderId: order.id,
                orderLineId: line.id,
                combinationId: combination.id,
                kitchenStationId: stationId,
                status: KitchenUnitStatus.PENDING,
                quantity: combination.quantity,
                createdAt: now,
                updatedAt: now,
              },
            });
          } catch (error) {
            // If another process inserted it concurrently (unique constraint on combinationId), ignore safely
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              continue;
            }
            throw error;
          }
        }
      }
    }
  }

  /**
   * Ensures units exist for an array of order IDs.
   */
  async ensureUnitsForOrders(
    orderIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const orderId of orderIds) {
      await this.ensureUnitsForOrder(orderId, tx);
    }
  }

  /**
   * Starts a KitchenUnit (PENDING -> STARTED).
   * Transactional and concurrency-safe.
   */
  async startUnit(
    unitId: string,
    userId: string,
  ): Promise<KitchenUnitResponse> {
    const { atRiskThresholdMinutes } = await this.getKitchenSettings();
    const now = new Date();

    const updatedUnit = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          order: true,
        },
      });

      if (!unit) {
        throw new NotFoundException(`Kitchen unit '${unitId}' not found`);
      }

      if (unit.order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot start unit for order in status '${unit.order.status}'. Order must be CONFIRMED.`,
        );
      }

      if (unit.status === KitchenUnitStatus.DONE) {
        throw new ConflictException(
          `Kitchen unit '${unitId}' is already completed`,
        );
      }

      if (unit.status === KitchenUnitStatus.STARTED) {
        throw new ConflictException(
          `Kitchen unit '${unitId}' is already started`,
        );
      }

      // Concurrency protection: Atomic conditional update
      const updateResult = await tx.kitchenUnit.updateMany({
        where: {
          id: unitId,
          status: KitchenUnitStatus.PENDING,
        },
        data: {
          status: KitchenUnitStatus.STARTED,
          startedAt: now,
          startedByUserId: userId,
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          `Kitchen unit '${unitId}' was started or completed concurrently`,
        );
      }

      // Order kitchenStartedAt logic (Section 9):
      // When the FIRST unit starts, set order.kitchenStartedAt. Later starts do not overwrite.
      await tx.order.updateMany({
        where: {
          id: unit.orderId,
          kitchenStartedAt: null,
        },
        data: {
          kitchenStartedAt: now,
          updatedAt: now,
        },
      });

      return tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          order: {
            include: {
              Company: { select: { id: true, name: true } },
              Employee: { select: { id: true, name: true } },
            },
          },
          orderLine: {
            include: {
              Dish: { select: { id: true, name: true, sku: true } },
            },
          },
          combination: {
            include: {
              OrderCombinationOption: {
                include: {
                  Option: { select: { id: true, name: true } },
                },
              },
            },
          },
          kitchenStation: { select: { id: true, name: true } },
          startedByUser: { select: { id: true, name: true } },
          completedByUser: { select: { id: true, name: true } },
        },
      });
    });

    return this.mapToResponse(updatedUnit, atRiskThresholdMinutes, now);
  }

  /**
   * Completes a KitchenUnit (STARTED -> DONE or PENDING -> DONE).
   * Transactional and concurrency-safe.
   */
  async completeUnit(
    unitId: string,
    userId: string,
  ): Promise<KitchenUnitResponse> {
    const { atRiskThresholdMinutes } = await this.getKitchenSettings();
    const now = new Date();

    const updatedUnit = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          order: true,
        },
      });

      if (!unit) {
        throw new NotFoundException(`Kitchen unit '${unitId}' not found`);
      }

      if (unit.order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot complete unit for order in status '${unit.order.status}'. Order must be CONFIRMED.`,
        );
      }

      if (unit.status === KitchenUnitStatus.DONE) {
        throw new ConflictException(
          `Kitchen unit '${unitId}' is already completed`,
        );
      }

      if (unit.status === KitchenUnitStatus.PENDING) {
        // PENDING -> DONE: Record start and completion simultaneously
        const updateResult = await tx.kitchenUnit.updateMany({
          where: {
            id: unitId,
            status: KitchenUnitStatus.PENDING,
          },
          data: {
            status: KitchenUnitStatus.DONE,
            startedAt: now,
            startedByUserId: userId,
            completedAt: now,
            completedByUserId: userId,
            updatedAt: now,
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Kitchen unit '${unitId}' was updated concurrently`,
          );
        }

        // If order had no kitchenStartedAt, set it now
        await tx.order.updateMany({
          where: {
            id: unit.orderId,
            kitchenStartedAt: null,
          },
          data: {
            kitchenStartedAt: now,
            updatedAt: now,
          },
        });
      } else if (unit.status === KitchenUnitStatus.STARTED) {
        // STARTED -> DONE: Preserve existing startedAt/startedByUserId
        const updateResult = await tx.kitchenUnit.updateMany({
          where: {
            id: unitId,
            status: KitchenUnitStatus.STARTED,
          },
          data: {
            status: KitchenUnitStatus.DONE,
            completedAt: now,
            completedByUserId: userId,
            updatedAt: now,
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Kitchen unit '${unitId}' was updated concurrently`,
          );
        }
      }

      // Order kitchenReadyAt logic (Section 10):
      // Check whether all units for that order are DONE
      const remainingIncomplete = await tx.kitchenUnit.count({
        where: {
          orderId: unit.orderId,
          status: { not: KitchenUnitStatus.DONE },
        },
      });

      if (remainingIncomplete === 0) {
        await tx.order.update({
          where: { id: unit.orderId },
          data: {
            kitchenReadyAt: now,
            updatedAt: now,
          },
        });
      }

      return tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          order: {
            include: {
              Company: { select: { id: true, name: true } },
              Employee: { select: { id: true, name: true } },
            },
          },
          orderLine: {
            include: {
              Dish: { select: { id: true, name: true, sku: true } },
            },
          },
          combination: {
            include: {
              OrderCombinationOption: {
                include: {
                  Option: { select: { id: true, name: true } },
                },
              },
            },
          },
          kitchenStation: { select: { id: true, name: true } },
          startedByUser: { select: { id: true, name: true } },
          completedByUser: { select: { id: true, name: true } },
        },
      });
    });

    return this.mapToResponse(updatedUnit, atRiskThresholdMinutes, now);
  }

  /**
   * Admin Force Complete (Section 14).
   * Marks all kitchen units of an order as DONE.
   * Transactional and idempotent.
   */
  async forceCompleteOrder(
    orderId: string,
    adminUserId: string,
  ): Promise<OrderKitchenForceCompleteResult> {
    const { atRiskThresholdMinutes } = await this.getKitchenSettings();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          kitchenUnits: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID '${orderId}' not found`);
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot force-complete kitchen work for order in status '${order.status}'. Order must be CONFIRMED.`,
        );
      }

      // 1. If PENDING units exist: record both startedAt and completedAt
      await tx.kitchenUnit.updateMany({
        where: {
          orderId,
          status: KitchenUnitStatus.PENDING,
        },
        data: {
          status: KitchenUnitStatus.DONE,
          startedAt: now,
          startedByUserId: adminUserId,
          completedAt: now,
          completedByUserId: adminUserId,
          updatedAt: now,
        },
      });

      // 2. If STARTED units exist: preserve existing startedAt/startedByUserId, set completedAt
      await tx.kitchenUnit.updateMany({
        where: {
          orderId,
          status: KitchenUnitStatus.STARTED,
        },
        data: {
          status: KitchenUnitStatus.DONE,
          completedAt: now,
          completedByUserId: adminUserId,
          updatedAt: now,
        },
      });

      // 3. Update order: set kitchenStartedAt (if null) and kitchenReadyAt (if null or now)
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          kitchenStartedAt: order.kitchenStartedAt ?? now,
          kitchenReadyAt: order.kitchenReadyAt ?? now,
          updatedAt: now,
        },
      });

      // Fetch all units for this order
      const allUnits = await tx.kitchenUnit.findMany({
        where: { orderId },
        include: {
          order: {
            include: {
              Company: { select: { id: true, name: true } },
              Employee: { select: { id: true, name: true } },
            },
          },
          orderLine: {
            include: {
              Dish: { select: { id: true, name: true, sku: true } },
            },
          },
          combination: {
            include: {
              OrderCombinationOption: {
                include: {
                  Option: { select: { id: true, name: true } },
                },
              },
            },
          },
          kitchenStation: { select: { id: true, name: true } },
          startedByUser: { select: { id: true, name: true } },
          completedByUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const responseUnits = allUnits.map((u) =>
        this.mapToResponse(u, atRiskThresholdMinutes, now),
      );

      return {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        kitchenStartedAt: updatedOrder.kitchenStartedAt,
        kitchenReadyAt: updatedOrder.kitchenReadyAt,
        units: responseUnits,
      };
    });
  }
}
