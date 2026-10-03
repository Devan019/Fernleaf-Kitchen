import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from '../billing.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { InvoiceStatus, OrderStatus } from '../../../generated/prisma/enums.js';

describe('BillingService', () => {
  let service: BillingService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      company: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      invoice: {
        findMany: vi.fn(),
      },
    };

    service = new BillingService(prismaMock as unknown as PrismaService);
  });

  describe('getCompanyBillingSummary (Requirements 16, 38)', () => {
    it('returns accurate billing summary metrics using exact Decimal arithmetic', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
      });

      // 2 uninvoiced confirmed orders: $45.00 + $35.00 = $80.00
      prismaMock.order.findMany.mockResolvedValue([
        { total: new Prisma.Decimal('45.00') },
        { total: new Prisma.Decimal('35.00') },
      ]);

      // 2 invoices: 1 OPEN ($100.00), 1 PAID ($60.00)
      prismaMock.invoice.findMany.mockResolvedValue([
        { status: InvoiceStatus.OPEN, total: new Prisma.Decimal('100.00') },
        { status: InvoiceStatus.PAID, total: new Prisma.Decimal('60.00') },
      ]);

      const summary = await service.getCompanyBillingSummary('comp-1');

      expect(summary.company.id).toBe('comp-1');
      expect(summary.uninvoicedOrderCount).toBe(2);
      expect(summary.uninvoicedAmount).toBe('80.00');
      expect(summary.openInvoiceCount).toBe(1);
      expect(summary.openInvoiceAmount).toBe('100.00');
      expect(summary.paidInvoiceCount).toBe(1);
      expect(summary.paidAmount).toBe('60.00');
    });

    it('throws NotFoundException if company does not exist', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null);

      await expect(
        service.getCompanyBillingSummary('comp-missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUninvoicedOrders (Requirements 1-7, 13, 15)', () => {
    it('queries only eligible CONFIRMED uninvoiced orders belonging to the specified company', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
      });

      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-1001',
          employeeId: 'emp-1',
          deliveryDate: new Date('2026-10-15T00:00:00.000Z'),
          deliveryTime: '12:30',
          status: OrderStatus.CONFIRMED,
          total: new Prisma.Decimal('25.50'),
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
          Employee: { id: 'emp-1', name: 'Rahul Sharma' },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await service.getUninvoicedOrders('comp-1', {
        page: 1,
        limit: 20,
      });

      expect(result.company.id).toBe('comp-1');
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderNumber).toBe('ORD-1001');
      expect(result.orders[0].employeeName).toBe('Rahul Sharma');
      expect(result.orders[0].total).toBe('25.50');
      expect(result.meta.total).toBe(1);

      // Verify Prisma query enforced CONFIRMED status and uninvoiced conditions
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'comp-1',
            status: OrderStatus.CONFIRMED,
            isInvoiced: false,
            invoiceLine: null,
          }),
        }),
      );
    });

    it('passes date range and search filters to Prisma query', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
      });
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      await service.getUninvoicedOrders('comp-1', {
        deliveryDateFrom: '2026-10-01',
        deliveryDateTo: '2026-10-31',
        search: 'ORD-100',
      });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'comp-1',
            status: OrderStatus.CONFIRMED,
            isInvoiced: false,
            invoiceLine: null,
            deliveryDate: expect.objectContaining({
              gte: new Date('2026-10-01T00:00:00.000Z'),
              lte: new Date('2026-10-31T00:00:00.000Z'),
            }),
            OR: expect.arrayContaining([
              { orderNumber: { contains: 'ORD-100', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('listCompanyBillingSummaries', () => {
    it('efficiently batches uninvoiced orders and invoices without N+1 queries', async () => {
      prismaMock.company.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Google' },
        { id: 'comp-2', name: 'Microsoft' },
      ]);
      prismaMock.company.count.mockResolvedValue(2);

      prismaMock.order.findMany.mockResolvedValue([
        { companyId: 'comp-1', total: new Prisma.Decimal('50.00') },
        { companyId: 'comp-2', total: new Prisma.Decimal('70.00') },
      ]);

      prismaMock.invoice.findMany.mockResolvedValue([
        { companyId: 'comp-1', status: InvoiceStatus.OPEN, total: new Prisma.Decimal('100.00') },
        { companyId: 'comp-2', status: InvoiceStatus.PAID, total: new Prisma.Decimal('200.00') },
      ]);

      const result = await service.listCompanyBillingSummaries({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].company.name).toBe('Google');
      expect(result.data[0].uninvoicedAmount).toBe('50.00');
      expect(result.data[0].openInvoiceAmount).toBe('100.00');

      expect(result.data[1].company.name).toBe('Microsoft');
      expect(result.data[1].uninvoicedAmount).toBe('70.00');
      expect(result.data[1].paidAmount).toBe('200.00');
    });
  });
});
