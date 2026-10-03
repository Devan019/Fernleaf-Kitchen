import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  FulfillmentStatus,
  KitchenUnitStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { MarkDeliveredDto } from './dto/mark-delivered.dto.js';
import { calculateIsOnTime } from './utils/drop-grouping.utils.js';

@Injectable()
export class DispatchStatusService {
  private readonly logger = new Logger(DispatchStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to retrieve the centralized business timezone.
   */
  async getBusinessTimezone(): Promise<string> {
    const setting = await this.prisma.kitchenSetting.findUnique({
      where: { key: 'KITCHEN_TIMEZONE' },
    });
    return setting?.value || process.env.KITCHEN_TIMEZONE || 'UTC';
  }

  /**
   * Marks a delivery drop DISPATCH_READY.
   *
   * Business Rules (Section 4, 5):
   * - Drop must be KITCHEN_READY.
   * - Cannot skip KITCHEN_READY.
   * - Cannot repeat DISPATCH_READY.
   * - Cancelled/rejected orders cannot be dispatched.
   * - Every order in drop must have all KitchenUnits DONE and kitchenReadyAt set.
   * - Idempotency & concurrency safe.
   */
  async markDispatchReady(dropId: string, changedByUserId?: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        orders: {
          include: {
            kitchenUnits: true,
          },
        },
      },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    if (drop.status === DeliveryDropStatus.DISPATCH_READY) {
      throw new ConflictException('Delivery drop is already marked dispatch ready');
    }

    if (drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException('Cannot mark dispatch ready: drop is already out for delivery');
    }

    if (drop.status === DeliveryDropStatus.DELIVERED) {
      throw new BadRequestException('Cannot mark dispatch ready: drop is already delivered');
    }

    if (drop.orders.length === 0) {
      throw new BadRequestException('Cannot mark dispatch ready: drop has no attached orders');
    }

    // Verify all orders in the drop
    for (const order of drop.orders) {
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot dispatch drop: order '${order.orderNumber}' is ${order.status}`,
        );
      }

      // Check unfinished kitchen units (Section 4 requirement)
      if (order.kitchenUnits && order.kitchenUnits.length > 0) {
        const incompleteUnits = order.kitchenUnits.filter(
          (u) => u.status !== KitchenUnitStatus.DONE,
        );
        if (incompleteUnits.length > 0) {
          throw new BadRequestException(
            `Cannot mark dispatch ready: order '${order.orderNumber}' has ${incompleteUnits.length} unfinished kitchen unit(s)`,
          );
        }
      }

      // If kitchen units exist, kitchenReadyAt must be set
      if (
        order.kitchenUnits &&
        order.kitchenUnits.length > 0 &&
        !order.kitchenReadyAt
      ) {
        throw new BadRequestException(
          `Cannot mark dispatch ready: order '${order.orderNumber}' kitchen work is not complete`,
        );
      }
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Atomic conditional update to guard against concurrent transitions
      const updateResult = await tx.deliveryDrop.updateMany({
        where: {
          id: dropId,
          status: DeliveryDropStatus.KITCHEN_READY,
        },
        data: {
          status: DeliveryDropStatus.DISPATCH_READY,
          dispatchReadyAt: now,
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Drop was modified concurrently or is no longer in KITCHEN_READY state',
        );
      }

      // Update related orders to DISPATCH_READY
      await tx.order.updateMany({
        where: { dropId },
        data: {
          fulfillmentStatus: FulfillmentStatus.DISPATCH_READY,
          dispatchReadyAt: now,
          updatedAt: now,
        },
      });

      // Record DropStatusHistory
      await tx.dropStatusHistory.create({
        data: {
          dropId,
          fromStatus: DeliveryDropStatus.KITCHEN_READY,
          toStatus: DeliveryDropStatus.DISPATCH_READY,
          changedByUserId: changedByUserId ?? null,
          note: 'Drop marked dispatch ready',
        },
      });

      return tx.deliveryDrop.findUniqueOrThrow({
        where: { id: dropId },
        include: {
          company: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true, email: true } },
          orders: { select: { id: true, orderNumber: true, fulfillmentStatus: true } },
        },
      });
    });
  }

  /**
   * Marks a delivery drop OUT_FOR_DELIVERY.
   *
   * Business Rules (Section 6):
   * - Drop must be DISPATCH_READY.
   * - Drop must have an assigned driver (MANDATORY).
   * - Cannot already be OUT_FOR_DELIVERY.
   * - Cannot already be DELIVERED.
   * - Transaction-safe.
   */
  async markOutForDelivery(dropId: string, changedByUserId?: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        orders: true,
      },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    if (drop.status === DeliveryDropStatus.KITCHEN_READY) {
      throw new BadRequestException(
        'Drop must be marked DISPATCH_READY before it can go out for delivery',
      );
    }

    if (drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY) {
      throw new ConflictException('Delivery drop is already out for delivery');
    }

    if (drop.status === DeliveryDropStatus.DELIVERED) {
      throw new BadRequestException('Cannot dispatch an already delivered drop');
    }

    // MANDATORY DRIVER CHECK
    if (!drop.driverId) {
      throw new BadRequestException(
        'Cannot mark drop out for delivery without an assigned driver',
      );
    }

    // Check orders are not cancelled or rejected
    for (const order of drop.orders) {
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot dispatch drop: order '${order.orderNumber}' is ${order.status}`,
        );
      }
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Atomic conditional update
      const updateResult = await tx.deliveryDrop.updateMany({
        where: {
          id: dropId,
          status: DeliveryDropStatus.DISPATCH_READY,
        },
        data: {
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
          outForDeliveryAt: now,
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Drop was modified concurrently or is no longer in DISPATCH_READY state',
        );
      }

      // Update related orders to OUT_FOR_DELIVERY
      await tx.order.updateMany({
        where: { dropId },
        data: {
          fulfillmentStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
          outForDeliveryAt: now,
          updatedAt: now,
        },
      });

      // Record DropStatusHistory
      await tx.dropStatusHistory.create({
        data: {
          dropId,
          fromStatus: DeliveryDropStatus.DISPATCH_READY,
          toStatus: DeliveryDropStatus.OUT_FOR_DELIVERY,
          changedByUserId: changedByUserId ?? null,
          note: 'Drop dispatched and marked out for delivery',
        },
      });

      return tx.deliveryDrop.findUniqueOrThrow({
        where: { id: dropId },
        include: {
          company: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true, email: true } },
          orders: { select: { id: true, orderNumber: true, fulfillmentStatus: true } },
        },
      });
    });
  }

  /**
   * Driver marks a drop DELIVERED.
   *
   * Business Rules (Section 7, 16, 21, 25):
   * - Authenticated user must be the assigned driver.
   * - Drop must be OUT_FOR_DELIVERY.
   * - Drop cannot already be DELIVERED.
   * - Driver cannot deliver another driver's drop (403 Forbidden).
   * - Every order in drop becomes DELIVERED.
   * - Records deliveredAt, optional note, optional photoUrl.
   * - Calculates whether delivery was on time (deliveredAt <= promisedDeliveryTime).
   * - Atomic and transaction-safe.
   */
  async markDelivered(
    dropId: string,
    driverUserId: string,
    dto: MarkDeliveredDto,
  ) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        orders: true,
      },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    // Driver isolation: verify current authenticated user is assigned driver
    if (drop.driverId !== driverUserId) {
      throw new ForbiddenException(
        'You are not authorized to deliver this drop: assigned to another driver',
      );
    }

    if (drop.status === DeliveryDropStatus.DELIVERED) {
      throw new ConflictException('Delivery drop is already delivered');
    }

    if (drop.status !== DeliveryDropStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Cannot deliver drop in '${drop.status}' state. Drop must be OUT_FOR_DELIVERY.`,
      );
    }

    const timezone = await this.getBusinessTimezone();
    const now = new Date();
    const isOnTime = calculateIsOnTime(
      now,
      drop.deliveryDate,
      drop.deliveryTime,
      timezone,
    );

    return this.prisma.$transaction(async (tx) => {
      // Atomic conditional update
      const updateResult = await tx.deliveryDrop.updateMany({
        where: {
          id: dropId,
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        },
        data: {
          status: DeliveryDropStatus.DELIVERED,
          deliveredAt: now,
          deliveredNote: dto.note?.trim() || null,
          deliveredPhotoUrl: dto.photoUrl?.trim() || null,
          isOnTime,
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Drop was modified concurrently or already delivered',
        );
      }

      // Update related orders to DELIVERED (both operational fulfillmentStatus and main OrderStatus)
      await tx.order.updateMany({
        where: { dropId },
        data: {
          fulfillmentStatus: FulfillmentStatus.DELIVERED,
          deliveredAt: now,
          status: OrderStatus.DELIVERED,
          updatedAt: now,
        },
      });

      // Record OrderStatusHistory for each order in the drop
      for (const order of drop.orders) {
        await tx.orderStatusHistory.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.DELIVERED,
            changedByUserId: driverUserId,
            note: dto.note?.trim() || 'Delivered by driver',
            createdAt: now,
          },
        });
      }

      // Record DropStatusHistory
      await tx.dropStatusHistory.create({
        data: {
          dropId,
          fromStatus: DeliveryDropStatus.OUT_FOR_DELIVERY,
          toStatus: DeliveryDropStatus.DELIVERED,
          changedByUserId: driverUserId,
          note: dto.note?.trim() || 'Delivered by driver',
        },
      });

      return tx.deliveryDrop.findUniqueOrThrow({
        where: { id: dropId },
        include: {
          company: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true, email: true } },
          orders: { select: { id: true, orderNumber: true, status: true, fulfillmentStatus: true } },
        },
      });
    });
  }

  /**
   * Helper to mark dispatch ready from order ID.
   */
  async markOrderDispatchReady(orderId: string, changedByUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, dropId: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (!order.dropId) {
      throw new BadRequestException('Order is not attached to a delivery drop');
    }

    return this.markDispatchReady(order.dropId, changedByUserId);
  }
}
