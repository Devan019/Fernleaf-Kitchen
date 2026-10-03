import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  BillingAdjustmentType,
  InvoiceStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { InvoiceAdjustmentDto } from './dto/invoice-adjustment.dto.js';
import type { BillingAdjustmentDetail } from './types/billing.types.js';

export interface CreateForOrderChangeInput {
  orderId: string;
  reason: string;
  actorUserId?: string | null;
  currentBillableAmount?: Prisma.Decimal | string | number | null;
  invoiceId?: string;
}

@Injectable()
export class BillingAdjustmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically calculates and creates an adjustment for a post-invoice order change.
   *
   * Invariant:
   * Effective Invoiced Amount = InvoiceLine.amount + SUM(Debits) - SUM(Credits)
   * Delta = Target Billable Amount - Effective Invoiced Amount
   *
   * If Delta > 0: DEBIT created
   * If Delta < 0: CREDIT created
   * If Delta == 0: No adjustment created (idempotent, prevents duplicate adjustments)
   */
  async createForOrderChange(
    input: CreateForOrderChangeInput,
  ): Promise<BillingAdjustmentDetail | null> {
    const { orderId, reason, actorUserId, currentBillableAmount } = input;

    // 1. Check if the order is invoiced
    const line = await this.prisma.invoiceLine.findUnique({
      where: { orderId },
      include: {
        invoice: true,
        order: true,
      },
    });

    if (!line) {
      // Order has not been invoiced, so no post-invoice adjustment is necessary
      return null;
    }

    const invoice = line.invoice;
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        `Cannot create adjustment for VOID invoice '${invoice.invoiceNumber}'`,
      );
    }

    // 2. Fetch all existing adjustments for this order on this invoice
    const priorAdjustments = await this.prisma.billingAdjustment.findMany({
      where: {
        invoiceId: invoice.id,
        orderId,
      },
    });

    let priorDebits = new Prisma.Decimal('0.00');
    let priorCredits = new Prisma.Decimal('0.00');
    for (const adj of priorAdjustments) {
      if (adj.type === BillingAdjustmentType.DEBIT) {
        priorDebits = priorDebits.plus(adj.amount);
      } else {
        priorCredits = priorCredits.plus(adj.amount);
      }
    }

    const effectiveInvoicedAmount = line.amount
      .plus(priorDebits)
      .minus(priorCredits);

    // 3. Determine target billable amount
    let targetAmount: Prisma.Decimal;
    if (currentBillableAmount !== undefined && currentBillableAmount !== null) {
      targetAmount = new Prisma.Decimal(
        new Prisma.Decimal(currentBillableAmount).toFixed(2),
      );
    } else if (
      line.order.status === OrderStatus.CANCELLED ||
      line.order.status === OrderStatus.REJECTED
    ) {
      // If cancelled or rejected, company owes $0.00 for this order
      targetAmount = new Prisma.Decimal('0.00');
    } else {
      // Use current order total
      targetAmount = new Prisma.Decimal(line.order.total.toFixed(2));
    }

    // 4. Calculate delta
    const delta = targetAmount.minus(effectiveInvoicedAmount);

    if (delta.isZero()) {
      // Already fully adjusted / reconciled. Do NOT create duplicate adjustments!
      return null;
    }

    const type = delta.greaterThan(0)
      ? BillingAdjustmentType.DEBIT
      : BillingAdjustmentType.CREDIT;
    const adjustmentAmount = new Prisma.Decimal(delta.abs().toFixed(2));

    // 5. Transactional insert & invoice totals update
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.billingAdjustment.create({
        data: {
          invoiceId: invoice.id,
          orderId,
          type,
          amount: adjustmentAmount,
          reason,
          createdByUserId: actorUserId ?? null,
        },
        include: {
          order: { select: { orderNumber: true } },
          createdByUser: { select: { id: true, name: true } },
        },
      });

      // Recalculate invoice totals using exact Decimal arithmetic
      const allInvoiceAdjustments = await tx.billingAdjustment.findMany({
        where: { invoiceId: invoice.id },
      });

      let sumDebits = new Prisma.Decimal('0.00');
      let sumCredits = new Prisma.Decimal('0.00');
      for (const a of allInvoiceAdjustments) {
        if (a.type === BillingAdjustmentType.DEBIT) {
          sumDebits = sumDebits.plus(a.amount);
        } else {
          sumCredits = sumCredits.plus(a.amount);
        }
      }

      const adjustmentTotal = sumDebits.minus(sumCredits);
      const newTotal = invoice.subtotal.plus(adjustmentTotal);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          adjustmentTotal: new Prisma.Decimal(adjustmentTotal.toFixed(2)),
          total: new Prisma.Decimal(newTotal.toFixed(2)),
        },
      });

      return {
        id: created.id,
        invoiceId: created.invoiceId,
        orderId: created.orderId,
        orderNumber: created.order.orderNumber,
        type: created.type,
        amount: created.amount.toFixed(2),
        reason: created.reason,
        createdAt: created.createdAt.toISOString(),
        createdByUserId: created.createdByUserId,
        createdByUser: created.createdByUser
          ? {
              id: created.createdByUser.id,
              name: created.createdByUser.name,
            }
          : null,
      };
    });
  }

  /**
   * Creates an adjustment on an invoice from API request.
   */
  async createAdjustmentForInvoice(
    invoiceId: string,
    dto: InvoiceAdjustmentDto,
    actorUserId?: string | null,
  ): Promise<BillingAdjustmentDetail> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot add adjustments to a VOID invoice');
    }

    // Verify order exists on this invoice
    const line = await this.prisma.invoiceLine.findUnique({
      where: { orderId: dto.orderId },
      include: { order: true },
    });

    if (!line || line.invoiceId !== invoiceId) {
      throw new BadRequestException(
        `Order '${dto.orderId}' does not belong to invoice '${invoice.invoiceNumber}'`,
      );
    }

    // Branch 1: If newBillableAmount is provided, use deterministic reconciliation
    if (dto.newBillableAmount !== undefined && dto.newBillableAmount !== null) {
      const result = await this.createForOrderChange({
        orderId: dto.orderId,
        invoiceId,
        reason: dto.reason,
        actorUserId,
        currentBillableAmount: dto.newBillableAmount,
      });

      if (!result) {
        throw new BadRequestException(
          'No financial adjustment required. The order is already reconciled to that amount.',
        );
      }

      return result;
    }

    // Branch 2: Explicit type and amount provided
    if (!dto.type || !dto.amount) {
      throw new BadRequestException(
        'Either provide (type and amount) or provide (newBillableAmount) to create an adjustment',
      );
    }

    const adjustmentAmount = new Prisma.Decimal(
      new Prisma.Decimal(dto.amount).toFixed(2),
    );

    if (adjustmentAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Adjustment amount must be strictly greater than zero',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.billingAdjustment.create({
        data: {
          invoiceId,
          orderId: dto.orderId,
          type: dto.type!,
          amount: adjustmentAmount,
          reason: dto.reason,
          createdByUserId: actorUserId ?? null,
        },
        include: {
          order: { select: { orderNumber: true } },
          createdByUser: { select: { id: true, name: true } },
        },
      });

      // Recalculate invoice totals
      const allInvoiceAdjustments = await tx.billingAdjustment.findMany({
        where: { invoiceId },
      });

      let sumDebits = new Prisma.Decimal('0.00');
      let sumCredits = new Prisma.Decimal('0.00');
      for (const a of allInvoiceAdjustments) {
        if (a.type === BillingAdjustmentType.DEBIT) {
          sumDebits = sumDebits.plus(a.amount);
        } else {
          sumCredits = sumCredits.plus(a.amount);
        }
      }

      const adjustmentTotal = sumDebits.minus(sumCredits);
      const newTotal = invoice.subtotal.plus(adjustmentTotal);

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          adjustmentTotal: new Prisma.Decimal(adjustmentTotal.toFixed(2)),
          total: new Prisma.Decimal(newTotal.toFixed(2)),
        },
      });

      return {
        id: created.id,
        invoiceId: created.invoiceId,
        orderId: created.orderId,
        orderNumber: created.order.orderNumber,
        type: created.type,
        amount: created.amount.toFixed(2),
        reason: created.reason,
        createdAt: created.createdAt.toISOString(),
        createdByUserId: created.createdByUserId,
        createdByUser: created.createdByUser
          ? {
              id: created.createdByUser.id,
              name: created.createdByUser.name,
            }
          : null,
      };
    });
  }
}
