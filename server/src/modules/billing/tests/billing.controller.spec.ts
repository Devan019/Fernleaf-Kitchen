import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingController } from '../billing.controller.js';
import { BillingService } from '../billing.service.js';
import { InvoiceService } from '../invoice.service.js';
import { BillingAdjustmentService } from '../billing-adjustment.service.js';
import { BillingAdjustmentType, InvoiceStatus, UserRole } from '../../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type.js';

describe('BillingController', () => {
  let controller: BillingController;
  let billingServiceMock: any;
  let invoiceServiceMock: any;
  let adjustmentServiceMock: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    name: 'Admin User',
    isActive: true,
  };

  beforeEach(() => {
    billingServiceMock = {
      listCompanyBillingSummaries: vi.fn(),
      getCompanyBillingSummary: vi.fn(),
      getUninvoicedOrders: vi.fn(),
    };

    invoiceServiceMock = {
      createInvoice: vi.fn(),
      listInvoices: vi.fn(),
      getInvoiceById: vi.fn(),
      markInvoicePaid: vi.fn(),
    };

    adjustmentServiceMock = {
      createAdjustmentForInvoice: vi.fn(),
    };

    controller = new BillingController(
      billingServiceMock as unknown as BillingService,
      invoiceServiceMock as unknown as InvoiceService,
      adjustmentServiceMock as unknown as BillingAdjustmentService,
    );
  });

  it('delegates listCompanies to BillingService', async () => {
    billingServiceMock.listCompanyBillingSummaries.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await controller.listCompanies({ page: 1, limit: 20 });
    expect(billingServiceMock.listCompanyBillingSummaries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('delegates getCompanySummary to BillingService', async () => {
    billingServiceMock.getCompanyBillingSummary.mockResolvedValue({
      company: { id: 'comp-1', name: 'Google' },
      uninvoicedOrderCount: 0,
      uninvoicedAmount: '0.00',
      openInvoiceCount: 0,
      openInvoiceAmount: '0.00',
      paidInvoiceCount: 0,
      paidAmount: '0.00',
    });

    await controller.getCompanySummary('comp-1');
    expect(billingServiceMock.getCompanyBillingSummary).toHaveBeenCalledWith('comp-1');
  });

  it('delegates getUninvoicedOrders to BillingService', async () => {
    billingServiceMock.getUninvoicedOrders.mockResolvedValue({
      company: { id: 'comp-1', name: 'Google' },
      orders: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await controller.getUninvoicedOrders('comp-1', { page: 1, limit: 20 });
    expect(billingServiceMock.getUninvoicedOrders).toHaveBeenCalledWith('comp-1', {
      page: 1,
      limit: 20,
    });
  });

  it('delegates createInvoice to InvoiceService', async () => {
    invoiceServiceMock.createInvoice.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-2026-000001',
    });

    await controller.createInvoice('comp-1', { orderIds: ['ord-1'] }, mockAdminUser);
    expect(invoiceServiceMock.createInvoice).toHaveBeenCalledWith(
      'comp-1',
      { orderIds: ['ord-1'] },
      mockAdminUser.id,
    );
  });

  it('delegates listInvoices to InvoiceService', async () => {
    invoiceServiceMock.listInvoices.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await controller.listInvoices({ page: 1, limit: 20 });
    expect(invoiceServiceMock.listInvoices).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('delegates getInvoice to InvoiceService', async () => {
    invoiceServiceMock.getInvoiceById.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-2026-000001',
    });

    await controller.getInvoice('inv-1');
    expect(invoiceServiceMock.getInvoiceById).toHaveBeenCalledWith('inv-1');
  });

  it('delegates markInvoicePaid to InvoiceService', async () => {
    invoiceServiceMock.markInvoicePaid.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.PAID,
    });

    await controller.markInvoicePaid('inv-1', mockAdminUser);
    expect(invoiceServiceMock.markInvoicePaid).toHaveBeenCalledWith(
      'inv-1',
      mockAdminUser.id,
    );
  });

  it('delegates createAdjustment to BillingAdjustmentService', async () => {
    adjustmentServiceMock.createAdjustmentForInvoice.mockResolvedValue({
      id: 'adj-1',
      type: BillingAdjustmentType.CREDIT,
      amount: '20.00',
    });

    await controller.createAdjustment(
      'inv-1',
      {
        orderId: 'ord-1',
        reason: 'Short delivery',
        type: BillingAdjustmentType.CREDIT,
        amount: '20.00',
      },
      mockAdminUser,
    );

    expect(adjustmentServiceMock.createAdjustmentForInvoice).toHaveBeenCalledWith(
      'inv-1',
      {
        orderId: 'ord-1',
        reason: 'Short delivery',
        type: BillingAdjustmentType.CREDIT,
        amount: '20.00',
      },
      mockAdminUser.id,
    );
  });
});
