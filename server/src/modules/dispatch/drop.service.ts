import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  OrderStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import {
  createDropGroupingKey,
} from './utils/drop-grouping.utils.js';

@Injectable()
export class DropService {
  private readonly logger = new Logger(DropService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently reconciles eligible orders into delivery drops for a given delivery date.
   *
   * Grouping Rules (Section 8, 9, 11):
   * Orders form ONE DROP when they share:
   * 1. Same companyId
   * 2. Same normalized delivery date (YYYY-MM-DD)
   * 3. Same exact delivery time (HH:mm)
   * 4. Same historical delivery address snapshot (street, unit, city, postcode)
   *
   * Default Driver Rules (Section 13, 34):
   * - If drop has no driver assigned, auto-assign company default driver (if active DRIVER).
   * - If drop already has an assigned driver, preserve it across reconciliations.
   */
  async reconcileDropsForDate(deliveryDate: Date | string): Promise<number> {
    const dateStr =
      typeof deliveryDate === 'string'
        ? deliveryDate.substring(0, 10)
        : deliveryDate.toISOString().substring(0, 10);

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Fetch all orders for this delivery date (excluding cancelled and rejected)
    const orders = await this.prisma.order.findMany({
      where: {
        deliveryDate: targetDate,
        status: {
          notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
        },
      },
      include: {
        Company: {
          select: {
            id: true,
            name: true,
            defaultDriverId: true,
            defaultDriver: {
              select: {
                id: true,
                isActive: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (orders.length === 0) {
      return 0;
    }

    // 2. Group orders using deterministic grouping key
    const groups = new Map<string, typeof orders>();
    for (const order of orders) {
      const key = createDropGroupingKey(
        order.companyId,
        dateStr,
        order.deliveryTime,
        {
          street: order.deliveryStreet,
          unit: order.deliveryUnit,
          city: order.deliveryCity,
          postcode: order.deliveryPostcode,
        },
      );

      const existing = groups.get(key) || [];
      existing.push(order);
      groups.set(key, existing);
    }

    let dropsCreatedOrUpdated = 0;

    // 3. Process each group inside database transactions
    for (const [key, groupOrders] of groups.entries()) {
      const firstOrder = groupOrders[0];
      const company = firstOrder.Company;

      // Determine eligible company default driver
      const defaultDriverId =
        company?.defaultDriver &&
        company.defaultDriver.isActive &&
        company.defaultDriver.role === UserRole.DRIVER
          ? company.defaultDriver.id
          : null;

      await this.prisma.$transaction(async (tx) => {
        const existingDrop = await tx.deliveryDrop.findUnique({
          where: { groupingKey: key },
          include: {
            orders: { select: { id: true } },
          },
        });

        if (!existingDrop) {
          // Create new drop
          const newDrop = await tx.deliveryDrop.create({
            data: {
              companyId: firstOrder.companyId,
              deliveryDate: targetDate,
              deliveryTime: firstOrder.deliveryTime,
              groupingKey: key,
              deliveryStreet: firstOrder.deliveryStreet,
              deliveryUnit: firstOrder.deliveryUnit,
              deliveryCity: firstOrder.deliveryCity,
              deliveryPostcode: firstOrder.deliveryPostcode,
              deliveryInstructions: firstOrder.deliveryInstructions,
              status: DeliveryDropStatus.KITCHEN_READY,
              driverId: defaultDriverId,
            },
          });

          // Attach orders to drop
          const orderIds = groupOrders.map((o) => o.id);
          await tx.order.updateMany({
            where: { id: { in: orderIds } },
            data: { dropId: newDrop.id },
          });

          // Record initial status history
          await tx.dropStatusHistory.create({
            data: {
              dropId: newDrop.id,
              toStatus: DeliveryDropStatus.KITCHEN_READY,
              note: 'Drop created and reconciled from eligible orders',
            },
          });

          dropsCreatedOrUpdated++;
        } else {
          // Drop already exists: Check driver assignment rules
          let updatedDriverId = existingDrop.driverId;
          let driverChanged = false;

          if (!existingDrop.driverId && defaultDriverId) {
            // Drop has no driver, assign company default driver
            updatedDriverId = defaultDriverId;
            driverChanged = true;
          }

          if (driverChanged) {
            await tx.deliveryDrop.update({
              where: { id: existingDrop.id },
              data: { driverId: updatedDriverId },
            });
          }

          // Attach any orders in this group not yet linked to this drop
          // Only do so if drop is not already out for delivery or delivered
          if (
            existingDrop.status !== DeliveryDropStatus.OUT_FOR_DELIVERY &&
            existingDrop.status !== DeliveryDropStatus.DELIVERED
          ) {
            const existingOrderIds = new Set(existingDrop.orders.map((o) => o.id));
            const unattachedOrderIds = groupOrders
              .map((o) => o.id)
              .filter((id) => !existingOrderIds.has(id));

            if (unattachedOrderIds.length > 0) {
              await tx.order.updateMany({
                where: { id: { in: unattachedOrderIds } },
                data: { dropId: existingDrop.id },
              });
            }
          }

          dropsCreatedOrUpdated++;
        }
      });
    }

    return dropsCreatedOrUpdated;
  }

  /**
   * Assigns or reassigns a driver to a delivery drop.
   * Dispatch assigns a DRIVER PER DROP, not per individual order.
   */
  async assignDriver(
    dropId: string,
    driverId: string,
    _assignedByUserId?: string,
  ) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    if (drop.status === DeliveryDropStatus.DELIVERED) {
      throw new BadRequestException(
        'Cannot reassign driver for an already delivered drop',
      );
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`User with ID '${driverId}' not found`);
    }

    if (!driver.isActive || driver.role !== UserRole.DRIVER) {
      throw new BadRequestException(
        `User '${driver.name}' is not an active driver`,
      );
    }

    return this.prisma.deliveryDrop.update({
      where: { id: dropId },
      data: { driverId },
      include: {
        company: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, email: true } },
        orders: { select: { id: true, orderNumber: true } },
      },
    });
  }

  /**
   * Retrieves a drop by ID with company and driver details.
   */
  async getDropById(dropId: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        company: true,
        driver: { select: { id: true, name: true, email: true } },
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

    return drop;
  }
}
