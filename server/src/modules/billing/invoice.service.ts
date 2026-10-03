import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { InvoiceStatus, OrderStatus } from '../../generated/prisma/enums.js';
import { CreateInvoiceDto, InvoiceListQueryDto } from './dto/index.js';
import type {
  InvoiceDetailResponse,
  InvoiceSummaryResponse,
  PaginatedInvoicesResponse,
} from './types/billing.types.js';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique, sequential, human-readable invoice number.
   * Format: INV-YYYY-XXXXXX (e.g. INV-2026-000001)
   */
  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
      select: {
        invoiceNumber: true,
      },
    });

    let nextSequence = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split('-');
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextSequence = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextSequence).padStart(6, '0')}`;
  }

  /**
   * Creates an internal invoice for confirmed orders belonging to a company.
   * All-or-nothing transactional operation.
   */
  async createInvoice(
    companyId: string,
    dto: CreateInvoiceDto,
    _userId?: string,
  ): Promise<InvoiceDetailResponse> {
    // 1. Verify company exists and is active
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (!company.isActive) {
      throw new BadRequestException(
        `Cannot create invoice for deactivated company '${company.name}'`,
      );
    }

    // 2. Validate selected order IDs
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('At least one order must be selected');
    }

    const uniqueOrderIds = Array.from(new Set(dto.orderIds));
    if (uniqueOrderIds.length !== dto.orderIds.length) {
      throw new BadRequestException('Duplicate order IDs in request payload');
    }

    let createdInvoiceId = '';

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // 3. Fetch all requested orders
          const orders = await tx.order.findMany({
            where: {
              id: { in: uniqueOrderIds },
            },
            include: {
              invoiceLine: true,
            },
          });

          if (orders.length !== uniqueOrderIds.length) {
            const foundIds = new Set(orders.map((o) => o.id));
            const missingIds = uniqueOrderIds.filter((id) => !foundIds.has(id));
            throw new NotFoundException(
              `Orders not found: ${missingIds.join(', ')}`,
            );
          }

          // 4. Validate order eligibility
          let subtotal = new Prisma.Decimal('0.00');

          for (const order of orders) {
            // Must belong to target company (historical company ownership)
            if (order.companyId !== companyId) {
              throw new BadRequestException(
                `Order '${order.orderNumber}' does not belong to company '${company.name}'`,
              );
            }

            // Must be in CONFIRMED status
            if (order.status !== OrderStatus.CONFIRMED) {
              throw new BadRequestException(
                `Order '${order.orderNumber}' cannot be invoiced because it is in status '${order.status}' (expected CONFIRMED)`,
              );
            }

            // Must not already be invoiced
            if (order.isInvoiced || order.invoiceLine) {
              throw new ConflictException(
                `Order '${order.orderNumber}' has already been invoiced`,
              );
            }

            subtotal = subtotal.plus(order.total);
          }

          subtotal = new Prisma.Decimal(subtotal.toFixed(2));

          // 5. Generate human-readable invoice number
          const invoiceNumber = await this.generateInvoiceNumber(tx);
          const now = new Date();

          // 6. Create Invoice record
          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              companyId,
              status: InvoiceStatus.OPEN,
              issuedAt: now,
              subtotal,
              adjustmentTotal: new Prisma.Decimal('0.00'),
              total: subtotal,
            },
          });

          createdInvoiceId = invoice.id;

          // 7. Create InvoiceLines and update order invoiced state
          for (const order of orders) {
            await tx.invoiceLine.create({
              data: {
                invoiceId: invoice.id,
                orderId: order.id,
                description: `Order ${order.orderNumber}`,
                quantity: 1,
                unitAmount: order.total,
                amount: order.total,
                createdAt: now,
              },
            });

            await tx.order.update({
              where: { id: order.id },
              data: {
                isInvoiced: true,
                updatedAt: now,
              },
            });
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Invoicing conflict: one or more orders are already invoiced or invoice number collision occurred',
        );
      }
      throw error;
    }

    return this.getInvoiceById(createdInvoiceId);
  }

  /**
   * Retrieves full details for an invoice, including lines, adjustments, and company.
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceDetailResponse> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            billingContactName: true,
            billingContactEmail: true,
            billingContactPhone: true,
          },
        },
        lines: {
          include: {
            order: {
              select: {
                orderNumber: true,
                deliveryDate: true,
                Employee: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        adjustments: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      company: invoice.company,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      subtotal: invoice.subtotal.toFixed(2),
      adjustmentTotal: invoice.adjustmentTotal.toFixed(2),
      total: invoice.total.toFixed(2),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      lines: invoice.lines.map((line) => ({
        id: line.id,
        invoiceId: line.invoiceId,
        orderId: line.orderId,
        orderNumber: line.order.orderNumber,
        employeeName: line.order.Employee.name,
        deliveryDate: line.order.deliveryDate.toISOString().substring(0, 10),
        description: line.description,
        quantity: line.quantity,
        unitAmount: line.unitAmount.toFixed(2),
        amount: line.amount.toFixed(2),
        createdAt: line.createdAt.toISOString(),
      })),
      adjustments: invoice.adjustments.map((adj) => ({
        id: adj.id,
        invoiceId: adj.invoiceId,
        orderId: adj.orderId,
        orderNumber: adj.order.orderNumber,
        type: adj.type,
        amount: adj.amount.toFixed(2),
        reason: adj.reason,
        createdAt: adj.createdAt.toISOString(),
        createdByUserId: adj.createdByUserId,
        createdByUser: adj.createdByUser
          ? {
              id: adj.createdByUser.id,
              name: adj.createdByUser.name,
            }
          : null,
      })),
    };
  }

  /**
   * Retrieves a paginated list of invoices with filters.
   */
  async listInvoices(
    query: InvoiceListQueryDto,
  ): Promise<PaginatedInvoicesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.InvoiceWhereInput = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.issuedFrom || query.issuedTo) {
      where.issuedAt = {};
      if (query.issuedFrom) {
        where.issuedAt.gte = new Date(`${query.issuedFrom}T00:00:00.000Z`);
      }
      if (query.issuedTo) {
        where.issuedAt.lte = new Date(`${query.issuedTo}T23:59:59.999Z`);
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { company: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { issuedAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              lines: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const formatted: InvoiceSummaryResponse[] = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      companyId: inv.companyId,
      company: inv.company,
      status: inv.status,
      issuedAt: inv.issuedAt.toISOString(),
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      subtotal: inv.subtotal.toFixed(2),
      adjustmentTotal: inv.adjustmentTotal.toFixed(2),
      total: inv.total.toFixed(2),
      lineCount: inv._count.lines,
      createdAt: inv.createdAt.toISOString(),
    }));

    return createPaginatedResponse(formatted, total, safePage, safeLimit);
  }

  /**
   * Marks an invoice as PAID.
   * Concurrency safe and idempotent: throws ConflictException if already paid.
   */
  async markInvoicePaid(
    invoiceId: string,
    _userId?: string,
  ): Promise<InvoiceDetailResponse> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException(
        `Invoice '${invoice.invoiceNumber}' is already marked as PAID`,
      );
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        `Invoice '${invoice.invoiceNumber}' is VOID and cannot be paid`,
      );
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });

    return this.getInvoiceById(invoiceId);
  }
}
