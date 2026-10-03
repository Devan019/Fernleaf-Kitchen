import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DriverService } from './driver.service.js';
import { DispatchStatusService } from './dispatch-status.service.js';
import { MarkDeliveredDto } from './dto/mark-delivered.dto.js';
import {
  DriverDropDetailResponse,
  DriverTodayDropsResponse,
} from './types/dispatch.types.js';

@ApiTags('driver')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
@Controller('driver')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly statusService: DispatchStatusService,
  ) {}

  @Get('drops/today')
  @ApiOperation({
    summary: "View authenticated driver's assigned drops for today",
    description:
      'Returns only drops assigned to the calling driver for today in the business timezone, sorted by delivery time.',
  })
  @ApiResponse({ status: 200, description: "Driver's drops for today retrieved successfully." })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: caller is not a driver.' })
  getTodayDrops(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DriverTodayDropsResponse> {
    return this.driverService.getTodayDropsForDriver(user.id);
  }

  @Get('drops/:dropId')
  @ApiOperation({
    summary: 'View delivery drop details (Driver view)',
    description:
      'Returns operational drop details. Access is strictly isolated to the assigned driver.',
  })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Drop details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: not assigned driver or caller is not a driver.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  getDriverDropDetail(
    @Param('dropId') dropId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DriverDropDetailResponse> {
    return this.driverService.getDriverDropDetail(dropId, user.id);
  }

  @Post('drops/:dropId/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Driver marks a delivery drop as DELIVERED',
    description:
      'Transitions drop and all attached orders to DELIVERED atomically. Computes on-time delivery against promised delivery time.',
  })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Drop marked delivered successfully.' })
  @ApiResponse({ status: 400, description: 'Drop is not OUT_FOR_DELIVERY.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: not assigned driver.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  @ApiResponse({ status: 409, description: 'Drop already delivered or modified concurrently.' })
  markDelivered(
    @Param('dropId') dropId: string,
    @Body() dto: MarkDeliveredDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.statusService.markDelivered(dropId, user.id, dto);
  }

  @Post('drops/:dropId/delivery-photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload delivery proof photo for a drop (Driver only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Proof of delivery image (JPEG, PNG, WebP - max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'dropId', description: 'Delivery drop ID' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid image file or type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: not assigned driver.' })
  @ApiResponse({ status: 404, description: 'Drop not found.' })
  uploadDeliveryPhoto(
    @Param('dropId') dropId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ photoUrl: string }> {
    return this.driverService.uploadDeliveryPhoto(dropId, user.id, file);
  }
}
