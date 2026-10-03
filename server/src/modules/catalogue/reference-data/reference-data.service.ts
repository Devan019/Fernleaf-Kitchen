import {
  ConflictException,
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

@Injectable()
export class ReferenceDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------
  // Allergens
  // ----------------------------------------------------

  async createAllergen(dto: CreateAllergenDto): Promise<AllergenResponse> {
    try {
      return await this.prisma.allergen.create({
        data: { name: dto.name },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Allergen with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async listAllergens(
    query: ReferenceQueryDto,
  ): Promise<PaginatedAllergensResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.AllergenWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.allergen.count({ where }),
      this.prisma.allergen.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  async updateAllergen(
    id: string,
    dto: UpdateAllergenDto,
  ): Promise<AllergenResponse> {
    try {
      return await this.prisma.allergen.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Allergen with ID '${id}' not found`);
      }
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Allergen with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async deactivateAllergen(id: string): Promise<AllergenResponse> {
    return this.updateAllergen(id, { isActive: false });
  }

  // ----------------------------------------------------
  // Dietary Tags
  // ----------------------------------------------------

  async createDietaryTag(
    dto: CreateDietaryTagDto,
  ): Promise<DietaryTagResponse> {
    try {
      return await this.prisma.dietaryTag.create({
        data: { name: dto.name },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Dietary tag with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async listDietaryTags(
    query: ReferenceQueryDto,
  ): Promise<PaginatedDietaryTagsResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.DietaryTagWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.dietaryTag.count({ where }),
      this.prisma.dietaryTag.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  async updateDietaryTag(
    id: string,
    dto: UpdateDietaryTagDto,
  ): Promise<DietaryTagResponse> {
    try {
      return await this.prisma.dietaryTag.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Dietary tag with ID '${id}' not found`);
      }
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Dietary tag with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async deactivateDietaryTag(id: string): Promise<DietaryTagResponse> {
    return this.updateDietaryTag(id, { isActive: false });
  }

  // ----------------------------------------------------
  // Kitchen Stations
  // ----------------------------------------------------

  async createKitchenStation(
    dto: CreateKitchenStationDto,
  ): Promise<KitchenStationResponse> {
    try {
      return await this.prisma.kitchenStation.create({
        data: { name: dto.name },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Kitchen station with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async listKitchenStations(
    query: ReferenceQueryDto,
  ): Promise<PaginatedKitchenStationsResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.KitchenStationWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.kitchenStation.count({ where }),
      this.prisma.kitchenStation.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  async updateKitchenStation(
    id: string,
    dto: UpdateKitchenStationDto,
  ): Promise<KitchenStationResponse> {
    try {
      return await this.prisma.kitchenStation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(
          `Kitchen station with ID '${id}' not found`,
        );
      }
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Kitchen station with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async deactivateKitchenStation(id: string): Promise<KitchenStationResponse> {
    return this.updateKitchenStation(id, { isActive: false });
  }

  // ----------------------------------------------------
  // Portion Sizes
  // ----------------------------------------------------

  async createPortionSize(
    dto: CreatePortionSizeDto,
  ): Promise<PortionSizeResponse> {
    try {
      return await this.prisma.portionSize.create({
        data: { name: dto.name },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Portion size with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async listPortionSizes(
    query: ReferenceQueryDto,
  ): Promise<PaginatedPortionSizesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: Prisma.PortionSizeWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.portionSize.count({ where }),
      this.prisma.portionSize.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  async updatePortionSize(
    id: string,
    dto: UpdatePortionSizeDto,
  ): Promise<PortionSizeResponse> {
    try {
      return await this.prisma.portionSize.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Portion size with ID '${id}' not found`);
      }
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Portion size with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  async deactivatePortionSize(id: string): Promise<PortionSizeResponse> {
    return this.updatePortionSize(id, { isActive: false });
  }
}
