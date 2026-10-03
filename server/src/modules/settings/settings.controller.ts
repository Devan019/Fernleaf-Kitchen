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
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import { SettingsService } from './settings.service.js';
import { KitchenHolidayService } from './kitchen-holiday.service.js';
import {
  CreateKitchenHolidayDto,
  DeleteHolidayResponseDto,
  KitchenHolidayResponseDto,
  KitchenSettingsResponseDto,
  UpdateKitchenHolidayDto,
  UpdateKitchenSettingsDto,
} from './dto/index.js';
import type {
  KitchenHolidayResponse,
  KitchenSettingsResponse,
} from './types/settings.types.js';

@ApiTags('settings')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly holidayService: KitchenHolidayService,
  ) {}

  // ====================================================
  // Kitchen Settings Endpoints
  // ====================================================

  @Get('kitchen')
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get platform-wide kitchen configuration and holidays',
    description:
      'Retrieves the current kitchen operating days, cut-off time, cut-off working-day count, timezone, and holidays.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current kitchen configuration retrieved successfully.',
    type: KitchenSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getKitchenSettings(): Promise<KitchenSettingsResponse> {
    return this.settingsService.getKitchenSettings();
  }

  @Patch('kitchen')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update platform-wide kitchen configuration (Admin only)',
    description:
      'Updates kitchen working days, cut-off time, cut-off working-day count, or timezone atomically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen configuration updated successfully.',
    type: KitchenSettingsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid format or validation failure.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async updateKitchenSettings(
    @Body() dto: UpdateKitchenSettingsDto,
  ): Promise<KitchenSettingsResponse> {
    return this.settingsService.updateKitchenSettings(dto);
  }

  // ====================================================
  // Kitchen Holiday Endpoints
  // ====================================================

  @Get('kitchen/holidays')
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiOperation({
    summary: 'List all platform-wide kitchen holidays',
    description:
      'Returns all registered kitchen holidays ordered chronologically by date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen holidays retrieved successfully.',
    type: [KitchenHolidayResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getKitchenHolidays(): Promise<KitchenHolidayResponse[]> {
    return this.holidayService.getHolidays();
  }

  @Get('kitchen/holidays/:id')
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get a kitchen holiday by ID',
    description: 'Retrieves details of a specific kitchen holiday.',
  })
  @ApiParam({ name: 'id', description: 'Kitchen holiday ID' })
  @ApiResponse({
    status: 200,
    description: 'Kitchen holiday retrieved successfully.',
    type: KitchenHolidayResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Kitchen holiday not found.' })
  async getKitchenHolidayById(
    @Param('id') id: string,
  ): Promise<KitchenHolidayResponse> {
    return this.holidayService.getHolidayById(id);
  }

  @Post('kitchen/holidays')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new kitchen holiday (Admin only)',
    description:
      'Creates a new platform-wide holiday. Dates must be unique across the platform.',
  })
  @ApiResponse({
    status: 201,
    description: 'Kitchen holiday created successfully.',
    type: KitchenHolidayResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid date or payload.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Holiday already exists for this date.',
  })
  async createKitchenHoliday(
    @Body() dto: CreateKitchenHolidayDto,
  ): Promise<KitchenHolidayResponse> {
    return this.holidayService.createHoliday(dto);
  }

  @Patch('kitchen/holidays/:id')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update an existing kitchen holiday (Admin only)',
    description:
      'Updates the date, name, or description of an existing kitchen holiday.',
  })
  @ApiParam({ name: 'id', description: 'Kitchen holiday ID' })
  @ApiResponse({
    status: 200,
    description: 'Kitchen holiday updated successfully.',
    type: KitchenHolidayResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid format.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'Kitchen holiday not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. A holiday already exists for the updated date.',
  })
  async updateKitchenHoliday(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenHolidayDto,
  ): Promise<KitchenHolidayResponse> {
    return this.holidayService.updateHoliday(id, dto);
  }

  @Delete('kitchen/holidays/:id')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Delete a kitchen holiday (Admin only)',
    description: 'Deletes a kitchen holiday by ID.',
  })
  @ApiParam({ name: 'id', description: 'Kitchen holiday ID' })
  @ApiResponse({
    status: 200,
    description: 'Kitchen holiday deleted successfully.',
    type: DeleteHolidayResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'Kitchen holiday not found.' })
  async deleteKitchenHoliday(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.holidayService.deleteHoliday(id);
  }
}
