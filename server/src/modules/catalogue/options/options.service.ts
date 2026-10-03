import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import {
  calculatePagination,
  createPaginatedResponse,
  isPrismaError,
} from '../../../common/utils/index.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CreateOptionDto } from './dto/create-option.dto.js';
import { UpdateOptionDto } from './dto/update-option.dto.js';
import { UpdateOptionStatusDto } from './dto/update-option-status.dto.js';
import { OptionQueryDto } from './dto/option-query.dto.js';
import {
  formatDecimal,
  OptionResponse,
  PaginatedOptionsResponse,
} from '../types/catalogue.types.js';

@Injectable()
export class OptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Option, optionally linking allergens, dietary tags, and portion charges.
   */
  async create(dto: CreateOptionDto): Promise<OptionResponse> {
    if (dto.costPrice < 0) {
      throw new BadRequestException('Cost price must not be negative');
    }

    // Validate portion sizes exist if provided
    if (dto.portions && dto.portions.length > 0) {
      const portionIds = dto.portions.map((p) => p.portionSizeId);
      const existingPortions = await this.prisma.portionSize.findMany({
        where: { id: { in: portionIds } },
        select: { id: true },
      });
      if (existingPortions.length !== portionIds.length) {
        throw new BadRequestException(
          'One or more portion size IDs are invalid',
        );
      }
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const option = await tx.option.create({
          data: {
            name: dto.name,
            costPrice: new Prisma.Decimal(dto.costPrice),
            allergens: dto.allergenIds?.length
              ? { connect: dto.allergenIds.map((id) => ({ id })) }
              : undefined,
            dietaryTags: dto.dietaryTagIds?.length
              ? { connect: dto.dietaryTagIds.map((id) => ({ id })) }
              : undefined,
          },
        });

        if (dto.portions && dto.portions.length > 0) {
          for (const portion of dto.portions) {
            await tx.optionPortion.create({
              data: {
                optionId: option.id,
                portionSizeId: portion.portionSizeId,
                extraCharge: new Prisma.Decimal(portion.extraCharge),
              },
            });
          }
        }

        return tx.option.findUniqueOrThrow({
          where: { id: option.id },
          include: {
            allergens: true,
            dietaryTags: true,
            optionPortions: {
              include: { portionSize: true },
            },
          },
        });
      });

      return this.mapOptionToResponse(result);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new BadRequestException(
          'One or more referenced entities do not exist',
        );
      }
      throw error;
    }
  }

  /**
   * Find paginated options with server-side pagination and filters.
   */
  async findAll(query: OptionQueryDto): Promise<PaginatedOptionsResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.OptionWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.option.count({ where }),
      this.prisma.option.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          allergens: true,
          dietaryTags: true,
          optionPortions: {
            include: { portionSize: true },
          },
        },
      }),
    ]);

    const formattedData = data.map((item) => this.mapOptionToResponse(item));
    return createPaginatedResponse(formattedData, total, safePage, safeLimit);
  }

  /**
   * Find a single Option by ID.
   */
  async findOne(id: string): Promise<OptionResponse> {
    const option = await this.prisma.option.findUnique({
      where: { id },
      include: {
        allergens: true,
        dietaryTags: true,
        optionPortions: {
          include: { portionSize: true },
        },
      },
    });

    if (!option) {
      throw new NotFoundException(`Option with ID '${id}' not found`);
    }

    return this.mapOptionToResponse(option);
  }

  /**
   * Update an existing Option.
   */
  async update(id: string, dto: UpdateOptionDto): Promise<OptionResponse> {
    await this.findOne(id);

    if (dto.costPrice !== undefined && dto.costPrice < 0) {
      throw new BadRequestException('Cost price must not be negative');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Update basic fields, allergens, and dietary tags
        await tx.option.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.costPrice !== undefined
              ? { costPrice: new Prisma.Decimal(dto.costPrice) }
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
        });

        // Update portions if explicitly provided
        if (dto.portions !== undefined) {
          // Delete existing portion charges
          await tx.optionPortion.deleteMany({
            where: { optionId: id },
          });

          // Insert new portion charges
          for (const portion of dto.portions) {
            await tx.optionPortion.create({
              data: {
                optionId: id,
                portionSizeId: portion.portionSizeId,
                extraCharge: new Prisma.Decimal(portion.extraCharge),
              },
            });
          }
        }

        return tx.option.findUniqueOrThrow({
          where: { id },
          include: {
            allergens: true,
            dietaryTags: true,
            optionPortions: {
              include: { portionSize: true },
            },
          },
        });
      });

      return this.mapOptionToResponse(result);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Option with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Update active status of an option.
   */
  async updateStatus(
    id: string,
    dto: UpdateOptionStatusDto,
  ): Promise<OptionResponse> {
    try {
      const option = await this.prisma.option.update({
        where: { id },
        data: { isActive: dto.isActive },
        include: {
          allergens: true,
          dietaryTags: true,
          optionPortions: {
            include: { portionSize: true },
          },
        },
      });

      return this.mapOptionToResponse(option);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Option with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Deactivate an Option (soft delete).
   */
  async deactivate(id: string): Promise<OptionResponse> {
    return this.updateStatus(id, { isActive: false });
  }

  /**
   * Helper mapping Prisma model to OptionResponse.
   */
  private mapOptionToResponse(
    option: Prisma.OptionGetPayload<{
      include: {
        allergens: true;
        dietaryTags: true;
        optionPortions: { include: { portionSize: true } };
      };
    }>,
  ): OptionResponse {
    return {
      id: option.id,
      name: option.name,
      costPrice: formatDecimal(option.costPrice),
      isActive: option.isActive,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
      allergens: option.allergens,
      dietaryTags: option.dietaryTags,
      portions: option.optionPortions?.map((op) => ({
        id: op.id,
        portionSizeId: op.portionSizeId,
        portionName: op.portionSize.name,
        extraCharge: formatDecimal(op.extraCharge),
      })),
    };
  }
}
