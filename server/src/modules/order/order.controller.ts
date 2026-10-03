import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  AddOrderLineDto,
  CancelOrderDto,
  CreateOrderDto,
  OrderQueryDto,
  ProcessCutoffDto,
  UpdateOrderDeliveryDto,
  UpdateOrderDto,
  UpdateOrderLineDto,
} from './dto/index.js';
import type {
  CutoffCheckResult,
  CutoffProcessResult,
  OrderDetailResponse,
  PaginatedOrdersResponse,
} from './types/order.types.js';
import { OrderCutoffService } from './services/order-cutoff.service.js';
import { OrderService } from './order.service.js';

@ApiTags('order')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly cutoffService: OrderCutoffService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.ORDER_CREATE)
  @ApiOperation({
    summary: 'Create a new order for a customer employee (Draft or Placed)',
    description:
      'Creates an order on behalf of a company employee with menu resolution, validation, price snapshots, and Decimal totals.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully with full snapshots and line items.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failure (e.g. invalid combinations, company non-working day, missing prices, cut-off passed).',
  })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.createOrder(dto, user.id, user.role);
  }

  @Post('cutoff/process')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ORDER_CUTOFF_PROCESS)
  @ApiOperation({
    summary: 'Manually trigger cut-off processing for a delivery date (Admin only)',
    description:
      'Transitions all DRAFT orders to CANCELLED and all PLACED orders to CONFIRMED for the delivery date. Fully idempotent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cut-off processing summary.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required.' })
  processCutoff(
    @Body() dto: ProcessCutoffDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CutoffProcessResult> {
    return this.cutoffService.processCutoffForDate(dto.deliveryDate, user.id);
  }

  @Get('cutoff/check')
  @RequirePermissions(Permission.ORDER_READ)
  @ApiOperation({
    summary: 'Check cut-off time and status for a delivery date',
    description:
      'Calculates the exact cut-off timestamp taking kitchen working days and holidays into account.',
  })
  @ApiQuery({
    name: 'deliveryDate',
    description: 'Target delivery date (YYYY-MM-DD)',
    example: '2026-10-10',
  })
  @ApiResponse({
    status: 200,
    description: 'Cut-off calculation result.',
  })
  checkCutoff(
    @Query('deliveryDate') deliveryDate: string,
  ): Promise<CutoffCheckResult> {
    return this.cutoffService.checkCutoff(deliveryDate);
  }

  @Get()
  @RequirePermissions(Permission.ORDER_READ)
  @ApiOperation({
    summary: 'List orders with pagination, search, and filters',
    description:
      'Supports filtering by delivery date range, status, company, employee, and invoiced state.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of orders.',
  })
  findOrders(@Query() query: OrderQueryDto): Promise<PaginatedOrdersResponse> {
    return this.orderService.findOrders(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.ORDER_READ)
  @ApiOperation({
    summary: 'Get order details by ID',
    description:
      'Returns complete order information with historical price snapshots, line combinations, and status history timeline.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order details with full snapshot history.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id') id: string): Promise<OrderDetailResponse> {
    return this.orderService.findOrderById(id);
  }

  @Post(':id/place')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ORDER_UPDATE)
  @ApiOperation({
    summary: 'Place a Draft order',
    description:
      'Transitions a DRAFT order to PLACED after re-validating menu visibility, cut-off, and authoritative server pricing.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order successfully placed.' })
  @ApiResponse({
    status: 400,
    description: 'Order is not in DRAFT status, cut-off has passed, or validation failed.',
  })
  place(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.placeOrder(id, user.id, user.role);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ORDER_UPDATE)
  @ApiOperation({
    summary: 'Edit an order before cut-off',
    description:
      'Updates delivery details, items, quantities, and combinations for a draft or placed order before cut-off.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order successfully updated.' })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be edited (past cut-off or invalid status).',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.updateOrder(id, dto, user.id, user.role);
  }

  @Patch(':id/delivery')
  @RequirePermissions(Permission.ORDER_OVERRIDE)
  @ApiOperation({
    summary: 'Update delivery details (Admin override / focused delivery update)',
    description:
      'Allows updating delivery address, time, instructions, or packaging without altering historical price snapshots.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Delivery details updated.' })
  updateDelivery(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.updateOrderDelivery(
      id,
      dto,
      user.id,
      user.role,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ORDER_CANCEL)
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Cancels a draft or placed order before cut-off, or via admin override after cut-off.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order successfully cancelled.' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.cancelOrder(id, dto, user.id, user.role);
  }

  @Post(':id/lines')
  @RequirePermissions(Permission.ORDER_UPDATE)
  @ApiOperation({
    summary: 'Add a line to an order before cut-off',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  addLine(
    @Param('id') id: string,
    @Body() dto: AddOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.addOrderLine(id, dto, user.id, user.role);
  }

  @Patch(':id/lines/:lineId')
  @RequirePermissions(Permission.ORDER_UPDATE)
  @ApiOperation({
    summary: 'Update a line in an order before cut-off',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiParam({ name: 'lineId', description: 'Order Line ID' })
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateOrderLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.updateOrderLine(
      id,
      lineId,
      dto,
      user.id,
      user.role,
    );
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions(Permission.ORDER_UPDATE)
  @ApiOperation({
    summary: 'Remove a line from an order before cut-off',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiParam({ name: 'lineId', description: 'Order Line ID' })
  removeLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orderService.removeOrderLine(
      id,
      lineId,
      user.id,
      user.role,
    );
  }
}
