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
import { Permission } from '../auth/types/permission.enum.js';
import { CompaniesService } from './company.service.js';
import {
  AssignPriceTierDto,
  CompanyQueryDto,
  CreateCompanyDomainDto,
  CreateCompanyDto,
  CreateCompanyHolidayDto,
  CreateDeliveryAddressDto,
  SetCompanyOwnerDto,
  UpdateBillingContactDto,
  UpdateCompanyCalendarDto,
  UpdateCompanyDto,
  UpdateCompanyHolidayDto,
  UpdateDeliveryAddressDto,
  UpdateDeliveryDefaultsDto,
} from './dto/index.js';
import {
  CompanyDetailResponse,
  CompanyDomainResponse,
  CompanyHolidayResponse,
  DeliveryAddressResponse,
  PaginatedCompaniesResponse,
} from './types/company.types.js';

import { EmployeesService } from '../employee/employee.service.js';
import { BulkImportEmployeesDto } from '../employee/dto/bulk-import-employees.dto.js';
import { BulkImportResultResponse } from '../employee/types/employee.types.js';

@ApiTags('companies')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly employeesService: EmployeesService,
  ) { }

  // ----------------------------------------------------
  // Company CRUD
  // ----------------------------------------------------

  @Post()
  @RequirePermissions(Permission.COMPANY_CREATE)
  @ApiOperation({ summary: 'Create a new customer company (Admin only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Company name or domain already exists.' })
  create(@Body() dto: CreateCompanyDto): Promise<CompanyDetailResponse> {
    return this.companiesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.COMPANY_READ)
  @ApiOperation({
    summary:
      'List customer companies with pagination, search, and status filters (Admin, Kitchen, Dispatch)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of companies.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() query: CompanyQueryDto): Promise<PaginatedCompaniesResponse> {
    return this.companiesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.COMPANY_READ)
  @ApiOperation({
    summary:
      'Get company details by ID including addresses, domains, and rules (Admin, Kitchen, Dispatch)',
  })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company detail.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  findById(@Param('id') id: string): Promise<CompanyDetailResponse> {
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update company configuration (Admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COMPANY_DELETE)
  @ApiOperation({ summary: 'Soft-deactivate a company (Admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deactivated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  remove(@Param('id') id: string): Promise<CompanyDetailResponse> {
    return this.companiesService.remove(id);
  }

  // ----------------------------------------------------
  // Email Domains
  // ----------------------------------------------------

  @Post(':companyId/domains')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Add an email domain to a company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Domain added successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid domain format or public provider.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Domain already claimed.' })
  addDomain(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyDomainDto,
  ): Promise<CompanyDomainResponse> {
    return this.companiesService.addDomain(companyId, dto);
  }

  @Delete(':companyId/domains/:domainId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Remove an email domain from a company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'domainId', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Domain removed successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot delete the last domain of active company.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Domain not found.' })
  removeDomain(
    @Param('companyId') companyId: string,
    @Param('domainId') domainId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.removeDomain(companyId, domainId);
  }

  // ----------------------------------------------------
  // Delivery Addresses
  // ----------------------------------------------------

  @Get(':companyId/addresses')
  @RequirePermissions(Permission.COMPANY_READ)
  @ApiOperation({ summary: 'List delivery addresses for a company (Admin, Kitchen, Dispatch)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of delivery addresses.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getAddresses(
    @Param('companyId') companyId: string,
  ): Promise<DeliveryAddressResponse[]> {
    return this.companiesService.getAddresses(companyId);
  }

  @Post(':companyId/addresses')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Add a delivery address for a company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  addAddress(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDeliveryAddressDto,
  ): Promise<DeliveryAddressResponse> {
    return this.companiesService.addAddress(companyId, dto);
  }

  @Patch(':companyId/addresses/:addressId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update a delivery address (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  updateAddress(
    @Param('companyId') companyId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateDeliveryAddressDto,
  ): Promise<DeliveryAddressResponse> {
    return this.companiesService.updateAddress(companyId, addressId, dto);
  }

  @Delete(':companyId/addresses/:addressId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Delete a delivery address (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot delete the last address of active company.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  removeAddress(
    @Param('companyId') companyId: string,
    @Param('addressId') addressId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.removeAddress(companyId, addressId);
  }

  // ----------------------------------------------------
  // Billing Contact
  // ----------------------------------------------------

  @Patch(':companyId/billing-contact')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update company billing contact details (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Billing contact updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  updateBillingContact(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateBillingContactDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.updateBillingContact(companyId, dto);
  }

  // ----------------------------------------------------
  // Company Owner
  // ----------------------------------------------------

  @Patch(':companyId/owner')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Set or change company owner (Admin only - must be company employee)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company owner updated successfully.' })
  @ApiResponse({ status: 400, description: 'Owner must be an employee of the same company.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company or Employee not found.' })
  setOwner(
    @Param('companyId') companyId: string,
    @Body() dto: SetCompanyOwnerDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.setOwner(companyId, dto);
  }

  // ----------------------------------------------------
  // Company Calendar
  // ----------------------------------------------------

  @Patch(':companyId/calendar')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update company delivery calendar working days (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Calendar updated successfully.' })
  @ApiResponse({ status: 400, description: 'Must specify at least one working day.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  updateCalendar(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyCalendarDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.updateCalendar(companyId, dto);
  }

  // ----------------------------------------------------
  // Company Holidays
  // ----------------------------------------------------

  @Get(':companyId/holidays')
  @RequirePermissions(Permission.COMPANY_READ)
  @ApiOperation({ summary: 'List company holidays (Admin, Kitchen, Dispatch)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of company holidays.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getHolidays(
    @Param('companyId') companyId: string,
  ): Promise<CompanyHolidayResponse[]> {
    return this.companiesService.getHolidays(companyId);
  }

  @Post(':companyId/holidays')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Add a holiday for a company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Holiday added successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  @ApiResponse({ status: 409, description: 'Holiday on this date already exists.' })
  addHoliday(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyHolidayDto,
  ): Promise<CompanyHolidayResponse> {
    return this.companiesService.addHoliday(companyId, dto);
  }

  @Patch(':companyId/holidays/:holidayId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update a company holiday (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'holidayId', description: 'Holiday ID' })
  @ApiResponse({ status: 200, description: 'Holiday updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Holiday not found.' })
  @ApiResponse({ status: 409, description: 'Holiday on updated date already exists.' })
  updateHoliday(
    @Param('companyId') companyId: string,
    @Param('holidayId') holidayId: string,
    @Body() dto: UpdateCompanyHolidayDto,
  ): Promise<CompanyHolidayResponse> {
    return this.companiesService.updateHoliday(companyId, holidayId, dto);
  }

  @Delete(':companyId/holidays/:holidayId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Delete a company holiday (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'holidayId', description: 'Holiday ID' })
  @ApiResponse({ status: 200, description: 'Holiday deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Holiday not found.' })
  removeHoliday(
    @Param('companyId') companyId: string,
    @Param('holidayId') holidayId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.removeHoliday(companyId, holidayId);
  }

  // ----------------------------------------------------
  // Delivery Defaults
  // ----------------------------------------------------

  @Patch(':companyId/delivery-defaults')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Update company delivery defaults (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Delivery defaults updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  updateDeliveryDefaults(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateDeliveryDefaultsDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.updateDeliveryDefaults(companyId, dto);
  }

  // ----------------------------------------------------
  // Price Tier
  // ----------------------------------------------------

  @Patch(':companyId/price-tier')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Assign or remove company price tier (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Price tier assigned successfully.' })
  @ApiResponse({ status: 400, description: 'Inactive price tier.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Price tier not found.' })
  assignPriceTier(
    @Param('companyId') companyId: string,
    @Body() dto: AssignPriceTierDto,
  ): Promise<CompanyDetailResponse> {
    return this.companiesService.assignPriceTier(companyId, dto);
  }

  // ----------------------------------------------------
  // Menu Visibility
  // ----------------------------------------------------

  @Post(':companyId/hidden-categories/:categoryId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide a category for this company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category hidden successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company or Category not found.' })
  @ApiResponse({ status: 409, description: 'Category is already hidden for this company.' })
  hideCategory(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.hideCategory(companyId, categoryId);
  }

  @Delete(':companyId/hidden-categories/:categoryId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Unhide a category for this company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category unhidden successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category is not hidden for this company.' })
  unhideCategory(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.unhideCategory(companyId, categoryId);
  }

  @Post(':companyId/hidden-dishes/:dishId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide a dish for this company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Dish hidden successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company or Dish not found.' })
  @ApiResponse({ status: 409, description: 'Dish is already hidden for this company.' })
  hideDish(
    @Param('companyId') companyId: string,
    @Param('dishId') dishId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.hideDish(companyId, dishId);
  }

  @Delete(':companyId/hidden-dishes/:dishId')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  @ApiOperation({ summary: 'Unhide a dish for this company (Admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Dish unhidden successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish is not hidden for this company.' })
  unhideDish(
    @Param('companyId') companyId: string,
    @Param('dishId') dishId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.companiesService.unhideDish(companyId, dishId);
  }

  // ----------------------------------------------------
  // Delivery Availability Verification
  // ----------------------------------------------------

  @Get(':companyId/delivery-availability')
  @RequirePermissions(Permission.COMPANY_READ)
  @ApiOperation({
    summary:
      'Check if delivery is available for this company on a specific date (considers working days and company holidays)',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({
    name: 'date',
    description: 'Target delivery date (YYYY-MM-DD)',
    example: '2026-10-05',
  })
  @ApiResponse({ status: 200, description: 'Delivery availability result.' })
  @ApiResponse({ status: 400, description: 'Invalid date format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  checkDeliveryAvailability(
    @Param('companyId') companyId: string,
    @Query('date') date: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.companiesService.checkDeliveryAvailability(companyId, date);
  }

  // ----------------------------------------------------
  // Bulk CSV Import
  // ----------------------------------------------------

  @Post(':companyId/employees/import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.EMPLOYEE_CREATE)
  @ApiOperation({
    summary:
      'Bulk import employees for a company from CSV (Admin only - row errors isolated)',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Bulk import results.' })
  @ApiResponse({ status: 400, description: 'Invalid CSV header or inactive company.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  bulkImport(
    @Param('companyId') companyId: string,
    @Body() dto: BulkImportEmployeesDto,
  ): Promise<BulkImportResultResponse> {
    return this.employeesService.bulkImport(companyId, dto.csvContent ?? '');
  }
}
