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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator.js';
import { Permission } from '../../auth/types/permission.enum.js';
import { DishesService } from './dishes.service.js';
import { CreateDishDto } from './dto/create-dish.dto.js';
import { UpdateDishDto } from './dto/update-dish.dto.js';
import { UpdateDishStatusDto } from './dto/update-dish-status.dto.js';
import { DishQueryDto } from './dto/dish-query.dto.js';
import {
  DishDetailResponse,
  DishListItemResponse,
  PaginatedDishesResponse,
} from '../types/catalogue.types.js';

@ApiTags('catalogue-dishes')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogue/dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Post()
  @RequirePermissions(Permission.CATALOGUE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new catalogue dish (Admin only)' })
  @ApiResponse({ status: 201, description: 'Dish created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Dish with SKU already exists.' })
  create(@Body() dto: CreateDishDto): Promise<DishListItemResponse> {
    return this.dishesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({ summary: 'Get paginated list of catalogue dishes' })
  @ApiResponse({ status: 200, description: 'Paginated list of dishes.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() query: DishQueryDto): Promise<PaginatedDishesResponse> {
    return this.dishesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CATALOGUE_READ)
  @ApiOperation({
    summary:
      'Get complete dish details including option groups, options, portions',
  })
  @ApiParam({ name: 'id', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Detailed dish configuration.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  findOne(@Param('id') id: string): Promise<DishDetailResponse> {
    return this.dishesService.getDishDetails(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CATALOGUE_UPDATE)
  @ApiOperation({ summary: 'Update dish by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Dish updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  @ApiResponse({ status: 409, description: 'Dish with SKU already exists.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
  ): Promise<DishListItemResponse> {
    return this.dishesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.CATALOGUE_UPDATE)
  @ApiOperation({
    summary:
      'Update dish active status (soft activate/deactivate) (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Dish ID' })
  @ApiResponse({
    status: 200,
    description: 'Dish status updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDishStatusDto,
  ): Promise<DishListItemResponse> {
    return this.dishesService.updateStatus(id, dto);
  }

  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CATALOGUE_MANAGE_IMAGES)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload or replace dish image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, GIF - max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'id', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid image file or type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    return this.dishesService.uploadImage(id, file);
  }

  @Delete(':id/image')
  @RequirePermissions(Permission.CATALOGUE_MANAGE_IMAGES)
  @ApiOperation({ summary: 'Remove dish image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Dish ID' })
  @ApiResponse({ status: 200, description: 'Image removed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Dish not found.' })
  removeImage(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.dishesService.removeImage(id);
  }
}
