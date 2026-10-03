import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { InvoiceStatus, OrderStatus } from '../../generated/prisma/enums.js';
import {
  CompanyBillingQueryDto,
  UninvoicedOrdersQueryDto,
} from './dto/index.js';
import type {
  CompanyBillingSummaryResponse,
  PaginatedCompanyBillingSummariesResponse,
  PaginatedUninvoicedOrdersResponse,
  UninvoicedOrderSummary,
} from './types/billing.types.js';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves billing summary metrics for a specific company.
   * Calculates:
   * - uninvoicedOrderCount
   * - uninvoicedAmount
   * - openInvoiceCount
   * - openInvoiceAmount
   * - paidInvoiceCount
   * - paidAmount
   */
  async getCompanyBillingSummary(
    companyId: string,
  ): Promise<CompanyBillingSummaryResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const [uninvoicedOrders, invoices] = await Promise.all([
      // Uninvoiced confirmed orders
      this.prisma.order.findMany({
        where: {
          companyId,
          status: OrderStatus.CONFIRMED,
          isInvoiced: false,
          invoiceLine: null,
        },
        select: {
          total: true,
        },
      }),
      // Company invoices
      this.prisma.invoice.findMany({
        where: {
          companyId,
        },
        select: {
          status: true,
          total: true,
        },
      }),
    ]);

    let uninvoicedAmount = new Prisma.Decimal('0.00');
    for (const ord of uninvoicedOrders) {
      uninvoicedAmount = uninvoicedAmount.plus(ord.total);
    }

    let openCount = 0;
    let openAmount = new Prisma.Decimal('0.00');
    let paidCount = 0;
    let paidAmount = new Prisma.Decimal('0.00');

    for (const inv of invoices) {
      if (inv.status === InvoiceStatus.OPEN) {
        openCount++;
        openAmount = openAmount.plus(inv.total);
      } else if (inv.status === InvoiceStatus.PAID) {
        paidCount++;
        paidAmount = paidAmount.plus(inv.total);
      }
    }

    return {
      company,
      uninvoicedOrderCount: uninvoicedOrders.length,
      uninvoicedAmount: uninvoicedAmount.toFixed(2),
      openInvoiceCount: openCount,
      openInvoiceAmount: openAmount.toFixed(2),
      paidInvoiceCount: paidCount,
      paidAmount: paidAmount.toFixed(2),
    };
  }

  /**
   * Retrieves paginated billing summaries across companies.
   * Efficiently queries using grouped batch queries to prevent N+1 overhead.
   */
  async listCompanyBillingSummaries(
    query: CompanyBillingQueryDto,
  ): Promise<PaginatedCompanyBillingSummariesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.CompanyWhereInput = {};
    if (query.search) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    if (companies.length === 0) {
      return createPaginatedResponse([], total, safePage, safeLimit);
    }

    const companyIds = companies.map((c) => c.id);

    // Batch query uninvoiced orders for these companies
    const uninvoicedOrders = await this.prisma.order.findMany({
      where: {
        companyId: { in: companyIds },
        status: OrderStatus.CONFIRMED,
        isInvoiced: false,
        invoiceLine: null,
      },
      select: {
        companyId: true,
        total: true,
      },
    });

    // Batch query invoices for these companies
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId: { in: companyIds },
      },
      select: {
        companyId: true,
        status: true,
        total: true,
      },
    });

    // Group in memory
    const uninvoicedMap = new Map<
      string,
      { count: number; amount: Prisma.Decimal }
    >();
    for (const ord of uninvoicedOrders) {
      const current = uninvoicedMap.get(ord.companyId) ?? {
        count: 0,
        amount: new Prisma.Decimal('0.00'),
      };
      current.count++;
      current.amount = current.amount.plus(ord.total);
      uninvoicedMap.set(ord.companyId, current);
    }

    const invoiceMap = new Map<
      string,
      {
        openCount: number;
        openAmount: Prisma.Decimal;
        paidCount: number;
        paidAmount: Prisma.Decimal;
      }
    >();
    for (const inv of invoices) {
      const current = invoiceMap.get(inv.companyId) ?? {
        openCount: 0,
        openAmount: new Prisma.Decimal('0.00'),
        paidCount: 0,
        paidAmount: new Prisma.Decimal('0.00'),
      };
      if (inv.status === InvoiceStatus.OPEN) {
        current.openCount++;
        current.openAmount = current.openAmount.plus(inv.total);
      } else if (inv.status === InvoiceStatus.PAID) {
        current.paidCount++;
        current.paidAmount = current.paidAmount.plus(inv.total);
      }
      invoiceMap.set(inv.companyId, current);
    }

    const summaries: CompanyBillingSummaryResponse[] = companies.map((comp) => {
      const uninvoiced = uninvoicedMap.get(comp.id) ?? {
        count: 0,
        amount: new Prisma.Decimal('0.00'),
      };
      const invStats = invoiceMap.get(comp.id) ?? {
        openCount: 0,
        openAmount: new Prisma.Decimal('0.00'),
        paidCount: 0,
        paidAmount: new Prisma.Decimal('0.00'),
      };

      return {
        company: comp,
        uninvoicedOrderCount: uninvoiced.count,
        uninvoicedAmount: uninvoiced.amount.toFixed(2),
        openInvoiceCount: invStats.openCount,
        openInvoiceAmount: invStats.openAmount.toFixed(2),
        paidInvoiceCount: invStats.paidCount,
        paidAmount: invStats.paidAmount.toFixed(2),
      };
    });

    return createPaginatedResponse(summaries, total, safePage, safeLimit);
  }

  /**
   * Retrieves all eligible confirmed uninvoiced orders for a company.
   */
  async getUninvoicedOrders(
    companyId: string,
    query: UninvoicedOrdersQueryDto,
  ): Promise<PaginatedUninvoicedOrdersResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.OrderWhereInput = {
      companyId,
      status: OrderStatus.CONFIRMED,
      isInvoiced: false,
      invoiceLine: null,
    };

    if (query.deliveryDateFrom || query.deliveryDateTo) {
      where.deliveryDate = {};
      if (query.deliveryDateFrom) {
        where.deliveryDate.gte = new Date(
          `${query.deliveryDateFrom}T00:00:00.000Z`,
        );
      }
      if (query.deliveryDateTo) {
        where.deliveryDate.lte = new Date(
          `${query.deliveryDateTo}T00:00:00.000Z`,
        );
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        {
          Employee: {
            name: { contains: term, mode: 'insensitive' },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
        include: {
          Employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders: UninvoicedOrderSummary[] = orders.map((ord) => ({
      id: ord.id,
      orderNumber: ord.orderNumber,
      employeeId: ord.employeeId,
      employeeName: ord.Employee.name,
      deliveryDate: ord.deliveryDate.toISOString().substring(0, 10),
      deliveryTime: ord.deliveryTime,
      status: ord.status,
      total: ord.total.toFixed(2),
      createdAt: ord.createdAt.toISOString(),
    }));

    return {
      company,
      orders: formattedOrders,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    };
  }
}
