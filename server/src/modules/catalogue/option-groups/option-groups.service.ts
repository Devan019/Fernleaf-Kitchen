import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../../common/utils/index.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CreateOptionGroupDto } from './dto/create-option-group.dto.js';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto.js';
import { AddOptionToGroupDto } from './dto/add-option-to-group.dto.js';
import { ReorderGroupOptionDto } from './dto/reorder-group-option.dto.js';
import { AddPortionToGroupDto } from './dto/add-portion-to-group.dto.js';
import { ReorderGroupPortionDto } from './dto/reorder-group-portion.dto.js';
import {
  formatDecimal,
  OptionGroupResponse,
} from '../types/catalogue.types.js';

@Injectable()
export class OptionGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an OptionGroup belonging to a Dish.
   */
  async create(
    dishId: string,
    dto: CreateOptionGroupDto,
  ): Promise<OptionGroupResponse> {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrderGroup = await this.prisma.optionGroup.findFirst({
        where: { dishId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrderGroup?.displayOrder ?? 0) + 1;
    }

    try {
      const group = await this.prisma.optionGroup.create({
        data: {
          dishId,
          name: dto.name,
          isRequired: dto.isRequired ?? false,
          displayOrder,
          usesPortions: dto.usesPortions ?? false,
        },
      });

      return this.findOne(group.id);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `An option group with display order ${displayOrder} already exists for this dish`,
        );
      }
      throw error;
    }
  }

  /**
   * List all OptionGroups for a Dish.
   */
  async findByDish(dishId: string): Promise<OptionGroupResponse[]> {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
    }

    const groups = await this.prisma.optionGroup.findMany({
      where: { dishId },
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
    });

    return groups.map((g) => this.mapGroupToResponse(g));
  }

  /**
   * Find a single OptionGroup by ID.
   */
  async findOne(id: string): Promise<OptionGroupResponse> {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id },
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
    });

    if (!group) {
      throw new NotFoundException(`Option group with ID '${id}' not found`);
    }

    return this.mapGroupToResponse(group);
  }

  /**
   * Update an OptionGroup.
   */
  async update(
    id: string,
    dto: UpdateOptionGroupDto,
  ): Promise<OptionGroupResponse> {
    const group = await this.findOne(id);

    // If enabling usesPortions, validate existing configuration
    if (dto.usesPortions === true && !group.usesPortions) {
      const validation = await this.validatePortionConfiguration(id);
      if (!validation.valid) {
        throw new BadRequestException(
          `Cannot enable portions for group '${group.name}': not all options support all assigned portions. Details: ${validation.message}`,
        );
      }
    }

    try {
      await this.prisma.optionGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isRequired !== undefined
            ? { isRequired: dto.isRequired }
            : {}),
          ...(dto.displayOrder !== undefined
            ? { displayOrder: dto.displayOrder }
            : {}),
          ...(dto.usesPortions !== undefined
            ? { usesPortions: dto.usesPortions }
            : {}),
        },
      });

      return this.findOne(id);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `An option group with display order ${dto.displayOrder} already exists for this dish`,
        );
      }
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Option group with ID '${id}' not found`);
      }
      throw error;
    }
  }

  /**
   * Remove an OptionGroup.
   */
  async remove(id: string): Promise<{ success: boolean }> {
    await this.findOne(id);

    try {
      await this.prisma.optionGroup.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(`Option group with ID '${id}' not found`);
      }
      throw error;
    }
  }

  // ----------------------------------------------------
  // Group Options Management
  // ----------------------------------------------------

  /**
   * Add an Option to an OptionGroup.
   * Enforces that the option must be active and must support all portions used by the group.
   */
  async addOption(
    optionGroupId: string,
    dto: AddOptionToGroupDto,
  ): Promise<OptionGroupResponse> {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: optionGroupId },
      include: {
        optionGroupPortions: {
          include: { portionSize: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        `Option group with ID '${optionGroupId}' not found`,
      );
    }

    const option = await this.prisma.option.findUnique({
      where: { id: dto.optionId },
      include: { optionPortions: true },
    });

    if (!option) {
      throw new NotFoundException(`Option with ID '${dto.optionId}' not found`);
    }

    if (!option.isActive) {
      throw new BadRequestException(
        `Cannot add inactive option '${option.name}' to option group`,
      );
    }

    // Check duplicate
    const existing = await this.prisma.optionGroupOption.findUnique({
      where: {
        optionGroupId_optionId: {
          optionGroupId,
          optionId: dto.optionId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Option '${option.name}' is already attached to this group`,
      );
    }

    // PORTION BUSINESS RULE:
    // If the group uses portions, EVERY option in that group MUST support every portion size used by the group.
    if (group.usesPortions && group.optionGroupPortions.length > 0) {
      const supportedPortionSizeIds = new Set(
        option.optionPortions.map((op) => op.portionSizeId),
      );

      const missingPortions = group.optionGroupPortions.filter(
        (p) => !supportedPortionSizeIds.has(p.portionSizeId),
      );

      if (missingPortions.length > 0) {
        const missingNames = missingPortions
          .map((p) => p.portionSize.name)
          .join(', ');
        throw new BadRequestException(
          `Option '${option.name}' does not support all portion sizes required by this group: [${missingNames}]`,
        );
      }
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.optionGroupOption.findFirst({
        where: { optionGroupId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder ?? 0) + 1;
    }

    try {
      await this.prisma.optionGroupOption.create({
        data: {
          optionGroupId,
          optionId: dto.optionId,
          displayOrder,
        },
      });

      return this.findOne(optionGroupId);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Display order ${displayOrder} is already in use within this option group`,
        );
      }
      throw error;
    }
  }

  /**
   * Remove an Option from an OptionGroup.
   */
  async removeOption(
    optionGroupId: string,
    optionId: string,
  ): Promise<OptionGroupResponse> {
    await this.findOne(optionGroupId);

    const groupOption = await this.prisma.optionGroupOption.findUnique({
      where: {
        optionGroupId_optionId: {
          optionGroupId,
          optionId,
        },
      },
    });

    if (!groupOption) {
      throw new NotFoundException(
        `Option with ID '${optionId}' is not attached to group '${optionGroupId}'`,
      );
    }

    await this.prisma.optionGroupOption.delete({
      where: { id: groupOption.id },
    });

    return this.findOne(optionGroupId);
  }

  /**
   * Reorder options in an OptionGroup.
   */
  async reorderOptions(
    optionGroupId: string,
    dto: ReorderGroupOptionDto,
  ): Promise<OptionGroupResponse> {
    await this.findOne(optionGroupId);

    const existingOptions = await this.prisma.optionGroupOption.findMany({
      where: { optionGroupId },
      select: { optionId: true },
    });

    const existingIds = new Set(existingOptions.map((o) => o.optionId));
    if (
      dto.orderedOptionIds.length !== existingIds.size ||
      !dto.orderedOptionIds.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        'The orderedOptionIds array must contain exactly all existing option IDs in this group',
      );
    }

    // Two-step transaction to avoid unique constraint collisions
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily set displayOrder to negative numbers
      for (let i = 0; i < dto.orderedOptionIds.length; i++) {
        const optionId = dto.orderedOptionIds[i];
        await tx.optionGroupOption.update({
          where: {
            optionGroupId_optionId: {
              optionGroupId,
              optionId,
            },
          },
          data: { displayOrder: -(i + 1) },
        });
      }

      // Step 2: Set to target positive displayOrder (1-indexed)
      for (let i = 0; i < dto.orderedOptionIds.length; i++) {
        const optionId = dto.orderedOptionIds[i];
        await tx.optionGroupOption.update({
          where: {
            optionGroupId_optionId: {
              optionGroupId,
              optionId,
            },
          },
          data: { displayOrder: i + 1 },
        });
      }
    });

    return this.findOne(optionGroupId);
  }

  // ----------------------------------------------------
  // Group Portions Management
  // ----------------------------------------------------

  /**
   * Add a PortionSize to an OptionGroup.
   * Enforces that all existing options in this group must already support this portion size.
   */
  async addPortion(
    optionGroupId: string,
    dto: AddPortionToGroupDto,
  ): Promise<OptionGroupResponse> {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: optionGroupId },
      include: {
        optionGroupOptions: {
          include: {
            option: {
              include: { optionPortions: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        `Option group with ID '${optionGroupId}' not found`,
      );
    }

    const portionSize = await this.prisma.portionSize.findUnique({
      where: { id: dto.portionSizeId },
    });

    if (!portionSize) {
      throw new NotFoundException(
        `Portion size with ID '${dto.portionSizeId}' not found`,
      );
    }

    if (!portionSize.isActive) {
      throw new BadRequestException(
        `Cannot add inactive portion size '${portionSize.name}' to option group`,
      );
    }

    // Check duplicate
    const existing = await this.prisma.optionGroupPortion.findUnique({
      where: {
        optionGroupId_portionSizeId: {
          optionGroupId,
          portionSizeId: dto.portionSizeId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Portion size '${portionSize.name}' is already attached to this group`,
      );
    }

    // PORTION BUSINESS RULE:
    // If the group uses portions and already has options, EVERY option must support this portion size!
    if (group.usesPortions && group.optionGroupOptions.length > 0) {
      const unsupportedOptions = group.optionGroupOptions.filter((ogo) => {
        return !ogo.option.optionPortions.some(
          (op) => op.portionSizeId === dto.portionSizeId,
        );
      });

      if (unsupportedOptions.length > 0) {
        const optionNames = unsupportedOptions
          .map((o) => o.option.name)
          .join(', ');
        throw new BadRequestException(
          `Cannot add portion size '${portionSize.name}': the following options in this group do not support it: [${optionNames}]`,
        );
      }
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.optionGroupPortion.findFirst({
        where: { optionGroupId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder ?? 0) + 1;
    }

    try {
      await this.prisma.optionGroupPortion.create({
        data: {
          optionGroupId,
          portionSizeId: dto.portionSizeId,
          displayOrder,
        },
      });

      return this.findOne(optionGroupId);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Display order ${displayOrder} is already in use for portions in this group`,
        );
      }
      throw error;
    }
  }

  /**
   * Remove a PortionSize from an OptionGroup.
   */
  async removePortion(
    optionGroupId: string,
    portionId: string,
  ): Promise<OptionGroupResponse> {
    await this.findOne(optionGroupId);

    const groupPortion = await this.prisma.optionGroupPortion.findFirst({
      where: {
        optionGroupId,
        OR: [{ id: portionId }, { portionSizeId: portionId }],
      },
    });

    if (!groupPortion) {
      throw new NotFoundException(
        `Portion size '${portionId}' is not attached to group '${optionGroupId}'`,
      );
    }

    await this.prisma.optionGroupPortion.delete({
      where: { id: groupPortion.id },
    });

    return this.findOne(optionGroupId);
  }

  /**
   * Reorder portions in an OptionGroup.
   */
  async reorderPortions(
    optionGroupId: string,
    dto: ReorderGroupPortionDto,
  ): Promise<OptionGroupResponse> {
    await this.findOne(optionGroupId);

    const existingPortions = await this.prisma.optionGroupPortion.findMany({
      where: { optionGroupId },
      select: { portionSizeId: true },
    });

    const existingIds = new Set(existingPortions.map((p) => p.portionSizeId));
    if (
      dto.orderedPortionSizeIds.length !== existingIds.size ||
      !dto.orderedPortionSizeIds.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        'The orderedPortionSizeIds array must contain exactly all existing portion size IDs in this group',
      );
    }

    // Two-step transaction to avoid unique constraint collisions
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily set displayOrder to negative numbers
      for (let i = 0; i < dto.orderedPortionSizeIds.length; i++) {
        const portionSizeId = dto.orderedPortionSizeIds[i];
        await tx.optionGroupPortion.update({
          where: {
            optionGroupId_portionSizeId: {
              optionGroupId,
              portionSizeId,
            },
          },
          data: { displayOrder: -(i + 1) },
        });
      }

      // Step 2: Set to target positive displayOrder (1-indexed)
      for (let i = 0; i < dto.orderedPortionSizeIds.length; i++) {
        const portionSizeId = dto.orderedPortionSizeIds[i];
        await tx.optionGroupPortion.update({
          where: {
            optionGroupId_portionSizeId: {
              optionGroupId,
              portionSizeId,
            },
          },
          data: { displayOrder: i + 1 },
        });
      }
    });

    return this.findOne(optionGroupId);
  }

  /**
   * Validates whether every option in the group supports every portion size attached to the group.
   */
  async validatePortionConfiguration(
    optionGroupId: string,
  ): Promise<{ valid: boolean; message?: string }> {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: optionGroupId },
      include: {
        optionGroupPortions: {
          include: { portionSize: true },
        },
        optionGroupOptions: {
          include: {
            option: {
              include: { optionPortions: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        `Option group with ID '${optionGroupId}' not found`,
      );
    }

    if (!group.usesPortions) {
      return { valid: true };
    }

    const groupPortions = group.optionGroupPortions;
    const groupOptions = group.optionGroupOptions;

    if (groupPortions.length === 0 || groupOptions.length === 0) {
      return { valid: true };
    }

    const missingDetails: string[] = [];

    for (const { option } of groupOptions) {
      const supportedPortionIds = new Set(
        option.optionPortions.map((op) => op.portionSizeId),
      );
      const unsupported = groupPortions.filter(
        (p) => !supportedPortionIds.has(p.portionSizeId),
      );
      if (unsupported.length > 0) {
        const missingNames = unsupported
          .map((u) => u.portionSize.name)
          .join(', ');
        missingDetails.push(
          `Option '${option.name}' missing support for [${missingNames}]`,
        );
      }
    }

    if (missingDetails.length > 0) {
      return {
        valid: false,
        message: missingDetails.join('; '),
      };
    }

    return { valid: true };
  }

  /**
   * Helper mapping Prisma model to OptionGroupResponse.
   */
  private mapGroupToResponse(
    group: Prisma.OptionGroupGetPayload<{
      include: {
        optionGroupPortions: { include: { portionSize: true } };
        optionGroupOptions: {
          include: {
            option: {
              include: {
                allergens: true;
                dietaryTags: true;
                optionPortions: { include: { portionSize: true } };
              };
            };
          };
        };
      };
    }>,
  ): OptionGroupResponse {
    return {
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
    };
  }
}
