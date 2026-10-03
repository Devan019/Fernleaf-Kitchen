import {
  Body,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DispatchService } from './dispatch.service.js';
import { DropService } from './drop.service.js';
import { DispatchStatusService } from './dispatch-status.service.js';
import { DispatchBoardQueryDto } from './dto/dispatch-board-query.dto.js';
import { AssignDriverDto } from './dto/assign-driver.dto.js';
import {
  DispatchBoardResponse,
  DispatchDropDetailResponse,
} from './types/dispatch.types.js';

@ApiTags('dispatch')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly dropService: DropService,
    private readonly statusService: DispatchStatusService,
  ) {}

  @Get('board')
  @RequirePermissions(Permission.DISPATCH_READ)
  @ApiOperation({
    summary: 'View dispatch board with drops for a specific delivery date',
    description:
      'Returns delivery drops ordered by delivery time ascending. Primary operational unit is the drop.',
  })
  @ApiResponse({ status: 200, description: 'Dispatch board drops retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getBoard(@Query() query: DispatchBoardQueryDto): Promise<DispatchBoardResponse> {
    return this.dispatchService.getBoard(query);
  }

  @Get('drops/:dropId')
  @RequirePermissions(Permission.DISPATCH_READ)
  @ApiOperation({ summary: 'View detailed operational information for a delivery drop' })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Drop details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  getDropDetail(@Param('dropId') dropId: string): Promise<DispatchDropDetailResponse> {
    return this.dispatchService.getDropDetail(dropId);
  }

  @Post('drops/:dropId/driver')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DISPATCH_ASSIGN_DRIVER)
  @ApiOperation({ summary: 'Assign or reassign a driver to a delivery drop' })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Driver assigned successfully.' })
  @ApiResponse({ status: 400, description: 'Assigned user is not an active driver or drop already delivered.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Drop or driver user not found.' })
  assignDriver(
    @Param('dropId') dropId: string,
    @Body() dto: AssignDriverDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dropService.assignDriver(dropId, dto.driverId, user.id);
  }

  @Post('drops/:dropId/ready')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DISPATCH_UPDATE)
  @ApiOperation({ summary: 'Mark an eligible delivery drop as DISPATCH_READY' })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Drop marked dispatch ready.' })
  @ApiResponse({ status: 400, description: 'Unfinished kitchen units or invalid prerequisites.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  @ApiResponse({ status: 409, description: 'Drop already dispatch ready or modified concurrently.' })
  markDropReady(
    @Param('dropId') dropId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.statusService.markDispatchReady(dropId, user.id);
  }

  @Post('orders/:orderId/ready')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DISPATCH_UPDATE)
  @ApiOperation({ summary: 'Mark an eligible order / drop as DISPATCH_READY by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order / drop marked dispatch ready.' })
  @ApiResponse({ status: 400, description: 'Order has unfinished kitchen units or no drop.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  markOrderReady(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.statusService.markOrderDispatchReady(orderId, user.id);
  }

  @Post('drops/:dropId/out-for-delivery')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DISPATCH_UPDATE)
  @ApiOperation({ summary: 'Mark a dispatch ready drop with assigned driver as OUT_FOR_DELIVERY' })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Drop marked out for delivery.' })
  @ApiResponse({ status: 400, description: 'Drop not DISPATCH_READY, driver missing, or orders cancelled.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  @ApiResponse({ status: 409, description: 'Drop already out for delivery or modified concurrently.' })
  markOutForDelivery(
    @Param('dropId') dropId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.statusService.markOutForDelivery(dropId, user.id);
  }
}
