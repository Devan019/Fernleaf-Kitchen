import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceService } from '../invoice.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { InvoiceStatus, OrderStatus } from '../../../generated/prisma/enums.js';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      company: {
        findUnique: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      invoice: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      invoiceLine: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
    };

    service = new InvoiceService(prismaMock as unknown as PrismaService);
  });

  describe('createInvoice (Requirements 8-17, 36, 43)', () => {
    it('throws NotFoundException if the company does not exist', async () => {
      prismaMock.company.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice('comp-nonexistent', {
          orderIds: ['ord-1'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if the company is deactivated', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Inactive Corp',
        isActive: false,
      });

      await expect(
        service.createInvoice('comp-1', {
          orderIds: ['ord-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if duplicate order IDs are provided', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
        isActive: true,
      });

      await expect(
        service.createInvoice('comp-1', {
          orderIds: ['ord-1', 'ord-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if one or more orders are not found', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
        isActive: true,
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 'ord-1', companyId: 'comp-1', status: OrderStatus.CONFIRMED },
      ]);

      await expect(
        service.createInvoice('comp-1', {
          orderIds: ['ord-1', 'ord-missing'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if an order belongs to a different company (ownership check)', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-google',
        name: 'Google',
        isActive: true,
      });

      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-msft', // Belongs to Microsoft
          status: OrderStatus.CONFIRMED,
          isInvoiced: false,
          invoiceLine: null,
          total: new Prisma.Decimal('25.00'),
        },
      ]);

      await expect(
        service.createInvoice('comp-google', {
          orderIds: ['ord-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if an order is not CONFIRMED (e.g. DRAFT or PLACED)', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
        isActive: true,
      });

      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-1',
          status: OrderStatus.PLACED,
          isInvoiced: false,
          invoiceLine: null,
          total: new Prisma.Decimal('25.00'),
        },
      ]);

      await expect(
        service.createInvoice('comp-1', {
          orderIds: ['ord-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if an order is already invoiced', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
        isActive: true,
      });

      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-1',
          status: OrderStatus.CONFIRMED,
          isInvoiced: true, // Already invoiced
          invoiceLine: { id: 'line-1' },
          total: new Prisma.Decimal('25.00'),
        },
      ]);

      await expect(
        service.createInvoice('comp-1', {
          orderIds: ['ord-1'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates an invoice atomically, snapshots order amounts, and generates human-readable invoice number', async () => {
      prismaMock.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Google',
        isActive: true,
      });

      const orders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          companyId: 'comp-1',
          status: OrderStatus.CONFIRMED,
          isInvoiced: false,
          invoiceLine: null,
          total: new Prisma.Decimal('35.50'),
        },
        {
          id: 'ord-2',
          orderNumber: 'ORD-002',
          companyId: 'comp-1',
          status: OrderStatus.CONFIRMED,
          isInvoiced: false,
          invoiceLine: null,
          total: new Prisma.Decimal('64.50'),
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(orders);
      prismaMock.invoice.findFirst.mockResolvedValue({
        invoiceNumber: `INV-${new Date().getFullYear()}-000005`,
      });

      prismaMock.invoice.create.mockResolvedValue({
        id: 'inv-new',
        invoiceNumber: `INV-${new Date().getFullYear()}-000006`,
        companyId: 'comp-1',
        status: InvoiceStatus.OPEN,
        subtotal: new Prisma.Decimal('100.00'),
        adjustmentTotal: new Prisma.Decimal('0.00'),
        total: new Prisma.Decimal('100.00'),
      });

      // Mock getInvoiceById call
      vi.spyOn(service, 'getInvoiceById').mockResolvedValue({
        id: 'inv-new',
        invoiceNumber: `INV-${new Date().getFullYear()}-000006`,
        companyId: 'comp-1',
        company: { id: 'comp-1', name: 'Google' },
        status: InvoiceStatus.OPEN,
        issuedAt: new Date().toISOString(),
        paidAt: null,
        subtotal: '100.00',
        adjustmentTotal: '0.00',
        total: '100.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [
          {
            id: 'line-1',
            invoiceId: 'inv-new',
            orderId: 'ord-1',
            orderNumber: 'ORD-001',
            employeeName: 'Rahul',
            deliveryDate: '2026-10-14',
            description: 'Order ORD-001',
            quantity: 1,
            unitAmount: '35.50',
            amount: '35.50',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'line-2',
            invoiceId: 'inv-new',
            orderId: 'ord-2',
            orderNumber: 'ORD-002',
            employeeName: 'Priya',
            deliveryDate: '2026-10-14',
            description: 'Order ORD-002',
            quantity: 1,
            unitAmount: '64.50',
            amount: '64.50',
            createdAt: new Date().toISOString(),
          },
        ],
        adjustments: [],
      });

      const invoice = await service.createInvoice('comp-1', {
        orderIds: ['ord-1', 'ord-2'],
      });

      expect(invoice.id).toBe('inv-new');
      expect(invoice.subtotal).toBe('100.00');
      expect(invoice.total).toBe('100.00');
      expect(invoice.lines).toHaveLength(2);

      // Verify invoice created with correct calculated Decimal total
      expect(prismaMock.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceNumber: `INV-${new Date().getFullYear()}-000006`,
          companyId: 'comp-1',
          status: InvoiceStatus.OPEN,
          subtotal: new Prisma.Decimal('100.00'),
          total: new Prisma.Decimal('100.00'),
        }),
      });

      // Verify lines created
      expect(prismaMock.invoiceLine.create).toHaveBeenCalledTimes(2);

      // Verify orders updated to isInvoiced = true
      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: expect.objectContaining({ isInvoiced: true }),
      });
      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-2' },
        data: expect.objectContaining({ isInvoiced: true }),
      });
    });
  });

  describe('markInvoicePaid (Requirements 21-24)', () => {
    it('successfully marks an OPEN invoice as PAID', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-000001',
        status: InvoiceStatus.OPEN,
      });

      vi.spyOn(service, 'getInvoiceById').mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-000001',
        companyId: 'comp-1',
        company: { id: 'comp-1', name: 'Google' },
        status: InvoiceStatus.PAID,
        issuedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        subtotal: '100.00',
        adjustmentTotal: '0.00',
        total: '100.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [],
        adjustments: [],
      });

      const result = await service.markInvoicePaid('inv-1');

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(prismaMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: expect.any(Date),
        },
      });
    });

    it('throws ConflictException if invoice is already PAID', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-000001',
        status: InvoiceStatus.PAID,
      });

      await expect(service.markInvoicePaid('inv-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if invoice is VOID', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-000001',
        status: InvoiceStatus.VOID,
      });

      await expect(service.markInvoicePaid('inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if invoice does not exist', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(null);

      await expect(service.markInvoicePaid('inv-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getInvoiceById', () => {
    it('throws NotFoundException if invoice does not exist', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(null);

      await expect(service.getInvoiceById('inv-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
