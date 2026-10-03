import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { Permission } from '../../auth/types/permission.enum.js';
import { OptionsService } from './options.service.js';
import { CreateOptionDto } from './dto/create-option.dto.js';
import { UpdateOptionDto } from './dto/update-option.dto.js';
import { UpdateOptionStatusDto } from './dto/update-option-status.dto.js';
import { OptionQueryDto } from './dto/option-query.dto.js';
import {
  OptionResponse,
  PaginatedOptionsResponse,
} from '../types/catalogue.types.js';

@ApiTags('catalogue-options')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogue/options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Post()
  @RequirePermissions(Permission.CATALOGUE_MANAGE_OPTIONS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new catalogue option (Admin only)' })
  @ApiResponse({ status: 201, description: 'Option created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateOptionDto): Promise<OptionResponse> {
    return this.optionsService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of catalogue options' })
  @ApiResponse({ status: 200, description: 'Paginated list of options.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() query: OptionQueryDto): Promise<PaginatedOptionsResponse> {
    return this.optionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get option details by ID' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Option details found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option not found.' })
  findOne(@Param('id') id: string): Promise<OptionResponse> {
    return this.optionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_OPTIONS)
  @ApiOperation({ summary: 'Update option details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Option updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOptionDto,
  ): Promise<OptionResponse> {
    return this.optionsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_OPTIONS)
  @ApiOperation({
    summary:
      'Update option active status (soft activate/deactivate) (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({
    status: 200,
    description: 'Option status updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Option not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOptionStatusDto,
  ): Promise<OptionResponse> {
    return this.optionsService.updateStatus(id, dto);
  }
}
