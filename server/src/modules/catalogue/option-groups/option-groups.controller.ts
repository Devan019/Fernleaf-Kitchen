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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { Permission } from '../../auth/types/permission.enum.js';
import { OptionGroupsService } from './option-groups.service.js';
import { CreateOptionGroupDto } from './dto/create-option-group.dto.js';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto.js';
import { AddOptionToGroupDto } from './dto/add-option-to-group.dto.js';
import { ReorderGroupOptionDto } from './dto/reorder-group-option.dto.js';
import { AddPortionToGroupDto } from './dto/add-portion-to-group.dto.js';
import { ReorderGroupPortionDto } from './dto/reorder-group-portion.dto.js';
import { OptionGroupResponse } from '../types/catalogue.types.js';

@ApiTags('catalogue-option-groups')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogue')
export class OptionGroupsController {
  constructor(private readonly optionGroupsService: OptionGroupsService) {}

  // ----------------------------------------------------
  // Dish-scoped Option Group Endpoints
  // ----------------------------------------------------

  @Post('dishes/:dishId/option-groups')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new option group for a dish (Admin only)',
  })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({
    status: 201,
    description: 'Option group created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  @ApiResponse({ status: 409, description: 'Display order collision.' })
  create(
    @Param('dishId') dishId: string,
    @Body() dto: CreateOptionGroupDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.create(dishId, dto);
  }

  @Get('dishes/:dishId/option-groups')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'List all option groups for a dish' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'List of option groups for dish.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  findByDish(@Param('dishId') dishId: string): Promise<OptionGroupResponse[]> {
    return this.optionGroupsService.findByDish(dishId);
  }

  // ----------------------------------------------------
  // Option Group Detail Endpoints
  // ----------------------------------------------------

  @Get('option-groups/:id')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get option group details by ID' })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({ status: 200, description: 'Option group details found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option group not found.' })
  findOne(@Param('id') id: string): Promise<OptionGroupResponse> {
    return this.optionGroupsService.findOne(id);
  }

  @Patch('option-groups/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({ summary: 'Update option group by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Option group updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or portion rule violated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option group not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOptionGroupDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.update(id, dto);
  }

  @Delete('option-groups/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({ summary: 'Delete option group by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Option group deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option group not found.' })
  remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.optionGroupsService.remove(id);
  }

  // ----------------------------------------------------
  // Group Options Endpoints
  // ----------------------------------------------------

  @Post('option-groups/:id/options')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an option to an option group (Admin only)' })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({ status: 201, description: 'Option attached successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or portion rule violated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Option group or option not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Option already in group or displayOrder collision.',
  })
  addOption(
    @Param('id') id: string,
    @Body() dto: AddOptionToGroupDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.addOption(id, dto);
  }

  @Delete('option-groups/:id/options/:optionId')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({
    summary: 'Remove an option from an option group (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiParam({ name: 'optionId', description: 'Option ID to remove' })
  @ApiResponse({ status: 200, description: 'Option removed from group.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option or group not found.' })
  removeOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.removeOption(id, optionId);
  }

  @Patch('option-groups/:id/options/reorder')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({
    summary: 'Reorder options within an option group (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({ status: 200, description: 'Options reordered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid list of option IDs.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option group not found.' })
  reorderOptions(
    @Param('id') id: string,
    @Body() dto: ReorderGroupOptionDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.reorderOptions(id, dto);
  }

  // ----------------------------------------------------
  // Group Portions Endpoints
  // ----------------------------------------------------

  @Post('option-groups/:id/portions')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a portion size to an option group (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({ status: 201, description: 'Portion attached successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or portion rule violated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Option group or portion size not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Portion already in group or displayOrder collision.',
  })
  addPortion(
    @Param('id') id: string,
    @Body() dto: AddPortionToGroupDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.addPortion(id, dto);
  }

  @Delete('option-groups/:id/portions/:portionId')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({
    summary: 'Remove a portion size from an option group (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiParam({
    name: 'portionId',
    description: 'Portion Size ID or OptionGroupPortion ID to remove',
  })
  @ApiResponse({ status: 200, description: 'Portion removed from group.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Portion or group not found.' })
  removePortion(
    @Param('id') id: string,
    @Param('portionId') portionId: string,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.removePortion(id, portionId);
  }

  @Patch('option-groups/:id/portions/reorder')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_GROUPS)
  @ApiOperation({
    summary: 'Reorder portion sizes within an option group (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option Group ID' })
  @ApiResponse({ status: 200, description: 'Portions reordered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid list of portion IDs.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option group not found.' })
  reorderPortions(
    @Param('id') id: string,
    @Body() dto: ReorderGroupPortionDto,
  ): Promise<OptionGroupResponse> {
    return this.optionGroupsService.reorderPortions(id, dto);
  }
}
