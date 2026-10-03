import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import { EmployeesService } from './employee.service.js';
import {
  CreateEmployeeDto,
  EmployeeQueryDto,
  UpdateEmployeeAllergiesDto,
  UpdateEmployeeDietaryTagsDto,
  UpdateEmployeeDto,
  UpdateEmployeePermissionsDto,
  UpdateEmployeePreferencesDto,
} from './dto/index.js';
import {
  EmployeeSummaryResponse,
  PaginatedEmployeesResponse,
} from './types/employee.types.js';

@ApiTags('employees')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  // ----------------------------------------------------
  // Employee CRUD
  // ----------------------------------------------------

  @Post()
  @RequirePermissions(Permission.EMPLOYEE_CREATE)
  @ApiOperation({ summary: 'Create a new customer employee (Admin only)' })
  @ApiResponse({ status: 201, description: 'Employee created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Referenced Company, Allergen, or DietaryTag not found.' })
  @ApiResponse({ status: 409, description: 'Employee email already exists.' })
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeSummaryResponse> {
    return this.employeesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.EMPLOYEE_READ)
  @ApiOperation({
    summary:
      'List customer employees with search, company filter, active status, and pagination (Admin, Kitchen, Dispatch)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of employees.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() query: EmployeeQueryDto): Promise<PaginatedEmployeesResponse> {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.EMPLOYEE_READ)
  @ApiOperation({ summary: 'Get employee details by ID (Admin, Kitchen, Dispatch)' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  findById(@Param('id') id: string): Promise<EmployeeSummaryResponse> {
    return this.employeesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({
    summary:
      'Update employee details or move employee to another company (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee or destination Company not found.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeSummaryResponse> {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.EMPLOYEE_DELETE)
  @ApiOperation({ summary: 'Soft-deactivate an employee account (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee deactivated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  remove(@Param('id') id: string): Promise<EmployeeSummaryResponse> {
    return this.employeesService.remove(id);
  }

  // ----------------------------------------------------
  // Permissions Flags
  // ----------------------------------------------------

  @Patch(':id/permissions')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({
    summary:
      'Update staff-configured employee business permission flags (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee permissions updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeePermissionsDto,
  ): Promise<EmployeeSummaryResponse> {
    return this.employeesService.updatePermissions(id, dto);
  }

  // ----------------------------------------------------
  // Allergies & Dietary Preferences
  // ----------------------------------------------------

  @Patch(':id/preferences')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({
    summary:
      'Update employee allergen and dietary tag preferences together (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee, Allergen, or DietaryTag not found.' })
  updatePreferences(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeePreferencesDto,
  ): Promise<EmployeeSummaryResponse> {
    return this.employeesService.updatePreferences(id, dto);
  }

  @Put(':id/allergies')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({ summary: 'Replace employee allergen preferences (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Allergens updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee or Allergen not found.' })
  updateAllergies(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeAllergiesDto,
  ): Promise<EmployeeSummaryResponse> {
    return this.employeesService.updateAllergies(id, dto);
  }

  @Put(':id/dietary-preferences')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({ summary: 'Replace employee dietary preferences (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Dietary preferences updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee or DietaryTag not found.' })
  updateDietaryPreferences(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDietaryTagsDto,
  ): Promise<EmployeeSummaryResponse> {
    return this.employeesService.updateDietaryTags(id, dto);
  }
}
