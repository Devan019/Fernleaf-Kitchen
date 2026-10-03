import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { StorageService } from '../../../common/storage/storage.service.js';
import {
  calculatePagination,
  createPaginatedResponse,
  isPrismaError,
} from '../../../common/utils/index.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CreateDishDto } from './dto/create-dish.dto.js';
import { UpdateDishDto } from './dto/update-dish.dto.js';
import { UpdateDishStatusDto } from './dto/update-dish-status.dto.js';
import { DishQueryDto } from './dto/dish-query.dto.js';
import {
  DishDetailResponse,
  DishListItemResponse,
  formatDecimal,
  PaginatedDishesResponse,
} from '../types/catalogue.types.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class DishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Create a new dish.
   */
  async create(dto: CreateDishDto): Promise<DishListItemResponse> {
    if (dto.costPrice < 0) {
      throw new BadRequestException('Cost price must not be negative');
    }
    if (
      dto.minimumOrderQuantity !== undefined &&
      dto.minimumOrderQuantity <= 0
    ) {
      throw new BadRequestException(
        'Minimum order quantity must be greater than 0',
      );
    }

    if (dto.kitchenStationId) {
      const station = await this.prisma.kitchenStation.findUnique({
        where: { id: dto.kitchenStationId },
      });
      if (!station) {
        throw new NotFoundException(
          `Kitchen station with ID '${dto.kitchenStationId}' not found`,
        );
      }
    }

    try {
      const dish = await this.prisma.dish.create({
        data: {
          name: dto.name,
          description: dto.description,
          sku: dto.sku,
          temperature: dto.temperature,
          costPrice: new Prisma.Decimal(dto.costPrice),
          minimumOrderQuantity: dto.minimumOrderQuantity,
          kitchenStationId: dto.kitchenStationId,
          allergens: dto.allergenIds?.length
            ? { connect: dto.allergenIds.map((id) => ({ id })) }
            : undefined,
          dietaryTags: dto.dietaryTagIds?.length
            ? { connect: dto.dietaryTagIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          kitchenStation: true,
          allergens: true,
          dietaryTags: true,
        },
      });

      return this.mapDishToListItem(dish);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Dish with SKU '${dto.sku}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * List dishes with server-side pagination and filters.
   */
  async findAll(query: DishQueryDto): Promise<PaginatedDishesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.DishWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }
    if (query.kitchenStationId) {
      where.kitchenStationId = query.kitchenStationId;
    }
    if (query.temperature) {
      where.temperature = query.temperature;
    }

    const [total, data] = await Promise.all([
      this.prisma.dish.count({ where }),
      this.prisma.dish.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          kitchenStation: true,
          allergens: true,
          dietaryTags: true,
        },
      }),
    ]);

    const formattedData = data.map((d) => this.mapDishToListItem(d));
    return createPaginatedResponse(formattedData, total, safePage, safeLimit);
  }

  /**
   * Find single dish summary by ID.
   */
  async findOne(id: string): Promise<DishListItemResponse> {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: {
        kitchenStation: true,
        allergens: true,
        dietaryTags: true,
      },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${id}' not found`);
    }

    return this.mapDishToListItem(dish);
  }

  /**
   * Get complete dish details including option groups, options, portions.
   */
  async getDishDetails(id: string): Promise<DishDetailResponse> {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: {
        kitchenStation: true,
        allergens: true,
        dietaryTags: true,
        optionGroups: {
          orderBy: { displayOrder: 'asc' },
          include: {
            optionGroupPortions: {
              orderBy: { displayOrder: 'asc' },
              include: { portionSize: true },
            },
            optionGroupOptions: {
              orderBy: { displayOrder: 'asc' },
              include: {
                option: {
                  include: {
                    allergens: true,
                    dietaryTags: true,
                    optionPortions: {
                      include: { portionSize: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${id}' not found`);
    }

    return {
      ...this.mapDishToListItem(dish),
      optionGroups: dish.optionGroups.map((group) => ({
        id: group.id,
        dishId: group.dishId,
        name: group.name,
        isRequired: group.isRequired,
        displayOrder: group.displayOrder,
        usesPortions: group.usesPortions,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        portions: group.optionGroupPortions.map((ogp) => ({
          id: ogp.id,
          portionSizeId: ogp.portionSizeId,
          name: ogp.portionSize.name,
          displayOrder: ogp.displayOrder,
          isActive: ogp.portionSize.isActive,
        })),
        options: group.optionGroupOptions.map((ogo) => ({
          id: ogo.id,
          optionId: ogo.optionId,
          name: ogo.option.name,
          costPrice: formatDecimal(ogo.option.costPrice),
          displayOrder: ogo.displayOrder,
          isActive: ogo.option.isActive,
          allergens: ogo.option.allergens,
          dietaryTags: ogo.option.dietaryTags,
          portions: ogo.option.optionPortions?.map((op) => ({
            id: op.id,
            portionSizeId: op.portionSizeId,
            portionName: op.portionSize.name,
            extraCharge: formatDecimal(op.extraCharge),
          })),
        })),
      })),
    };
  }

  /**
   * Update dish details.
   */
  async update(id: string, dto: UpdateDishDto): Promise<DishListItemResponse> {
    await this.findOne(id);

    if (dto.costPrice !== undefined && dto.costPrice < 0) {
      throw new BadRequestException('Cost price must not be negative');
    }
    if (
      dto.minimumOrderQuantity !== undefined &&
      dto.minimumOrderQuantity <= 0
    ) {
      throw new BadRequestException(
        'Minimum order quantity must be greater than 0',
      );
    }

    if (dto.kitchenStationId) {
      const station = await this.prisma.kitchenStation.findUnique({
        where: { id: dto.kitchenStationId },
      });
      if (!station) {
        throw new NotFoundException(
          `Kitchen station with ID '${dto.kitchenStationId}' not found`,
        );
      }
    }

    try {
      const dish = await this.prisma.dish.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.temperature !== undefined
            ? { temperature: dto.temperature }
            : {}),
          ...(dto.costPrice !== undefined
            ? { costPrice: new Prisma.Decimal(dto.costPrice) }
            : {}),
          ...(dto.minimumOrderQuantity !== undefined
            ? { minimumOrderQuantity: dto.minimumOrderQuantity }
            : {}),
          ...(dto.kitchenStationId !== undefined
            ? { kitchenStationId: dto.kitchenStationId }
            : {}),
          ...(dto.allergenIds !== undefined
            ? {
                allergens: {
                  set: dto.allergenIds.map((aid) => ({ id: aid })),
                },
              }
            : {}),
          ...(dto.dietaryTagIds !== undefined
            ? {
                dietaryTags: {
                  set: dto.dietaryTagIds.map((did) => ({ id: did })),
                },
              }
            : {}),
        },
        include: {
          kitchenStation: true,
          allergens: true,
          dietaryTags: true,
        },
      });

      return this.mapDishToListItem(dish);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Dish with SKU '${dto.sku}' already exists`,
        );
      }
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Dish with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Update dish active status (soft activation / deactivation).
   */
  async updateStatus(
    id: string,
    dto: UpdateDishStatusDto,
  ): Promise<DishListItemResponse> {
    try {
      const dish = await this.prisma.dish.update({
        where: { id },
        data: { isActive: dto.isActive },
        include: {
          kitchenStation: true,
          allergens: true,
          dietaryTags: true,
        },
      });

      return this.mapDishToListItem(dish);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Dish with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Soft deactivate a dish (dishes are NEVER hard-deleted).
   */
  async deactivate(id: string): Promise<DishListItemResponse> {
    return this.updateStatus(id, { isActive: false });
  }

  /**
   * Upload food image for a dish with R2/S3 storage and safe replacement.
   */
  async uploadImage(
    id: string,
    file?: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      );
    }

    const dish = await this.prisma.dish.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${id}' not found`);
    }

    // Determine extension from MIME type
    const ext = file.mimetype.split('/')[1] || 'webp';
    const objectKey = `catalogue/dishes/${id}/${randomUUID()}.${ext}`;

    // Upload to object storage
    const uploadResult = await this.storageService.upload(
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      },
      objectKey,
    );

    const oldImageUrl = dish.imageUrl;

    try {
      await this.prisma.dish.update({
        where: { id },
        data: { imageUrl: uploadResult.url },
      });
    } catch (error) {
      // If DB update failed, clean up uploaded object to prevent orphaned storage
      await this.storageService.delete(objectKey);
      throw error;
    }

    // If DB update succeeded and old image existed, delete old object safely
    if (oldImageUrl) {
      const oldKey = this.storageService.extractKeyFromUrl(oldImageUrl);
      if (oldKey) {
        try {
          await this.storageService.delete(oldKey);
        } catch {
          // Non-blocking if old image cleanup fails
        }
      }
    }

    return { imageUrl: uploadResult.url };
  }

  /**
   * Remove image from a dish.
   */
  async removeImage(id: string): Promise<{ success: boolean }> {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${id}' not found`);
    }

    if (!dish.imageUrl) {
      return { success: true };
    }

    const oldKey = this.storageService.extractKeyFromUrl(dish.imageUrl);

    await this.prisma.dish.update({
      where: { id },
      data: { imageUrl: null },
    });

    if (oldKey) {
      try {
        await this.storageService.delete(oldKey);
      } catch {
        // Non-blocking
      }
    }

    return { success: true };
  }

  /**
   * Helper mapping Prisma dish to summary response.
   */
  private mapDishToListItem(
    dish: Prisma.DishGetPayload<{
      include: {
        kitchenStation: true;
        allergens: true;
        dietaryTags: true;
      };
    }>,
  ): DishListItemResponse {
    return {
      id: dish.id,
      name: dish.name,
      description: dish.description,
      imageUrl: dish.imageUrl,
      sku: dish.sku,
      temperature: dish.temperature,
      costPrice: formatDecimal(dish.costPrice),
      minimumOrderQuantity: dish.minimumOrderQuantity,
      isActive: dish.isActive,
      kitchenStationId: dish.kitchenStationId,
      kitchenStation: dish.kitchenStation,
      allergens: dish.allergens,
      dietaryTags: dish.dietaryTags,
      createdAt: dish.createdAt,
      updatedAt: dish.updatedAt,
    };
  }
}
