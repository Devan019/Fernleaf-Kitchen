import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { KitchenBoardQueryDto } from './dto/kitchen-board-query.dto.js';
import {
  KitchenBoardResponse,
  KitchenUnitResponse,
  OrderKitchenForceCompleteResult,
} from './types/kitchen-board.types.js';
import { KitchenBoardService } from './kitchen-board.service.js';
import { KitchenUnitService } from './kitchen-unit.service.js';

@ApiTags('kitchen')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly boardService: KitchenBoardService,
    private readonly unitService: KitchenUnitService,
  ) {}

  @Get('board')
  @RequirePermissions(Permission.KITCHEN_READ)
  @ApiOperation({
    summary: 'Get kitchen preparation board for delivery date',
    description:
      'Returns all preparation units for confirmed orders for the specified delivery date, grouped by kitchen station with operational late/at-risk indicators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen board grouped by station.',
  })
  @ApiResponse({ status: 400, description: 'Invalid deliveryDate format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  getBoard(@Query() query: KitchenBoardQueryDto): Promise<KitchenBoardResponse> {
    return this.boardService.getBoard(query);
  }

  @Post('units/:unitId/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.KITCHEN_UPDATE)
  @ApiOperation({
    summary: 'Start preparation of a kitchen unit',
    description:
      'Transitions a PENDING unit to STARTED. If this is the first unit started for the order, sets order.kitchenStartedAt.',
  })
  @ApiParam({ name: 'unitId', description: 'Kitchen Unit ID' })
  @ApiResponse({ status: 200, description: 'Unit preparation started successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Order is not in CONFIRMED status.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Kitchen unit not found.' })
  @ApiResponse({
    status: 409,
    description: 'Kitchen unit is already started or completed.',
  })
  startUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KitchenUnitResponse> {
    return this.unitService.startUnit(unitId, user.id);
  }

  @Post('units/:unitId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.KITCHEN_UPDATE)
  @ApiOperation({
    summary: 'Complete preparation of a kitchen unit',
    description:
      'Transitions a STARTED or PENDING unit to DONE. If this is the final unit completed for the order, sets order.kitchenReadyAt.',
  })
  @ApiParam({ name: 'unitId', description: 'Kitchen Unit ID' })
  @ApiResponse({ status: 200, description: 'Unit preparation completed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Order is not in CONFIRMED status.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Kitchen unit not found.' })
  @ApiResponse({
    status: 409,
    description: 'Kitchen unit is already completed.',
  })
  completeUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KitchenUnitResponse> {
    return this.unitService.completeUnit(unitId, user.id);
  }

  @Post('orders/:orderId/force-complete')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.KITCHEN_FORCE_COMPLETE)
  @ApiOperation({
    summary: 'Admin force-complete all kitchen work for an order',
    description:
      'Marks all kitchen units for a confirmed order as DONE and sets order.kitchenReadyAt. Preserves existing start timestamps. Idempotent.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order kitchen preparation force-completed.',
  })
  @ApiResponse({
    status: 400,
    description: 'Order is not in CONFIRMED status.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  forceComplete(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderKitchenForceCompleteResult> {
    return this.unitService.forceCompleteOrder(orderId, user.id);
  }
}
