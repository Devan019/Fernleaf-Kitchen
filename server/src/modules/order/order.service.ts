import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/index.js';
import { OrderStatus, UserRole } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AddOrderLineDto,
  CancelOrderDto,
  CreateOrderDto,
  CreateOrderLineDto,
  OrderQueryDto,
  UpdateOrderDeliveryDto,
  UpdateOrderDto,
  UpdateOrderLineDto,
} from './dto/index.js';
import {
  OrderDetailResponse,
  OrderLineCombinationResponse,
  OrderLineResponse,
  OrderSummaryResponse,
  PaginatedOrdersResponse,
} from './types/order.types.js';
import { formatMoney } from './utils/order-money.utils.js';
import { OrderCutoffService } from './services/order-cutoff.service.js';
import {
  CalculatedOrderLineSnapshot,
  OrderPricingService,
} from './services/order-pricing.service.js';
import { OrderStatusService } from './services/order-status.service.js';
import { OrderValidationService } from './services/order-validation.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cutoffService: OrderCutoffService,
    private readonly pricingService: OrderPricingService,
    private readonly statusService: OrderStatusService,
    private readonly validationService: OrderValidationService,
  ) {}

  /**
   * Generates a unique, human-readable order number.
   * Format: ORD-YYYYMMDD-XXXX
   */
  private generateOrderNumber(dateStr: string): string {
    const compactDate = dateStr.replace(/-/g, '');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${compactDate}-${suffix}`;
  }

  /**
   * Creates a new order (Draft or Placed).
   */
  async createOrder(
    dto: CreateOrderDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const isAdmin = userRole === UserRole.ADMIN;
    const isPlacing = dto.status === OrderStatus.PLACED;
    const deliveryDateStr = dto.deliveryDate.substring(0, 10);
    const targetDeliveryDate = new Date(`${deliveryDateStr}T00:00:00.000Z`);

    // 1. Validate employee and company
    const { employee, company } =
      await this.validationService.validateEmployeeAndCompany(dto.employeeId);

    // 2. Validate company delivery calendar (working days and holidays)
    await this.validationService.validateCompanyDeliveryCalendar(
      company.id,
      company.workingDays,
      deliveryDateStr,
    );

    // 3. Validate delivery details (address, time, packaging)
    const deliveryDetails =
      await this.validationService.validateDeliveryDetails(
        employee,
        company,
        dto,
      );

    // 4. If placing directly, cut-off must not have passed
    if (isPlacing) {
      await this.validationService.validateCutoff(deliveryDateStr, isAdmin);
    }

    // 5. Validate menu visibility and option combinations
    await this.validationService.validateMenuAndDishes(
      employee.id,
      company.id,
      dto.lines,
    );

    // 6. Calculate all financial totals using Decimal
    const pricing = await this.pricingService.calculateOrderPricing(
      employee.id,
      company.id,
      dto.lines,
    );

    const orderId = randomUUID();
    const orderNumber = this.generateOrderNumber(deliveryDateStr);
    const now = new Date();
    const finalStatus = isPlacing ? OrderStatus.PLACED : OrderStatus.DRAFT;

    // 7. Transactional insert of Order, OrderLines, Combinations, and Options
    try {
      await this.prisma.$transaction(async (tx) => {
        // Create Order
        await tx.order.create({
          data: {
            id: orderId,
            orderNumber,
            employeeId: employee.id,
            companyId: company.id, // Historical denormalization
            deliveryDate: targetDeliveryDate,
            deliveryTime: deliveryDetails.deliveryTime,
            status: finalStatus,
            packagingType: deliveryDetails.packagingType,
            deliveryAddressId:
              deliveryDetails.addressSnapshot.deliveryAddressId,
            deliveryAddressLabel:
              deliveryDetails.addressSnapshot.deliveryAddressLabel,
            deliveryStreet: deliveryDetails.addressSnapshot.deliveryStreet,
            deliveryUnit: deliveryDetails.addressSnapshot.deliveryUnit,
            deliveryCity: deliveryDetails.addressSnapshot.deliveryCity,
            deliveryPostcode:
              deliveryDetails.addressSnapshot.deliveryPostcode,
            deliveryInstructions: deliveryDetails.deliveryInstructions,
            subtotal: pricing.subtotal,
            total: pricing.total,
            createdByUserId: userId ?? null,
            placedAt: isPlacing ? now : null,
            createdAt: now,
            updatedAt: now,
          },
        });

        // Insert OrderLines and their combinations
        await this.insertOrderLines(tx, orderId, pricing.lines, now);

        // Record OrderStatusHistory
        await tx.orderStatusHistory.create({
          data: {
            id: randomUUID(),
            orderId,
            fromStatus: null,
            toStatus: finalStatus,
            changedByUserId: userId ?? null,
            note: isPlacing ? 'Order created and placed by staff' : 'Order saved as draft by staff',
            createdAt: now,
          },
        });
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Order number conflict, please retry');
      }
      throw error;
    }

    return this.findOrderById(orderId);
  }

  /**
   * Places a Draft order.
   */
  async placeOrder(
    id: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const isAdmin = userRole === UserRole.ADMIN;
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: {
                OrderCombinationOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT orders can be placed. Current status is ${order.status}`,
      );
    }

    const deliveryDateStr = order.deliveryDate.toISOString().substring(0, 10);

    // 1. Cut-off must not have passed
    await this.validationService.validateCutoff(deliveryDateStr, isAdmin);

    // 2. Validate employee and company are still active
    const { employee, company } =
      await this.validationService.validateEmployeeAndCompany(order.employeeId);

    // 3. Validate company delivery calendar
    await this.validationService.validateCompanyDeliveryCalendar(
      company.id,
      company.workingDays,
      deliveryDateStr,
    );

    // 4. Convert existing lines back to CreateOrderLineDto structure to re-validate
    const linesDto: CreateOrderLineDto[] = order.OrderLine.map((line) => ({
      dishId: line.dishId,
      quantity: line.quantity,
      combinations: line.OrderLineCombination.map((comb) => ({
        quantity: comb.quantity,
        options: comb.OrderCombinationOption.map((opt) => ({
          optionGroupId: opt.optionGroupId ?? '',
          optionId: opt.optionId,
          portionSizeId: opt.portionSizeId ?? undefined,
        })),
      })),
    }));

    // 5. Re-validate menu visibility and option rules
    await this.validationService.validateMenuAndDishes(
      employee.id,
      company.id,
      linesDto,
    );

    // 6. Recalculate prices freshly on the server
    const pricing = await this.pricingService.calculateOrderPricing(
      employee.id,
      company.id,
      linesDto,
    );

    const now = new Date();

    // 7. Transactional update of order and fresh snapshots
    await this.prisma.$transaction(async (tx) => {
      // Delete existing lines (cascades to combinations and options)
      await tx.orderLine.deleteMany({
        where: { orderId: order.id },
      });

      // Insert fresh lines and snapshots
      await this.insertOrderLines(tx, order.id, pricing.lines, now);

      // Update Order status and financial totals
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PLACED,
          subtotal: pricing.subtotal,
          total: pricing.total,
          placedAt: now,
          updatedAt: now,
        },
      });

      // Record OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          fromStatus: OrderStatus.DRAFT,
          toStatus: OrderStatus.PLACED,
          changedByUserId: userId ?? null,
          note: 'Order placed by staff',
          createdAt: now,
        },
      });
    });

    return this.findOrderById(order.id);
  }

  /**
   * Updates an existing order before cut-off.
   */
  async updateOrder(
    id: string,
    dto: UpdateOrderDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const isAdmin = userRole === UserRole.ADMIN;
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: {
                OrderCombinationOption: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    const currentDeliveryDateStr = order.deliveryDate
      .toISOString()
      .substring(0, 10);
    const isPastCutoff = await this.cutoffService.isPastCutoff(
      currentDeliveryDateStr,
    );

    if (!this.statusService.canEditOrder(order.status, isAdmin, isPastCutoff)) {
      throw new BadRequestException(
        `Order '${id}' cannot be edited in status ${order.status} or after cut-off`,
      );
    }

    const targetDateStr = dto.deliveryDate
      ? dto.deliveryDate.substring(0, 10)
      : currentDeliveryDateStr;
    const targetDeliveryDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    // Validate employee and company
    const { employee, company } =
      await this.validationService.validateEmployeeAndCompany(order.employeeId);

    // If delivery date changed, validate company calendar & cut-off for new date
    if (dto.deliveryDate && targetDateStr !== currentDeliveryDateStr) {
      await this.validationService.validateCompanyDeliveryCalendar(
        company.id,
        company.workingDays,
        targetDateStr,
      );
      await this.validationService.validateCutoff(targetDateStr, isAdmin);
    }

    // Validate delivery details
    const deliveryDetails =
      await this.validationService.validateDeliveryDetails(
        employee,
        company,
        {
          deliveryAddressId: dto.deliveryAddressId ?? order.deliveryAddressId ?? undefined,
          deliveryTime: dto.deliveryTime ?? order.deliveryTime,
          packagingType: dto.packagingType ?? order.packagingType,
          deliveryInstructions: dto.deliveryInstructions ?? order.deliveryInstructions ?? undefined,
        },
      );

    // Determine lines to use
    let linesDto: CreateOrderLineDto[];
    if (dto.lines && dto.lines.length > 0) {
      linesDto = dto.lines;
    } else {
      linesDto = order.OrderLine.map((line) => ({
        dishId: line.dishId,
        quantity: line.quantity,
        combinations: line.OrderLineCombination.map((comb) => ({
          quantity: comb.quantity,
          options: comb.OrderCombinationOption.map((opt) => ({
            optionGroupId: opt.optionGroupId ?? '',
            optionId: opt.optionId,
            portionSizeId: opt.portionSizeId ?? undefined,
          })),
        })),
      }));
    }

    // Validate menu and dishes
    await this.validationService.validateMenuAndDishes(
      employee.id,
      company.id,
      linesDto,
    );

    // Recalculate prices
    const pricing = await this.pricingService.calculateOrderPricing(
      employee.id,
      company.id,
      linesDto,
    );

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (dto.lines && dto.lines.length > 0) {
        await tx.orderLine.deleteMany({
          where: { orderId: order.id },
        });
        await this.insertOrderLines(tx, order.id, pricing.lines, now);
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryDate: targetDeliveryDate,
          deliveryTime: deliveryDetails.deliveryTime,
          packagingType: deliveryDetails.packagingType,
          deliveryAddressId:
            deliveryDetails.addressSnapshot.deliveryAddressId,
          deliveryAddressLabel:
            deliveryDetails.addressSnapshot.deliveryAddressLabel,
          deliveryStreet: deliveryDetails.addressSnapshot.deliveryStreet,
          deliveryUnit: deliveryDetails.addressSnapshot.deliveryUnit,
          deliveryCity: deliveryDetails.addressSnapshot.deliveryCity,
          deliveryPostcode:
            deliveryDetails.addressSnapshot.deliveryPostcode,
          deliveryInstructions: deliveryDetails.deliveryInstructions,
          subtotal: pricing.subtotal,
          total: pricing.total,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedByUserId: userId ?? null,
          note: 'Order details updated by staff',
          createdAt: now,
        },
      });
    });

    return this.findOrderById(order.id);
  }

  /**
   * Updates delivery details (Admin override / focused delivery modification).
   * Crucial rule: Does NOT alter historical pricing snapshots.
   */
  async updateOrderDelivery(
    id: string,
    dto: UpdateOrderDeliveryDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const isAdmin = userRole === UserRole.ADMIN;
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        Company: {
          include: { deliveryAddresses: true },
        },
        Employee: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    const deliveryDateStr = order.deliveryDate.toISOString().substring(0, 10);
    const isPastCutoff = await this.cutoffService.isPastCutoff(deliveryDateStr);

    if (isPastCutoff && !isAdmin) {
      throw new BadRequestException(
        'Delivery details cannot be changed after cut-off by non-admin users',
      );
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot change delivery details for an order that is already ${order.status}`,
      );
    }

    let addressSnapshot = {
      deliveryAddressId: order.deliveryAddressId,
      deliveryAddressLabel: order.deliveryAddressLabel,
      deliveryStreet: order.deliveryStreet,
      deliveryUnit: order.deliveryUnit,
      deliveryCity: order.deliveryCity,
      deliveryPostcode: order.deliveryPostcode,
      deliveryInstructions:
        dto.deliveryInstructions ?? order.deliveryInstructions,
    };

    if (dto.deliveryAddressId) {
      const address = order.Company.deliveryAddresses.find(
        (a) => a.id === dto.deliveryAddressId,
      );
      if (!address) {
        throw new BadRequestException(
          `Delivery address '${dto.deliveryAddressId}' does not belong to company '${order.Company.name}'`,
        );
      }
      addressSnapshot = {
        deliveryAddressId: address.id,
        deliveryAddressLabel: address.label,
        deliveryStreet: address.street,
        deliveryUnit: address.unit,
        deliveryCity: address.city,
        deliveryPostcode: address.postcode,
        deliveryInstructions:
          dto.deliveryInstructions ?? address.deliveryInstructions,
      };
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryTime: dto.deliveryTime ?? order.deliveryTime,
          packagingType: dto.packagingType ?? order.packagingType,
          deliveryAddressId: addressSnapshot.deliveryAddressId,
          deliveryAddressLabel: addressSnapshot.deliveryAddressLabel,
          deliveryStreet: addressSnapshot.deliveryStreet,
          deliveryUnit: addressSnapshot.deliveryUnit,
          deliveryCity: addressSnapshot.deliveryCity,
          deliveryPostcode: addressSnapshot.deliveryPostcode,
          deliveryInstructions: addressSnapshot.deliveryInstructions,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedByUserId: userId ?? null,
          note: isAdmin
            ? 'Delivery details updated via admin override'
            : 'Delivery details updated by staff',
          createdAt: now,
        },
      });
    });

    return this.findOrderById(order.id);
  }

  /**
   * Cancels an order.
   */
  async cancelOrder(
    id: string,
    dto?: CancelOrderDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const isAdmin = userRole === UserRole.ADMIN;
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    // Idempotent cancellation
    if (order.status === OrderStatus.CANCELLED) {
      return this.findOrderById(order.id);
    }

    const deliveryDateStr = order.deliveryDate.toISOString().substring(0, 10);
    const isPastCutoff = await this.cutoffService.isPastCutoff(deliveryDateStr);

    if (
      !this.statusService.canCancelOrder(order.status, isAdmin, isPastCutoff)
    ) {
      throw new BadRequestException(
        `Order '${id}' in status ${order.status} cannot be cancelled after cut-off`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedByUserId: userId ?? null,
          note: dto?.reason ? `Cancelled: ${dto.reason}` : 'Order cancelled by staff',
          createdAt: now,
        },
      });
    });

    return this.findOrderById(order.id);
  }

  /**
   * Adds an order line to a draft/placed order before cut-off.
   */
  async addOrderLine(
    id: string,
    dto: AddOrderLineDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: { OrderCombinationOption: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    // Construct full lines list with the new line added
    const existingLines: CreateOrderLineDto[] = order.OrderLine.map((line) => ({
      dishId: line.dishId,
      quantity: line.quantity,
      combinations: line.OrderLineCombination.map((comb) => ({
        quantity: comb.quantity,
        options: comb.OrderCombinationOption.map((opt) => ({
          optionGroupId: opt.optionGroupId ?? '',
          optionId: opt.optionId,
          portionSizeId: opt.portionSizeId ?? undefined,
        })),
      })),
    }));

    const updatedLines = [...existingLines, dto];
    return this.updateOrder(
      id,
      { lines: updatedLines },
      userId,
      userRole,
    );
  }

  /**
   * Updates an existing order line.
   */
  async updateOrderLine(
    id: string,
    lineId: string,
    dto: UpdateOrderLineDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: { OrderCombinationOption: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    const targetLine = order.OrderLine.find((l) => l.id === lineId);
    if (!targetLine) {
      throw new NotFoundException(
        `Order line '${lineId}' not found on order '${id}'`,
      );
    }

    const updatedLines: CreateOrderLineDto[] = order.OrderLine.map((line) => {
      if (line.id !== lineId) {
        return {
          dishId: line.dishId,
          quantity: line.quantity,
          combinations: line.OrderLineCombination.map((comb) => ({
            quantity: comb.quantity,
            options: comb.OrderCombinationOption.map((opt) => ({
              optionGroupId: opt.optionGroupId ?? '',
              optionId: opt.optionId,
              portionSizeId: opt.portionSizeId ?? undefined,
            })),
          })),
        };
      }

      return {
        dishId: line.dishId,
        quantity: dto.quantity ?? line.quantity,
        combinations: dto.combinations ?? line.OrderLineCombination.map((comb) => ({
          quantity: comb.quantity,
          options: comb.OrderCombinationOption.map((opt) => ({
            optionGroupId: opt.optionGroupId ?? '',
            optionId: opt.optionId,
            portionSizeId: opt.portionSizeId ?? undefined,
          })),
        })),
      };
    });

    return this.updateOrder(
      id,
      { lines: updatedLines },
      userId,
      userRole,
    );
  }

  /**
   * Removes an order line.
   */
  async removeOrderLine(
    id: string,
    lineId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: { OrderCombinationOption: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    if (order.OrderLine.length <= 1) {
      throw new BadRequestException('Cannot remove the last line of an order');
    }

    const remainingLines: CreateOrderLineDto[] = order.OrderLine
      .filter((l) => l.id !== lineId)
      .map((line) => ({
        dishId: line.dishId,
        quantity: line.quantity,
        combinations: line.OrderLineCombination.map((comb) => ({
          quantity: comb.quantity,
          options: comb.OrderCombinationOption.map((opt) => ({
            optionGroupId: opt.optionGroupId ?? '',
            optionId: opt.optionId,
            portionSizeId: opt.portionSizeId ?? undefined,
          })),
        })),
      }));

    return this.updateOrder(
      id,
      { lines: remainingLines },
      userId,
      userRole,
    );
  }

  /**
   * Retrieves a single order by ID with all snapshots and timeline.
   */
  async findOrderById(id: string): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        Company: { select: { id: true, name: true } },
        Employee: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
        OrderLine: {
          include: {
            OrderLineCombination: {
              include: {
                OrderCombinationOption: true,
              },
            },
          },
        },
        OrderStatusHistory: {
          include: {
            User: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }

    return this.mapToOrderDetailResponse(order);
  }

  /**
   * Lists orders with pagination and filters.
   */
  async findOrders(query: OrderQueryDto): Promise<PaginatedOrdersResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.isInvoiced !== undefined) {
      where.isInvoiced = query.isInvoiced;
    }

    if (query.deliveryDateFrom || query.deliveryDateTo) {
      where.deliveryDate = {
        ...(query.deliveryDateFrom
          ? { gte: new Date(`${query.deliveryDateFrom}T00:00:00.000Z`) }
          : {}),
        ...(query.deliveryDateTo
          ? { lte: new Date(`${query.deliveryDateTo}T23:59:59.999Z`) }
          : {}),
      };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { Employee: { name: { contains: term, mode: 'insensitive' } } },
        { Company: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          Company: { select: { id: true, name: true } },
          Employee: { select: { id: true, name: true } },
          User: { select: { id: true, name: true, email: true } },
          _count: { select: { OrderLine: true } },
        },
      }),
    ]);

    const summaries: OrderSummaryResponse[] = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      employeeId: o.employeeId,
      employeeName: o.Employee.name,
      companyId: o.companyId,
      companyName: o.Company.name,
      deliveryDate: o.deliveryDate.toISOString().substring(0, 10),
      deliveryTime: o.deliveryTime,
      status: o.status,
      packagingType: o.packagingType,
      deliveryAddress: {
        deliveryAddressId: o.deliveryAddressId,
        deliveryAddressLabel: o.deliveryAddressLabel,
        deliveryStreet: o.deliveryStreet,
        deliveryUnit: o.deliveryUnit,
        deliveryCity: o.deliveryCity,
        deliveryPostcode: o.deliveryPostcode,
        deliveryInstructions: o.deliveryInstructions,
      },
      subtotal: formatMoney(o.subtotal),
      total: formatMoney(o.total),
      isInvoiced: o.isInvoiced,
      createdByUserId: o.createdByUserId,
      placedAt: o.placedAt,
      confirmedAt: o.confirmedAt,
      deliveredAt: o.deliveredAt,
      cancelledAt: o.cancelledAt,
      rejectedAt: o.rejectedAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      linesCount: o._count.OrderLine,
    }));

    return createPaginatedResponse(summaries, total, safePage, safeLimit);
  }

  /**
   * Helper to insert OrderLines, Combinations, and Options into the database.
   */
  private async insertOrderLines(
    tx: Prisma.TransactionClient,
    orderId: string,
    lines: CalculatedOrderLineSnapshot[],
    now: Date,
  ): Promise<void> {
    for (const line of lines) {
      const orderLineId = randomUUID();
      await tx.orderLine.create({
        data: {
          id: orderLineId,
          orderId,
          dishId: line.dishId,
          dishNameSnapshot: line.dishNameSnapshot,
          dishSkuSnapshot: line.dishSkuSnapshot,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          createdAt: now,
          updatedAt: now,
        },
      });

      for (const comb of line.combinations) {
        const combId = randomUUID();
        await tx.orderLineCombination.create({
          data: {
            id: combId,
            orderLineId,
            quantity: comb.quantity,
            unitPrice: comb.unitPrice,
            combinationTotal: comb.combinationTotal,
            createdAt: now,
            updatedAt: now,
          },
        });

        for (const opt of comb.options) {
          await tx.orderCombinationOption.create({
            data: {
              id: randomUUID(),
              combinationId: combId,
              optionGroupId: opt.optionGroupId,
              optionGroupNameSnapshot: opt.optionGroupNameSnapshot,
              optionId: opt.optionId,
              optionNameSnapshot: opt.optionNameSnapshot,
              unitPrice: opt.unitPrice,
              portionSizeId: opt.portionSizeId,
              portionSizeNameSnapshot: opt.portionSizeNameSnapshot,
              portionExtraCharge: opt.portionExtraCharge,
              finalPrice: opt.finalPrice,
              createdAt: now,
            },
          });
        }
      }
    }
  }

  /**
   * Maps internal database order to OrderDetailResponse DTO.
   */
  private mapToOrderDetailResponse(order: any): OrderDetailResponse {
    const lines: OrderLineResponse[] = (order.OrderLine ?? []).map((l: any) => ({
      id: l.id,
      dishId: l.dishId,
      dishName: l.dishNameSnapshot,
      dishSku: l.dishSkuSnapshot,
      unitPrice: formatMoney(l.unitPrice),
      quantity: l.quantity,
      lineTotal: formatMoney(l.lineTotal),
      combinations: (l.OrderLineCombination ?? []).map((c: any): OrderLineCombinationResponse => ({
        id: c.id,
        quantity: c.quantity,
        unitPrice: formatMoney(c.unitPrice),
        combinationTotal: formatMoney(c.combinationTotal),
        options: (c.OrderCombinationOption ?? []).map((o: any) => ({
          id: o.id,
          optionGroupId: o.optionGroupId,
          optionGroupName: o.optionGroupNameSnapshot,
          optionId: o.optionId,
          optionName: o.optionNameSnapshot,
          unitPrice: formatMoney(o.unitPrice),
          portionSizeId: o.portionSizeId,
          portionSizeName: o.portionSizeNameSnapshot,
          portionExtraCharge: formatMoney(o.portionExtraCharge),
          finalPrice: formatMoney(o.finalPrice),
        })),
      })),
    }));

    const statusHistory = (order.OrderStatusHistory ?? []).map((h: any) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedByUserId: h.changedByUserId,
      changedByUserName: h.User?.name ?? null,
      note: h.note,
      createdAt: h.createdAt,
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      employeeId: order.employeeId,
      employeeName: order.Employee?.name ?? 'Unknown',
      companyId: order.companyId,
      companyName: order.Company?.name ?? 'Unknown',
      deliveryDate: order.deliveryDate.toISOString().substring(0, 10),
      deliveryTime: order.deliveryTime,
      status: order.status,
      packagingType: order.packagingType,
      deliveryAddress: {
        deliveryAddressId: order.deliveryAddressId,
        deliveryAddressLabel: order.deliveryAddressLabel,
        deliveryStreet: order.deliveryStreet,
        deliveryUnit: order.deliveryUnit,
        deliveryCity: order.deliveryCity,
        deliveryPostcode: order.deliveryPostcode,
        deliveryInstructions: order.deliveryInstructions,
      },
      subtotal: formatMoney(order.subtotal),
      total: formatMoney(order.total),
      isInvoiced: order.isInvoiced,
      createdByUserId: order.createdByUserId,
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      rejectedAt: order.rejectedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      linesCount: lines.length,
      lines,
      statusHistory,
    };
  }
}
