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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
import { PricingService } from './pricing.service.js';
import { PriceResolutionService } from './price-resolution.service.js';
import {
  BulkUpdateTierPricesDto,
  CreatePriceTierDto,
  SetDishPriceDto,
  SetOptionPriceDto,
  TierDishesQueryDto,
  TierQueryDto,
  UpdatePriceTierDto,
} from './dto/index.js';
import {
  BulkUpdateTierPricesResult,
  EffectivePricingContext,
  PaginatedPriceTiersResponse,
  PaginatedTierDishesResponse,
  PaginatedTierOptionsResponse,
  PriceTierResponse,
  ResolvedPriceResult,
  TierDishPriceItem,
  TierOptionPriceItem,
} from './types/pricing.types.js';

@ApiTags('pricing')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly priceResolutionService: PriceResolutionService,
  ) {}

  // ---------------------------------------------------------------------------
  // Price Tier CRUD Endpoints
  // ---------------------------------------------------------------------------

  @Post('tiers')
  @RequirePermissions(Permission.PRICING_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new price tier (Admin only)' })
  @ApiResponse({ status: 201, description: 'Price tier created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid derivation.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 409,
    description: 'Tier with this name already exists.',
  })
  createTier(@Body() dto: CreatePriceTierDto): Promise<PriceTierResponse> {
    return this.pricingService.createTier(dto);
  }

  @Get('tiers')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Get paginated list of price tiers' })
  @ApiResponse({ status: 200, description: 'Paginated list of tiers.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAllTiers(
    @Query() query: TierQueryDto,
  ): Promise<PaginatedPriceTiersResponse> {
    return this.pricingService.findAllTiers(query);
  }

  @Get('tiers/:id')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Get price tier details by ID' })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'Price tier details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  findTierById(@Param('id') id: string): Promise<PriceTierResponse> {
    return this.pricingService.findTierById(id);
  }

  @Patch('tiers/:id')
  @RequirePermissions(Permission.PRICING_UPDATE)
  @ApiOperation({ summary: 'Update price tier configuration (Admin only)' })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'Price tier updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or circular dependency.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  @ApiResponse({ status: 409, description: 'Tier name conflict.' })
  updateTier(
    @Param('id') id: string,
    @Body() dto: UpdatePriceTierDto,
  ): Promise<PriceTierResponse> {
    return this.pricingService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  @RequirePermissions(Permission.PRICING_DELETE)
  @ApiOperation({ summary: 'Delete price tier (Admin only)' })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'Price tier deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete default or referenced tier.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  deleteTier(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.pricingService.deleteTier(id);
  }

  @Patch('tiers/:id/default')
  @RequirePermissions(Permission.PRICING_UPDATE)
  @ApiOperation({ summary: 'Set tier as system default (Admin only)' })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({
    status: 200,
    description: 'Default tier updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot set inactive tier as default.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  setDefaultTier(@Param('id') id: string): Promise<PriceTierResponse> {
    return this.pricingService.setDefaultTier(id);
  }

  // ---------------------------------------------------------------------------
  // Tier Dishes & Overrides Endpoints
  // ---------------------------------------------------------------------------

  @Get('tiers/:id/dishes')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'View whole tier dish pricing and missing status' })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'Paginated tier dishes pricing.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  getTierDishes(
    @Param('id') id: string,
    @Query() query: TierDishesQueryDto,
  ): Promise<PaginatedTierDishesResponse> {
    return this.pricingService.getTierDishes(id, query);
  }

  @Get('tiers/:tierId/missing-dishes')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Identify dishes without valid price on this tier' })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'List of unpriced dishes on tier.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  getMissingDishes(
    @Param('tierId') tierId: string,
    @Query() query: TierDishesQueryDto,
  ): Promise<PaginatedTierDishesResponse> {
    const effectiveQuery = Object.assign(new TierDishesQueryDto(), query);
    effectiveQuery.missingOnly = true;
    return this.pricingService.getTierDishes(tierId, effectiveQuery);
  }

  @Put('tiers/:tierId/dishes/bulk')
  @RequirePermissions(Permission.PRICING_UPDATE)
  @ApiOperation({ summary: 'Bulk update dish prices on a tier (Admin only)' })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiBody({ type: BulkUpdateTierPricesDto })
  @ApiResponse({ status: 200, description: 'Bulk dish prices updated.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Tier or dish not found.' })
  bulkUpdateDishPrices(
    @Param('tierId') tierId: string,
    @Body() dto: BulkUpdateTierPricesDto,
  ): Promise<BulkUpdateTierPricesResult> {
    return this.pricingService.bulkUpdateDishPrices(tierId, dto);
  }

  @Put('tiers/:tierId/dishes/:dishId')
  @RequirePermissions(Permission.PRICING_UPDATE)
  @ApiOperation({
    summary: 'Set or override explicit dish price on tier (Admin only)',
  })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Explicit dish price set.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier or dish not found.' })
  setDishPrice(
    @Param('tierId') tierId: string,
    @Param('dishId') dishId: string,
    @Body() dto: SetDishPriceDto,
  ): Promise<TierDishPriceItem> {
    return this.pricingService.setDishPrice(tierId, dishId, dto);
  }

  @Delete('tiers/:tierId/dishes/:dishId')
  @RequirePermissions(Permission.PRICING_DELETE)
  @ApiOperation({
    summary: 'Remove explicit dish override from tier (Admin only)',
  })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Dish override removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier or dish not found.' })
  removeDishPrice(
    @Param('tierId') tierId: string,
    @Param('dishId') dishId: string,
  ): Promise<TierDishPriceItem> {
    return this.pricingService.removeDishPrice(tierId, dishId);
  }

  // ---------------------------------------------------------------------------
  // Tier Options & Overrides Endpoints
  // ---------------------------------------------------------------------------

  @Get('tiers/:id/options')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({
    summary: 'View whole tier option pricing and missing status',
  })
  @ApiParam({ name: 'id', description: 'Price Tier ID' })
  @ApiResponse({ status: 200, description: 'Paginated tier options pricing.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  getTierOptions(
    @Param('id') id: string,
    @Query() query: TierDishesQueryDto,
  ): Promise<PaginatedTierOptionsResponse> {
    return this.pricingService.getTierOptions(id, query);
  }

  @Get('tiers/:tierId/missing-options')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({
    summary: 'Identify options without valid price on this tier',
  })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiResponse({
    status: 200,
    description: 'List of unpriced options on tier.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  getMissingOptions(
    @Param('tierId') tierId: string,
    @Query() query: TierDishesQueryDto,
  ): Promise<PaginatedTierOptionsResponse> {
    const effectiveQuery = Object.assign(new TierDishesQueryDto(), query);
    effectiveQuery.missingOnly = true;
    return this.pricingService.getTierOptions(tierId, effectiveQuery);
  }

  @Put('tiers/:tierId/options/:optionId')
  @RequirePermissions(Permission.PRICING_UPDATE)
  @ApiOperation({
    summary: 'Set or override explicit option price on tier (Admin only)',
  })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiParam({ name: 'optionId', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Explicit option price set.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier or option not found.' })
  setOptionPrice(
    @Param('tierId') tierId: string,
    @Param('optionId') optionId: string,
    @Body() dto: SetOptionPriceDto,
  ): Promise<TierOptionPriceItem> {
    return this.pricingService.setOptionPrice(tierId, optionId, dto);
  }

  @Delete('tiers/:tierId/options/:optionId')
  @RequirePermissions(Permission.PRICING_DELETE)
  @ApiOperation({
    summary: 'Remove explicit option override from tier (Admin only)',
  })
  @ApiParam({ name: 'tierId', description: 'Price Tier ID' })
  @ApiParam({ name: 'optionId', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Option override removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier or option not found.' })
  removeOptionPrice(
    @Param('tierId') tierId: string,
    @Param('optionId') optionId: string,
  ): Promise<TierOptionPriceItem> {
    return this.pricingService.removeOptionPrice(tierId, optionId);
  }

  // ---------------------------------------------------------------------------
  // Resolution Query Endpoints
  // ---------------------------------------------------------------------------

  @Get('resolve/employee/:employeeId/dish/:dishId')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Resolve effective dish price for an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Resolved price details.' })
  resolveEmployeeDishPrice(
    @Param('employeeId') employeeId: string,
    @Param('dishId') dishId: string,
  ): Promise<ResolvedPriceResult> {
    return this.priceResolutionService.resolveEmployeeDishPrice(
      employeeId,
      dishId,
    );
  }

  @Get('resolve/employee/:employeeId/option/:optionId')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Resolve effective option price for an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiParam({ name: 'optionId', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Resolved option price details.' })
  resolveEmployeeOptionPrice(
    @Param('employeeId') employeeId: string,
    @Param('optionId') optionId: string,
  ): Promise<ResolvedPriceResult> {
    return this.priceResolutionService.resolveEmployeeOptionPrice(
      employeeId,
      optionId,
    );
  }

  @Get('resolve/employee/:employeeId/context')
  @RequirePermissions(Permission.PRICING_READ)
  @ApiOperation({ summary: 'Get employee pricing resolution context' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Effective pricing context.' })
  getEmployeePricingContext(
    @Param('employeeId') employeeId: string,
  ): Promise<EffectivePricingContext> {
    return this.priceResolutionService.getEffectivePricingContext(employeeId);
  }
}
