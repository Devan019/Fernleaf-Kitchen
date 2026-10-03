import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus } from '../../../generated/prisma/enums.js';

@Injectable()
export class OrderStatusService {
  /**
   * Validates whether a state transition from currentStatus to targetStatus is permitted.
   */
  validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    isAdmin = false,
    isPastCutoff = false,
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    // Terminal statuses cannot transition to any other status
    if (
      currentStatus === OrderStatus.DELIVERED ||
      currentStatus === OrderStatus.CANCELLED ||
      currentStatus === OrderStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot change status of an order that is already ${currentStatus}`,
      );
    }

    // Allowed transitions map
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
      [OrderStatus.PLACED]: [
        OrderStatus.DRAFT,
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED, // Permitted via admin override
      ],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
    };

    const permitted = allowedTransitions[currentStatus]?.includes(targetStatus);
    if (!permitted) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    // After cut-off restrictions for non-admin users
    if (isPastCutoff && !isAdmin) {
      throw new BadRequestException(
        `Cannot transition order status after cut-off has passed`,
      );
    }
  }

  /**
   * Checks if an order can be edited.
   */
  canEditOrder(
    status: OrderStatus,
    isAdmin = false,
    isPastCutoff = false,
  ): boolean {
    if (
      status === OrderStatus.DELIVERED ||
      status === OrderStatus.CANCELLED ||
      status === OrderStatus.REJECTED
    ) {
      return false;
    }

    if (status === OrderStatus.CONFIRMED && !isAdmin) {
      return false;
    }

    if (isPastCutoff && !isAdmin) {
      return false;
    }

    return true;
  }

  /**
   * Checks if an order can be cancelled.
   */
  canCancelOrder(
    status: OrderStatus,
    isAdmin = false,
    isPastCutoff = false,
  ): boolean {
    if (
      status === OrderStatus.DELIVERED ||
      status === OrderStatus.CANCELLED ||
      status === OrderStatus.REJECTED
    ) {
      return false;
    }

    if (isPastCutoff && !isAdmin) {
      return false;
    }

    return true;
  }
}
