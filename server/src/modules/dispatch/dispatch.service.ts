import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  KitchenUnitStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { DropService } from './drop.service.js';
import { DispatchBoardQueryDto } from './dto/dispatch-board-query.dto.js';
import {
  DispatchBoardDropItem,
  DispatchBoardResponse,
  DispatchDropDetailResponse,
} from './types/dispatch.types.js';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dropService: DropService,
  ) {}

  /**
   * Retrieves the Dispatch Board for a given delivery date.
   * Drops are the primary operational unit, sorted by delivery time ascending.
   * Auto-reconciles any unattached or eligible orders prior to querying.
   */
  async getBoard(query: DispatchBoardQueryDto): Promise<DispatchBoardResponse> {
    const dateStr = query.deliveryDate.substring(0, 10);
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Idempotently reconcile drops for this date
    await this.dropService.reconcileDropsForDate(targetDate);

    // 2. Query drops matching filters
    const where: Prisma.DeliveryDropWhereInput = {
      deliveryDate: targetDate,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.driverId) {
      where.driverId = query.driverId;
    }
    if (query.companyId) {
      where.companyId = query.companyId;
    }

    const drops = await this.prisma.deliveryDrop.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true },
        },
        driver: {
          select: { id: true, name: true, email: true },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            kitchenReadyAt: true,
            kitchenUnits: {
              select: { id: true, status: true },
            },
          },
        },
      },
      orderBy: {
        deliveryTime: 'asc',
      },
    });

    const dropItems: DispatchBoardDropItem[] = drops.map((drop) => {
      // Determine if drop is eligible to be marked ready
      const allOrdersKitchenReady =
        drop.orders.length > 0 &&
        drop.orders.every((order) => {
          if (
            order.status === OrderStatus.CANCELLED ||
            order.status === OrderStatus.REJECTED
          ) {
            return false;
          }
          const hasIncompleteUnits = order.kitchenUnits.some(
            (u) => u.status !== KitchenUnitStatus.DONE,
          );
          if (hasIncompleteUnits) return false;
          return !!order.kitchenReadyAt || order.kitchenUnits.length === 0;
        });

      const canMarkReady =
        drop.status === DeliveryDropStatus.KITCHEN_READY &&
        allOrdersKitchenReady;

      const canMarkOutForDelivery =
        drop.status === DeliveryDropStatus.DISPATCH_READY &&
        drop.driverId !== null;

      const canDeliver = drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY;

      return {
        id: drop.id,
        deliveryDate: dateStr,
        deliveryTime: drop.deliveryTime,
        company: {
          id: drop.company.id,
          name: drop.company.name,
        },
        address: {
          street: drop.deliveryStreet,
          unit: drop.deliveryUnit,
          city: drop.deliveryCity,
          postcode: drop.deliveryPostcode,
          deliveryInstructions: drop.deliveryInstructions,
        },
        driver: drop.driver
          ? {
              id: drop.driver.id,
              name: drop.driver.name,
              email: drop.driver.email,
            }
          : null,
        status: drop.status,
        ordersCount: drop.orders.length,
        dispatchReadyAt: drop.dispatchReadyAt,
        outForDeliveryAt: drop.outForDeliveryAt,
        deliveredAt: drop.deliveredAt,
        deliveredNote: drop.deliveredNote,
        deliveredPhotoUrl: drop.deliveredPhotoUrl,
        isOnTime: drop.isOnTime,
        canMarkReady,
        canMarkOutForDelivery,
        canDeliver,
      };
    });

    return {
      deliveryDate: dateStr,
      drops: dropItems,
    };
  }

  /**
   * Retrieves detailed information about a single delivery drop for dispatchers/admins.
   */
  async getDropDetail(dropId: string): Promise<DispatchDropDetailResponse> {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        company: {
          select: { id: true, name: true },
        },
        driver: {
          select: { id: true, name: true, email: true },
        },
        orders: {
          include: {
            Employee: { select: { id: true, name: true } },
            OrderLine: true,
            kitchenUnits: true,
          },
        },
        statusHistory: {
          include: {
            changedByUser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    const dateStr =
      drop.deliveryDate instanceof Date
        ? drop.deliveryDate.toISOString().substring(0, 10)
        : String(drop.deliveryDate).substring(0, 10);

    const allOrdersKitchenReady =
      drop.orders.length > 0 &&
      drop.orders.every((order) => {
        if (
          order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.REJECTED
        ) {
          return false;
        }
        const hasIncompleteUnits = order.kitchenUnits.some(
          (u) => u.status !== KitchenUnitStatus.DONE,
        );
        if (hasIncompleteUnits) return false;
        return !!order.kitchenReadyAt || order.kitchenUnits.length === 0;
      });

    const canMarkReady =
      drop.status === DeliveryDropStatus.KITCHEN_READY && allOrdersKitchenReady;
    const canMarkOutForDelivery =
      drop.status === DeliveryDropStatus.DISPATCH_READY &&
      drop.driverId !== null;
    const canDeliver = drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY;

    return {
      id: drop.id,
      deliveryDate: dateStr,
      deliveryTime: drop.deliveryTime,
      company: {
        id: drop.company.id,
        name: drop.company.name,
      },
      address: {
        street: drop.deliveryStreet,
        unit: drop.deliveryUnit,
        city: drop.deliveryCity,
        postcode: drop.deliveryPostcode,
        deliveryInstructions: drop.deliveryInstructions,
      },
      driver: drop.driver
        ? {
            id: drop.driver.id,
            name: drop.driver.name,
            email: drop.driver.email,
          }
        : null,
      status: drop.status,
      ordersCount: drop.orders.length,
      dispatchReadyAt: drop.dispatchReadyAt,
      outForDeliveryAt: drop.outForDeliveryAt,
      deliveredAt: drop.deliveredAt,
      deliveredNote: drop.deliveredNote,
      deliveredPhotoUrl: drop.deliveredPhotoUrl,
      isOnTime: drop.isOnTime,
      canMarkReady,
      canMarkOutForDelivery,
      canDeliver,
      orders: drop.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        employee: {
          id: o.Employee.id,
          name: o.Employee.name,
        },
        packagingType: o.packagingType,
        deliveryInstructions: o.deliveryInstructions,
        status: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        kitchenReadyAt: o.kitchenReadyAt,
        total: o.total.toString(),
        itemsCount: o.OrderLine.reduce((sum, line) => sum + line.quantity, 0),
      })),
      statusHistory: drop.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedByUser: h.changedByUser
          ? { id: h.changedByUser.id, name: h.changedByUser.name }
          : null,
        note: h.note,
        createdAt: h.createdAt,
      })),
    };
  }
}
