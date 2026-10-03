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
import { ReferenceDataService } from './reference-data.service.js';
import { CreateAllergenDto } from './dto/create-allergen.dto.js';
import { UpdateAllergenDto } from './dto/update-allergen.dto.js';
import { CreateDietaryTagDto } from './dto/create-dietary-tag.dto.js';
import { UpdateDietaryTagDto } from './dto/update-dietary-tag.dto.js';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto.js';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto.js';
import { CreatePortionSizeDto } from './dto/create-portion-size.dto.js';
import { UpdatePortionSizeDto } from './dto/update-portion-size.dto.js';
import { ReferenceQueryDto } from './dto/reference-query.dto.js';
import {
  AllergenResponse,
  DietaryTagResponse,
  KitchenStationResponse,
  PaginatedAllergensResponse,
  PaginatedDietaryTagsResponse,
  PaginatedKitchenStationsResponse,
  PaginatedPortionSizesResponse,
  PortionSizeResponse,
} from '../types/catalogue.types.js';

@ApiTags('catalogue-reference-data')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogue')
export class ReferenceDataController {
  constructor(private readonly referenceService: ReferenceDataService) {}

  // ----------------------------------------------------
  // Allergens
  // ----------------------------------------------------

  @Get('allergens')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of allergens' })
  @ApiResponse({ status: 200, description: 'Paginated list of allergens.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  listAllergens(
    @Query() query: ReferenceQueryDto,
  ): Promise<PaginatedAllergensResponse> {
    return this.referenceService.listAllergens(query);
  }

  @Post('allergens')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new allergen (Admin only)' })
  @ApiResponse({ status: 201, description: 'Allergen created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Allergen name already exists.' })
  createAllergen(@Body() dto: CreateAllergenDto): Promise<AllergenResponse> {
    return this.referenceService.createAllergen(dto);
  }

  @Patch('allergens/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @ApiOperation({ summary: 'Update or deactivate allergen by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Allergen ID' })
  @ApiResponse({ status: 200, description: 'Allergen updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Allergen not found.' })
  @ApiResponse({ status: 409, description: 'Allergen name already exists.' })
  updateAllergen(
    @Param('id') id: string,
    @Body() dto: UpdateAllergenDto,
  ): Promise<AllergenResponse> {
    return this.referenceService.updateAllergen(id, dto);
  }

  // ----------------------------------------------------
  // Dietary Tags
  // ----------------------------------------------------

  @Get('dietary-tags')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of dietary tags (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of dietary tags.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  listDietaryTags(
    @Query() query: ReferenceQueryDto,
  ): Promise<PaginatedDietaryTagsResponse> {
    return this.referenceService.listDietaryTags(query);
  }

  @Post('dietary-tags')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dietary tag (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Dietary tag created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Dietary tag name already exists.' })
  createDietaryTag(
    @Body() dto: CreateDietaryTagDto,
  ): Promise<DietaryTagResponse> {
    return this.referenceService.createDietaryTag(dto);
  }

  @Patch('dietary-tags/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @ApiOperation({
    summary: 'Update or deactivate dietary tag by ID (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Dietary Tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Dietary tag updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dietary tag not found.' })
  @ApiResponse({ status: 409, description: 'Dietary tag name already exists.' })
  updateDietaryTag(
    @Param('id') id: string,
    @Body() dto: UpdateDietaryTagDto,
  ): Promise<DietaryTagResponse> {
    return this.referenceService.updateDietaryTag(id, dto);
  }

  // ----------------------------------------------------
  // Kitchen Stations
  // ----------------------------------------------------

  @Get('kitchen-stations')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of kitchen stations' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of kitchen stations.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  listKitchenStations(
    @Query() query: ReferenceQueryDto,
  ): Promise<PaginatedKitchenStationsResponse> {
    return this.referenceService.listKitchenStations(query);
  }

  @Post('kitchen-stations')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new kitchen station (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Kitchen station created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 409,
    description: 'Kitchen station name already exists.',
  })
  createKitchenStation(
    @Body() dto: CreateKitchenStationDto,
  ): Promise<KitchenStationResponse> {
    return this.referenceService.createKitchenStation(dto);
  }

  @Patch('kitchen-stations/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @ApiOperation({
    summary: 'Update or deactivate kitchen station by ID (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Kitchen Station ID' })
  @ApiResponse({
    status: 200,
    description: 'Kitchen station updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Kitchen station not found.' })
  @ApiResponse({
    status: 409,
    description: 'Kitchen station name already exists.',
  })
  updateKitchenStation(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenStationDto,
  ): Promise<KitchenStationResponse> {
    return this.referenceService.updateKitchenStation(id, dto);
  }

  // ----------------------------------------------------
  // Portion Sizes
  // ----------------------------------------------------

  @Get('portion-sizes')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of portion sizes' })
  @ApiResponse({ status: 200, description: 'Paginated list of portion sizes.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  listPortionSizes(
    @Query() query: ReferenceQueryDto,
  ): Promise<PaginatedPortionSizesResponse> {
    return this.referenceService.listPortionSizes(query);
  }

  @Post('portion-sizes')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new portion size (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Portion size created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 409,
    description: 'Portion size name already exists.',
  })
  createPortionSize(
    @Body() dto: CreatePortionSizeDto,
  ): Promise<PortionSizeResponse> {
    return this.referenceService.createPortionSize(dto);
  }

  @Patch('portion-sizes/:id')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_REFERENCE_DATA)
  @ApiOperation({
    summary: 'Update or deactivate portion size by ID (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Portion Size ID' })
  @ApiResponse({
    status: 200,
    description: 'Portion size updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Portion size not found.' })
  @ApiResponse({
    status: 409,
    description: 'Portion size name already exists.',
  })
  updatePortionSize(
    @Param('id') id: string,
    @Body() dto: UpdatePortionSizeDto,
  ): Promise<PortionSizeResponse> {
    return this.referenceService.updatePortionSize(id, dto);
  }
}
