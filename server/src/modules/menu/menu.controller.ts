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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import { MenuService } from './menu.service.js';
import {
  AddDishToCategoryDto,
  CategoryQueryDto,
  CreateCategoryDto,
  ReorderCategoriesDto,
  ReorderCategoryDishesDto,
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from './dto/index.js';
import {
  EmployeeMenuCategoryResponse,
  EmployeeMenuResponse,
  MenuCategoryDetailResponse,
  MenuCategoryResponse,
  PaginatedCategoriesResponse,
} from './types/menu.types.js';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ----------------------------------------------------
  // Customer Employee Menu Endpoints (Unauthenticated - Customer Employees have no login accounts)
  // ----------------------------------------------------

  @Get(['employees/:employeeId'])
  @ApiOperation({
    summary:
      'Get effective menu for a customer employee (Customer employees do not have login accounts)',
  })
  @ApiParam({ name: 'employeeId', description: 'Customer Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Effective employee-facing menu.',
  })
  @ApiResponse({
    status: 403,
    description: 'Employee or company is inactive.',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found.',
  })
  getEmployeeMenu(
    @Param('employeeId') employeeId: string,
  ): Promise<EmployeeMenuResponse> {
    return this.menuService.getEffectiveMenuForEmployee(employeeId);
  }

  @Get([
    'employees/:employeeId/categories/:categoryId',
  ])
  @ApiOperation({
    summary:
      'Directly access a category for a customer employee (e.g. secret category accessed via direct link)',
  })
  @ApiParam({ name: 'employeeId', description: 'Customer Employee ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee category with valid priced items.',
  })
  @ApiResponse({
    status: 403,
    description: 'Employee or company is inactive.',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found or hidden from company.',
  })
  getEmployeeCategoryDirect(
    @Param('employeeId') employeeId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<EmployeeMenuCategoryResponse> {
    return this.menuService.getCategoryForEmployee(categoryId, employeeId);
  }

  // ----------------------------------------------------
  // Staff Preview Endpoints (Internal Staff Admin - Authenticated)
  // ----------------------------------------------------

  @Get('preview/employees/:employeeId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_PREVIEW)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Admin preview: view effective menu exactly as a target employee sees it',
  })
  @ApiParam({ name: 'employeeId', description: 'Target Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Target employee menu preview.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  previewEmployeeMenu(
    @Param('employeeId') employeeId: string,
  ): Promise<EmployeeMenuResponse> {
    return this.menuService.getEffectiveMenuForEmployee(employeeId);
  }

  @Get('preview/employees/:employeeId/categories/:categoryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_PREVIEW)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Admin preview: view a direct category exactly as a target employee sees it',
  })
  @ApiParam({ name: 'employeeId', description: 'Target Employee ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Direct category preview for employee.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Category not found or hidden from company.',
  })
  previewEmployeeCategory(
    @Param('employeeId') employeeId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<EmployeeMenuCategoryResponse> {
    return this.menuService.getCategoryForEmployee(categoryId, employeeId);
  }

  // ----------------------------------------------------
  // Staff Category Management Endpoints (Internal Staff - Authenticated)
  // ----------------------------------------------------

  @Post('categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_CREATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 409,
    description: 'Category with name already exists.',
  })
  createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<MenuCategoryResponse> {
    return this.menuService.createCategory(dto);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_READ)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Get paginated list of menu categories for management (Admin, Kitchen, Dispatch)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of menu categories.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findCategories(
    @Query() query: CategoryQueryDto,
  ): Promise<PaginatedCategoriesResponse> {
    return this.menuService.findCategories(query);
  }

  @Patch('categories/reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: 'Reorder menu categories in bulk transactionally (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories reordered successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  reorderCategories(
    @Body() dto: ReorderCategoriesDto,
  ): Promise<MenuCategoryResponse[]> {
    return this.menuService.reorderCategories(dto);
  }

  @Get('categories/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_READ)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Get detailed menu category configuration by ID (Admin, Kitchen, Dispatch)',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category details with assigned dishes.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findCategoryById(
    @Param('id') id: string,
  ): Promise<MenuCategoryDetailResponse> {
    return this.menuService.findCategoryById(id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Update menu category name, displayOrder, or secret status (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({
    status: 409,
    description: 'Category with name already exists.',
  })
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<MenuCategoryResponse> {
    return this.menuService.updateCategory(id, dto);
  }

  @Patch('categories/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary:
      'Update category active status (soft activate/deactivate) (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category status updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  updateCategoryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryStatusDto,
  ): Promise<MenuCategoryResponse> {
    return this.menuService.updateCategoryStatus(id, dto);
  }

  // ----------------------------------------------------
  // Staff Category Dish Assignment Endpoints (Internal Staff - Authenticated)
  // ----------------------------------------------------

  @Post('categories/:categoryId/dishes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a dish to a menu category (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 201,
    description: 'Dish added to category successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or dish inactive.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category or Dish not found.' })
  @ApiResponse({
    status: 409,
    description: 'Dish already in category or display order collision.',
  })
  addDishToCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: AddDishToCategoryDto,
  ): Promise<MenuCategoryDetailResponse> {
    return this.menuService.addDishToCategory(categoryId, dto);
  }

  @Delete('categories/:categoryId/dishes/:dishId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: 'Remove a dish from a menu category (Admin only)',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiResponse({
    status: 200,
    description: 'Dish removed from category successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Dish is not assigned to this category.',
  })
  removeDishFromCategory(
    @Param('categoryId') categoryId: string,
    @Param('dishId') dishId: string,
  ): Promise<{ success: boolean }> {
    return this.menuService.removeDishFromCategory(categoryId, dishId);
  }

  @Patch('categories/:categoryId/dishes/reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_UPDATE)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: 'Reorder dishes inside a category transactionally (Admin only)',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category dishes reordered successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  reorderCategoryDishes(
    @Param('categoryId') categoryId: string,
    @Body() dto: ReorderCategoryDishesDto,
  ): Promise<MenuCategoryDetailResponse> {
    return this.menuService.reorderCategoryDishes(categoryId, dto);
  }

  // ----------------------------------------------------
  // Staff Company Hiding Endpoints (Internal Staff - Authenticated)
  // ----------------------------------------------------

  @Post('categories/:categoryId/hidden-companies/:companyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_MANAGE_VISIBILITY)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide a category from a company (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Category hidden from company successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category or Company not found.' })
  @ApiResponse({
    status: 409,
    description: 'Category is already hidden for this company.',
  })
  hideCategoryForCompany(
    @Param('categoryId') categoryId: string,
    @Param('companyId') companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.menuService.hideCategoryForCompany(categoryId, companyId);
  }

  @Delete('categories/:categoryId/hidden-companies/:companyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_MANAGE_VISIBILITY)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({ summary: 'Unhide a category from a company (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Category unhidden from company successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Category is not hidden for this company.',
  })
  unhideCategoryForCompany(
    @Param('categoryId') categoryId: string,
    @Param('companyId') companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.menuService.unhideCategoryForCompany(categoryId, companyId);
  }

  @Post('dishes/:dishId/hidden-companies/:companyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_MANAGE_VISIBILITY)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide a dish from a company (Admin only)' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Dish hidden from company successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish or Company not found.' })
  @ApiResponse({
    status: 409,
    description: 'Dish is already hidden for this company.',
  })
  hideDishForCompany(
    @Param('dishId') dishId: string,
    @Param('companyId') companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.menuService.hideDishForCompany(dishId, companyId);
  }

  @Delete('dishes/:dishId/hidden-companies/:companyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MENU_MANAGE_VISIBILITY)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({ summary: 'Unhide a dish from a company (Admin only)' })
  @ApiParam({ name: 'dishId', description: 'Dish ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Dish unhidden from company successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Dish is not hidden for this company.',
  })
  unhideDishForCompany(
    @Param('dishId') dishId: string,
    @Param('companyId') companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.menuService.unhideDishForCompany(dishId, companyId);
  }
}
