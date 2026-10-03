import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingAdjustmentService } from '../billing-adjustment.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  BillingAdjustmentType,
  InvoiceStatus,
  OrderStatus,
} from '../../../generated/prisma/enums.js';

describe('BillingAdjustmentService', () => {
  let service: BillingAdjustmentService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      invoiceLine: {
        findUnique: vi.fn(),
      },
      invoice: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      billingAdjustment: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
    };

    service = new BillingAdjustmentService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('createForOrderChange (Requirements 25-34, 47)', () => {
    it('returns null if the order has not been invoiced', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue(null);

      const result = await service.createForOrderChange({
        orderId: 'ord-uninvoiced',
        reason: 'Order cancelled',
      });

      expect(result).toBeNull();
      expect(prismaMock.billingAdjustment.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if the target invoice is VOID', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('100.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.VOID,
          subtotal: new Prisma.Decimal('100.00'),
        },
        order: {
          id: 'ord-1',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('100.00'),
        },
      });

      await expect(
        service.createForOrderChange({
          orderId: 'ord-1',
          reason: 'Correction',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a CREDIT adjustment when an invoiced order amount decreases (short delivery)', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('100.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.OPEN,
          subtotal: new Prisma.Decimal('100.00'),
        },
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('80.00'),
        },
      });

      // No prior adjustments
      prismaMock.billingAdjustment.findMany
        .mockResolvedValueOnce([]) // prior adjustments check
        .mockResolvedValueOnce([
          {
            type: BillingAdjustmentType.CREDIT,
            amount: new Prisma.Decimal('20.00'),
          },
        ]); // tx recalculation

      prismaMock.billingAdjustment.create.mockResolvedValue({
        id: 'adj-1',
        invoiceId: 'inv-1',
        orderId: 'ord-1',
        type: BillingAdjustmentType.CREDIT,
        amount: new Prisma.Decimal('20.00'),
        reason: 'Short delivery of 2 meals',
        createdAt: new Date('2026-10-04T12:00:00.000Z'),
        createdByUserId: 'user-admin',
        order: { orderNumber: 'ORD-001' },
        createdByUser: { id: 'user-admin', name: 'Admin' },
      });

      const result = await service.createForOrderChange({
        orderId: 'ord-1',
        reason: 'Short delivery of 2 meals',
        actorUserId: 'user-admin',
        currentBillableAmount: '80.00',
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe(BillingAdjustmentType.CREDIT);
      expect(result!.amount).toBe('20.00');

      // Verify invoice totals updated
      expect(prismaMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          adjustmentTotal: new Prisma.Decimal('-20.00'),
          total: new Prisma.Decimal('80.00'),
        },
      });
    });

    it('creates a DEBIT adjustment when order value increases after invoicing', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('100.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.OPEN,
          subtotal: new Prisma.Decimal('100.00'),
        },
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('120.00'),
        },
      });

      prismaMock.billingAdjustment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            type: BillingAdjustmentType.DEBIT,
            amount: new Prisma.Decimal('20.00'),
          },
        ]);

      prismaMock.billingAdjustment.create.mockResolvedValue({
        id: 'adj-2',
        invoiceId: 'inv-1',
        orderId: 'ord-1',
        type: BillingAdjustmentType.DEBIT,
        amount: new Prisma.Decimal('20.00'),
        reason: 'Portion upgrade after cutoff',
        createdAt: new Date('2026-10-04T12:00:00.000Z'),
        createdByUserId: 'user-admin',
        order: { orderNumber: 'ORD-001' },
        createdByUser: null,
      });

      const result = await service.createForOrderChange({
        orderId: 'ord-1',
        reason: 'Portion upgrade after cutoff',
        currentBillableAmount: '120.00',
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe(BillingAdjustmentType.DEBIT);
      expect(result!.amount).toBe('20.00');

      expect(prismaMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          adjustmentTotal: new Prisma.Decimal('20.00'),
          total: new Prisma.Decimal('120.00'),
        },
      });
    });

    it('creates a full CREDIT adjustment when an invoiced order is cancelled', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('50.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.OPEN,
          subtotal: new Prisma.Decimal('50.00'),
        },
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          status: OrderStatus.CANCELLED,
          total: new Prisma.Decimal('50.00'),
        },
      });

      prismaMock.billingAdjustment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            type: BillingAdjustmentType.CREDIT,
            amount: new Prisma.Decimal('50.00'),
          },
        ]);

      prismaMock.billingAdjustment.create.mockResolvedValue({
        id: 'adj-3',
        invoiceId: 'inv-1',
        orderId: 'ord-1',
        type: BillingAdjustmentType.CREDIT,
        amount: new Prisma.Decimal('50.00'),
        reason: 'ORDER_CANCELLED',
        createdAt: new Date('2026-10-04T12:00:00.000Z'),
        createdByUserId: null,
        order: { orderNumber: 'ORD-001' },
        createdByUser: null,
      });

      const result = await service.createForOrderChange({
        orderId: 'ord-1',
        reason: 'ORDER_CANCELLED',
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe(BillingAdjustmentType.CREDIT);
      expect(result!.amount).toBe('50.00');

      expect(prismaMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          adjustmentTotal: new Prisma.Decimal('-50.00'),
          total: new Prisma.Decimal('0.00'),
        },
      });
    });

    it('prevents duplicate adjustments if target amount is already reconciled (idempotent)', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('100.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.OPEN,
          subtotal: new Prisma.Decimal('100.00'),
        },
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('80.00'),
        },
      });

      // Existing credit of $20 already accounts for the difference between $100 and $80
      prismaMock.billingAdjustment.findMany.mockResolvedValueOnce([
        {
          type: BillingAdjustmentType.CREDIT,
          amount: new Prisma.Decimal('20.00'),
        },
      ]);

      const result = await service.createForOrderChange({
        orderId: 'ord-1',
        reason: 'Short delivery rerun',
        currentBillableAmount: '80.00',
      });

      expect(result).toBeNull();
      expect(prismaMock.billingAdjustment.create).not.toHaveBeenCalled();
    });

    it('allows a PAID invoice to receive adjustments without altering PAID status', async () => {
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        id: 'line-1',
        amount: new Prisma.Decimal('100.00'),
        invoice: {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-000001',
          status: InvoiceStatus.PAID,
          subtotal: new Prisma.Decimal('100.00'),
        },
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('75.00'),
        },
      });

      prismaMock.billingAdjustment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            type: BillingAdjustmentType.CREDIT,
            amount: new Prisma.Decimal('25.00'),
          },
        ]);

      prismaMock.billingAdjustment.create.mockResolvedValue({
        id: 'adj-paid',
        invoiceId: 'inv-1',
        orderId: 'ord-1',
        type: BillingAdjustmentType.CREDIT,
        amount: new Prisma.Decimal('25.00'),
        reason: 'Post-payment dispute resolution',
        createdAt: new Date('2026-10-04T12:00:00.000Z'),
        createdByUserId: 'user-admin',
        order: { orderNumber: 'ORD-001' },
        createdByUser: null,
      });

      const result = await service.createForOrderChange({
        orderId: 'ord-1',
        reason: 'Post-payment dispute resolution',
        currentBillableAmount: '75.00',
      });

      expect(result).not.toBeNull();
      // Invoice remains PAID, status is not modified
      expect(prismaMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          adjustmentTotal: new Prisma.Decimal('-25.00'),
          total: new Prisma.Decimal('75.00'),
        },
      });
    });
  });

  describe('createAdjustmentForInvoice', () => {
    it('throws NotFoundException if invoice does not exist', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.createAdjustmentForInvoice('inv-missing', {
          orderId: 'ord-1',
          reason: 'Correction',
          type: BillingAdjustmentType.CREDIT,
          amount: '10.00',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if order is not on the invoice', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.OPEN,
      });
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        invoiceId: 'inv-other',
      });

      await expect(
        service.createAdjustmentForInvoice('inv-1', {
          orderId: 'ord-1',
          reason: 'Correction',
          type: BillingAdjustmentType.CREDIT,
          amount: '10.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if adjustment amount is <= 0', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.OPEN,
      });
      prismaMock.invoiceLine.findUnique.mockResolvedValue({
        invoiceId: 'inv-1',
      });

      await expect(
        service.createAdjustmentForInvoice('inv-1', {
          orderId: 'ord-1',
          reason: 'Zero amount',
          type: BillingAdjustmentType.CREDIT,
          amount: '0.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
