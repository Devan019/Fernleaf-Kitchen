import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/pagination.js';
import { PricingService } from '../pricing/pricing.service.js';
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
  CategoryDishItemResponse,
  EmployeeMenuCategoryResponse,
  EmployeeMenuItemResponse,
  EmployeeMenuResponse,
  MenuCategoryDetailResponse,
  MenuCategoryResponse,
  PaginatedCategoriesResponse,
} from './types/menu.types.js';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  // ----------------------------------------------------
  // Category Management CRUD & Status
  // ----------------------------------------------------

  /**
   * Create a new MenuCategory.
   */
  async createCategory(dto: CreateCategoryDto): Promise<MenuCategoryResponse> {
    const existing = await this.prisma.menuCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Category with name '${dto.name}' already exists`,
      );
    }

    try {
      const category = await this.prisma.menuCategory.create({
        data: {
          name: dto.name,
          displayOrder: dto.displayOrder,
          isSecret: dto.isSecret ?? false,
          isActive: true,
        },
      });

      return {
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        isSecret: category.isSecret,
        itemsCount: 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * List categories for administration with pagination and filtering.
   */
  async findCategories(
    query: CategoryQueryDto,
  ): Promise<PaginatedCategoriesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where = {
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.isSecret !== undefined ? { isSecret: query.isSecret } : {}),
    };

    const [total, categories] = await Promise.all([
      this.prisma.menuCategory.count({ where }),
      this.prisma.menuCategory.findMany({
        where,
        skip,
        take,
        orderBy: { displayOrder: 'asc' },
        include: {
          _count: {
            select: { categoryDishes: true },
          },
        },
      }),
    ]);

    const data: MenuCategoryResponse[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      isSecret: cat.isSecret,
      itemsCount: cat._count.categoryDishes,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  /**
   * Get detailed category information by ID.
   */
  async findCategoryById(id: string): Promise<MenuCategoryDetailResponse> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      include: {
        categoryDishes: {
          orderBy: { displayOrder: 'asc' },
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                sku: true,
                temperature: true,
                isActive: true,
                imageUrl: true,
              },
            },
          },
        },
        companyHiddenCategories: {
          select: { companyId: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const items: CategoryDishItemResponse[] = (
      category.categoryDishes ?? []
    ).map((cd) => ({
      id: cd.id,
      dishId: cd.dishId,
      displayOrder: cd.displayOrder,
      dish: cd.dish,
    }));

    return {
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      isSecret: category.isSecret,
      items,
      hiddenCompanyIds: (category.companyHiddenCategories ?? []).map(
        (hc) => hc.companyId,
      ),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Update category fields (name, displayOrder, isSecret).
   */
  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<MenuCategoryResponse> {
    const existing = await this.prisma.menuCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.menuCategory.findUnique({
        where: { name: dto.name },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists`,
        );
      }
    }

    try {
      const updated = await this.prisma.menuCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.displayOrder !== undefined
            ? { displayOrder: dto.displayOrder }
            : {}),
          ...(dto.isSecret !== undefined ? { isSecret: dto.isSecret } : {}),
        },
        include: {
          _count: {
            select: { categoryDishes: true },
          },
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        displayOrder: updated.displayOrder,
        isActive: updated.isActive,
        isSecret: updated.isSecret,
        itemsCount: updated._count.categoryDishes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Category with name '${dto.name}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Update category active status (soft activate/deactivate).
   */
  async updateCategoryStatus(
    id: string,
    dto: UpdateCategoryStatusDto,
  ): Promise<MenuCategoryResponse> {
    const existing = await this.prisma.menuCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const updated = await this.prisma.menuCategory.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: {
        _count: {
          select: { categoryDishes: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
      isSecret: updated.isSecret,
      itemsCount: updated._count.categoryDishes,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Reorder categories in bulk transactionally.
   */
  async reorderCategories(
    dto: ReorderCategoriesDto,
  ): Promise<MenuCategoryResponse[]> {
    const categoryIds = dto.categories.map((c) => c.categoryId);
    const existing = await this.prisma.menuCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    if (existing.length !== categoryIds.length) {
      throw new BadRequestException('One or more category IDs are invalid');
    }

    // Check for duplicate category IDs or display orders in input
    const uniqueIds = new Set(categoryIds);
    if (uniqueIds.size !== categoryIds.length) {
      throw new BadRequestException('Duplicate category IDs provided');
    }

    const uniqueOrders = new Set(dto.categories.map((c) => c.displayOrder));
    if (uniqueOrders.size !== dto.categories.length) {
      throw new BadRequestException('Duplicate display orders provided');
    }

    await this.prisma.$transaction(
      dto.categories.map((item) =>
        this.prisma.menuCategory.update({
          where: { id: item.categoryId },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    const updatedList = await this.prisma.menuCategory.findMany({
      where: { id: { in: categoryIds } },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { categoryDishes: true },
        },
      },
    });

    return updatedList.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      isSecret: cat.isSecret,
      itemsCount: cat._count.categoryDishes,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  // ----------------------------------------------------
  // Category Dish Management
  // ----------------------------------------------------

  /**
   * Add a dish to a category.
   */
  async addDishToCategory(
    categoryId: string,
    dto: AddDishToCategoryDto,
  ): Promise<MenuCategoryDetailResponse> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }

    const dish = await this.prisma.dish.findUnique({
      where: { id: dto.dishId },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dto.dishId}' not found`);
    }

    if (!dish.isActive) {
      throw new BadRequestException(
        `Cannot add inactive dish '${dish.name}' to menu category`,
      );
    }

    // Check if dish already exists in category
    const existingAssignment = await this.prisma.categoryDish.findUnique({
      where: {
        categoryId_dishId: {
          categoryId,
          dishId: dto.dishId,
        },
      },
    });
    if (existingAssignment) {
      throw new ConflictException(
        `Dish '${dish.name}' is already assigned to this category`,
      );
    }

    // Check if display order is already taken
    const existingOrder = await this.prisma.categoryDish.findUnique({
      where: {
        categoryId_displayOrder: {
          categoryId,
          displayOrder: dto.displayOrder,
        },
      },
    });
    if (existingOrder) {
      throw new ConflictException(
        `A dish with display order ${dto.displayOrder} already exists in this category`,
      );
    }

    try {
      await this.prisma.categoryDish.create({
        data: {
          categoryId,
          dishId: dto.dishId,
          displayOrder: dto.displayOrder,
        },
      });

      return this.findCategoryById(categoryId);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Dish assignment or display order conflict in this category',
        );
      }
      throw error;
    }
  }

  /**
   * Remove a dish from a category and re-sequence remaining dish display orders.
   */
  async removeDishFromCategory(
    categoryId: string,
    dishId: string,
  ): Promise<{ success: boolean }> {
    const assignment = await this.prisma.categoryDish.findUnique({
      where: {
        categoryId_dishId: {
          categoryId,
          dishId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Dish with ID '${dishId}' is not assigned to category '${categoryId}'`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete target assignment
      await tx.categoryDish.delete({
        where: {
          categoryId_dishId: {
            categoryId,
            dishId,
          },
        },
      });

      // Re-sequence remaining items to 1-indexed contiguous order
      const remaining = await tx.categoryDish.findMany({
        where: { categoryId },
        orderBy: { displayOrder: 'asc' },
      });

      // Use two-step negative order to prevent collision during re-indexing
      for (let i = 0; i < remaining.length; i++) {
        await tx.categoryDish.update({
          where: { id: remaining[i].id },
          data: { displayOrder: -(i + 1) },
        });
      }

      for (let i = 0; i < remaining.length; i++) {
        await tx.categoryDish.update({
          where: { id: remaining[i].id },
          data: { displayOrder: i + 1 },
        });
      }
    });

    return { success: true };
  }

  /**
   * Reorder dishes within a category using a two-step transaction.
   */
  async reorderCategoryDishes(
    categoryId: string,
    dto: ReorderCategoryDishesDto,
  ): Promise<MenuCategoryDetailResponse> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }

    const existingDishes = await this.prisma.categoryDish.findMany({
      where: { categoryId },
      select: { dishId: true },
    });

    const existingDishIds = new Set(existingDishes.map((cd) => cd.dishId));
    if (
      dto.items.length !== existingDishIds.size ||
      !dto.items.every((item) => existingDishIds.has(item.dishId))
    ) {
      throw new BadRequestException(
        'The items array must contain exactly all existing dishes assigned to this category',
      );
    }

    const uniqueOrders = new Set(dto.items.map((i) => i.displayOrder));
    if (uniqueOrders.size !== dto.items.length) {
      throw new BadRequestException('Display orders must be unique');
    }

    // Two-step transaction to prevent unique constraint collisions on [categoryId, displayOrder]
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily set displayOrder to negative numbers
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        await tx.categoryDish.update({
          where: {
            categoryId_dishId: {
              categoryId,
              dishId: item.dishId,
            },
          },
          data: { displayOrder: -(i + 1) },
        });
      }

      // Step 2: Set to target positive displayOrder
      for (const item of dto.items) {
        await tx.categoryDish.update({
          where: {
            categoryId_dishId: {
              categoryId,
              dishId: item.dishId,
            },
          },
          data: { displayOrder: item.displayOrder },
        });
      }
    });

    return this.findCategoryById(categoryId);
  }

  // ----------------------------------------------------
  // Company-Specific Category & Dish Hiding
  // ----------------------------------------------------

  /**
   * Hide a category from a specific company.
   */
  async hideCategoryForCompany(
    categoryId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    const [category, company] = await Promise.all([
      this.prisma.menuCategory.findUnique({ where: { id: categoryId } }),
      this.prisma.company.findUnique({ where: { id: companyId } }),
    ]);

    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const existing = await this.prisma.companyHiddenCategory.findUnique({
      where: {
        companyId_categoryId: {
          companyId,
          categoryId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Category '${category.name}' is already hidden for company '${company.name}'`,
      );
    }

    try {
      await this.prisma.companyHiddenCategory.create({
        data: {
          companyId,
          categoryId,
        },
      });

      return { success: true, message: 'Category hidden for company' };
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Category is already hidden for this company',
        );
      }
      throw error;
    }
  }

  /**
   * Unhide a category from a specific company.
   */
  async unhideCategoryForCompany(
    categoryId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.companyHiddenCategory.findUnique({
      where: {
        companyId_categoryId: {
          companyId,
          categoryId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Category is not hidden for company with ID '${companyId}'`,
      );
    }

    await this.prisma.companyHiddenCategory.delete({
      where: {
        companyId_categoryId: {
          companyId,
          categoryId,
        },
      },
    });

    return { success: true, message: 'Category unhidden for company' };
  }

  /**
   * Hide a dish from a specific company.
   */
  async hideDishForCompany(
    dishId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    const [dish, company] = await Promise.all([
      this.prisma.dish.findUnique({ where: { id: dishId } }),
      this.prisma.company.findUnique({ where: { id: companyId } }),
    ]);

    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
    }
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const existing = await this.prisma.companyHiddenDish.findUnique({
      where: {
        companyId_dishId: {
          companyId,
          dishId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Dish '${dish.name}' is already hidden for company '${company.name}'`,
      );
    }

    try {
      await this.prisma.companyHiddenDish.create({
        data: {
          companyId,
          dishId,
        },
      });

      return { success: true, message: 'Dish hidden for company' };
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Dish is already hidden for this company');
      }
      throw error;
    }
  }

  /**
   * Unhide a dish from a specific company.
   */
  async unhideDishForCompany(
    dishId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.companyHiddenDish.findUnique({
      where: {
        companyId_dishId: {
          companyId,
          dishId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Dish is not hidden for company with ID '${companyId}'`,
      );
    }

    await this.prisma.companyHiddenDish.delete({
      where: {
        companyId_dishId: {
          companyId,
          dishId,
        },
      },
    });

    return { success: true, message: 'Dish unhidden for company' };
  }

  // ----------------------------------------------------
  // Single Source of Truth: Effective Menu Resolution
  // ----------------------------------------------------

  /**
   * Resolves the effective menu for an employee applying all domain rules:
   * 1. Finds employee and their company.
   * 2. Excludes categories hidden from the employee's company.
   * 3. Excludes inactive categories.
   * 4. Excludes secret categories from normal menu listing.
   * 5. Excludes inactive dishes.
   * 6. Excludes dishes hidden from the employee's company.
   * 7. Queries PricingService in batch for effective selling prices.
   * 8. Excludes dishes with no valid price (missing price rule).
   * 9. Excludes categories that have zero valid dishes remaining (empty category rule).
   * 10. Preserves category and dish display order.
   *
   * Both GET /menu/me and GET /menu/preview/employees/:employeeId consume this method.
   */
  async getEffectiveMenuForEmployee(
    employeeId: string,
  ): Promise<EmployeeMenuResponse> {
    // Step 1: Find employee and company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    if (!employee.isActive) {
      throw new ForbiddenException('Employee account is inactive');
    }

    if (!employee.company || !employee.company.isActive) {
      throw new ForbiddenException('Employee company is inactive or not found');
    }

    const companyId = employee.companyId;

    // Step 2: Fetch company hidden categories and dishes in parallel
    const [hiddenCategories, hiddenDishes] = await Promise.all([
      this.prisma.companyHiddenCategory.findMany({
        where: { companyId },
        select: { categoryId: true },
      }),
      this.prisma.companyHiddenDish.findMany({
        where: { companyId },
        select: { dishId: true },
      }),
    ]);

    const hiddenCategoryIds = new Set(
      hiddenCategories.map((hc) => hc.categoryId),
    );
    const hiddenDishIds = new Set(hiddenDishes.map((hd) => hd.dishId));

    // Step 3-6: Load active, non-secret categories not hidden from company
    // Include active dishes not hidden from company, maintaining display order
    const categories = await this.prisma.menuCategory.findMany({
      where: {
        isActive: true,
        isSecret: false,
        id: { notIn: Array.from(hiddenCategoryIds) },
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        categoryDishes: {
          where: {
            dish: {
              isActive: true,
              id: { notIn: Array.from(hiddenDishIds) },
            },
          },
          orderBy: { displayOrder: 'asc' },
          include: {
            dish: {
              include: {
                optionGroups: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    optionGroupOptions: {
                      orderBy: { displayOrder: 'asc' },
                      include: {
                        option: {
                          select: { id: true, name: true, isActive: true },
                        },
                      },
                    },
                    optionGroupPortions: {
                      orderBy: { displayOrder: 'asc' },
                      include: {
                        portionSize: {
                          select: { id: true, name: true, isActive: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Step 7: Batch query PricingService for all candidate dishes
    const allDishIds = Array.from(
      new Set(
        categories.flatMap((cat) => cat.categoryDishes.map((cd) => cd.dish.id)),
      ),
    );

    const priceMap = await this.pricingService.getEffectiveDishPrices(
      employeeId,
      allDishIds,
    );

    // Step 8 & 9: Filter out unpriced dishes and empty categories
    const menuCategories: EmployeeMenuCategoryResponse[] = [];

    for (const cat of categories) {
      const items: EmployeeMenuItemResponse[] = [];

      for (const cd of cat.categoryDishes) {
        const dish = cd.dish;
        const price = priceMap.get(dish.id);

        // Missing price rule: Must not appear if no price or empty/zero
        if (
          !price ||
          price.trim() === '' ||
          price === '0' ||
          price === '0.00'
        ) {
          continue;
        }

        items.push({
          id: dish.id,
          name: dish.name,
          description: dish.description,
          imageUrl: dish.imageUrl,
          sku: dish.sku,
          temperature: dish.temperature,
          price,
          optionGroups: dish.optionGroups.map((og) => ({
            id: og.id,
            name: og.name,
            isRequired: og.isRequired,
            usesPortions: og.usesPortions,
            options: og.optionGroupOptions
              .filter((ogo) => ogo.option.isActive)
              .map((ogo) => ({
                id: ogo.option.id,
                name: ogo.option.name,
              })),
            portions: og.optionGroupPortions
              .filter((ogp) => ogp.portionSize.isActive)
              .map((ogp) => ({
                id: ogp.portionSize.id,
                name: ogp.portionSize.name,
              })),
          })),
        });
      }

      // Empty categories rule: Do not return categories with 0 valid items
      if (items.length > 0) {
        menuCategories.push({
          id: cat.id,
          name: cat.name,
          displayOrder: cat.displayOrder,
          items,
        });
      }
    }

    return { categories: menuCategories };
  }

  /**
   * Direct category access for an employee (e.g. secret categories accessed via direct URL).
   * Verifies company hiding, active status, and price resolution.
   */
  async getCategoryForEmployee(
    categoryId: string,
    employeeId: string,
  ): Promise<EmployeeMenuCategoryResponse> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    if (!employee.isActive) {
      throw new ForbiddenException('Employee account is inactive');
    }

    if (!employee.company || !employee.company.isActive) {
      throw new ForbiddenException('Employee company is inactive or not found');
    }

    const companyId = employee.companyId;

    // Check if category is hidden for this company
    const isCategoryHidden = await this.prisma.companyHiddenCategory.findUnique(
      {
        where: {
          companyId_categoryId: {
            companyId,
            categoryId,
          },
        },
      },
    );

    if (isCategoryHidden) {
      throw new NotFoundException('Category not found or not accessible');
    }

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
      include: {
        categoryDishes: {
          where: {
            dish: { isActive: true },
          },
          orderBy: { displayOrder: 'asc' },
          include: {
            dish: {
              include: {
                optionGroups: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    optionGroupOptions: {
                      orderBy: { displayOrder: 'asc' },
                      include: {
                        option: {
                          select: { id: true, name: true, isActive: true },
                        },
                      },
                    },
                    optionGroupPortions: {
                      orderBy: { displayOrder: 'asc' },
                      include: {
                        portionSize: {
                          select: { id: true, name: true, isActive: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found or inactive');
    }

    // Check for company-hidden dishes
    const hiddenDishes = await this.prisma.companyHiddenDish.findMany({
      where: { companyId },
      select: { dishId: true },
    });
    const hiddenDishIds = new Set(hiddenDishes.map((hd) => hd.dishId));

    const candidateDishes = category.categoryDishes.filter(
      (cd) => !hiddenDishIds.has(cd.dishId),
    );

    const priceMap = await this.pricingService.getEffectiveDishPrices(
      employeeId,
      candidateDishes.map((cd) => cd.dish.id),
    );

    const items: EmployeeMenuItemResponse[] = [];

    for (const cd of candidateDishes) {
      const dish = cd.dish;
      const price = priceMap.get(dish.id);

      if (!price || price.trim() === '' || price === '0' || price === '0.00') {
        continue;
      }

      items.push({
        id: dish.id,
        name: dish.name,
        description: dish.description,
        imageUrl: dish.imageUrl,
        sku: dish.sku,
        temperature: dish.temperature,
        price,
        optionGroups: dish.optionGroups.map((og) => ({
          id: og.id,
          name: og.name,
          isRequired: og.isRequired,
          usesPortions: og.usesPortions,
          options: og.optionGroupOptions
            .filter((ogo) => ogo.option.isActive)
            .map((ogo) => ({
              id: ogo.option.id,
              name: ogo.option.name,
            })),
          portions: og.optionGroupPortions
            .filter((ogp) => ogp.portionSize.isActive)
            .map((ogp) => ({
              id: ogp.portionSize.id,
              name: ogp.portionSize.name,
            })),
        })),
      });
    }

    return {
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      items,
    };
  }
}
