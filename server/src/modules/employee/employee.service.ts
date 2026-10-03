import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isPrismaError } from '../../common/utils/prisma/prisma-error.js';
import {
  calculatePagination,
  createPaginatedResponse,
} from '../../common/utils/pagination/index.js';
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
  BulkImportResultResponse,
  BulkImportRowError,
  EmployeeSummaryResponse,
  PaginatedEmployeesResponse,
} from './types/employee.types.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ====================================================
  // 1. Employee CRUD
  // ====================================================

  /**
   * Create a new employee belonging to a company.
   */
  async create(dto: CreateEmployeeDto): Promise<EmployeeSummaryResponse> {
    // 1. Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID '${dto.companyId}' not found`,
      );
    }

    // 2. Normalize and verify email uniqueness if provided
    let normalizedEmail: string | undefined;
    if (dto.email) {
      normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.prisma.employee.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new ConflictException(
          `Employee with email '${dto.email}' already exists`,
        );
      }
    }

    // 3. Verify allergens if provided
    if (dto.allergenIds && dto.allergenIds.length > 0) {
      const allergenCount = await this.prisma.allergen.count({
        where: { id: { in: dto.allergenIds } },
      });
      if (allergenCount !== dto.allergenIds.length) {
        throw new NotFoundException(
          'One or more referenced allergens do not exist',
        );
      }
    }

    // 4. Verify dietary tags if provided
    if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
      const tagCount = await this.prisma.dietaryTag.count({
        where: { id: { in: dto.dietaryTagIds } },
      });
      if (tagCount !== dto.dietaryTagIds.length) {
        throw new NotFoundException(
          'One or more referenced dietary tags do not exist',
        );
      }
    }

    // 5. Create employee
    try {
      const created = await this.prisma.employee.create({
        data: {
          name: dto.name.trim(),
          email: normalizedEmail,
          companyId: dto.companyId,
          canChooseDeliveryAddress: dto.canChooseDeliveryAddress ?? false,
          canChangeDeliveryTime: dto.canChangeDeliveryTime ?? false,
          canChangePackaging: dto.canChangePackaging ?? false,
          isActive: dto.isActive ?? true,
          allergens: dto.allergenIds
            ? { connect: dto.allergenIds.map((id) => ({ id })) }
            : undefined,
          dietaryTags: dto.dietaryTagIds
            ? { connect: dto.dietaryTagIds.map((id) => ({ id })) }
            : undefined,
        },
      });

      return this.findById(created.id);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Employee with email '${dto.email}' already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Find paginated employees with search (name/email), company filter, and status filter.
   */
  async findAll(query: EmployeeQueryDto): Promise<PaginatedEmployeesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: any = {};
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.companyId) {
      where.companyId = query.companyId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, records] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { id: true, name: true, isActive: true },
          },
          allergens: {
            select: { id: true, name: true },
          },
          dietaryTags: {
            select: { id: true, name: true },
          },
          ownedCompanies: {
            select: { id: true },
          },
        },
      }),
    ]);

    const data: EmployeeSummaryResponse[] = records.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      companyId: e.companyId,
      company: e.company,
      canChooseDeliveryAddress: e.canChooseDeliveryAddress,
      canChangeDeliveryTime: e.canChangeDeliveryTime,
      canChangePackaging: e.canChangePackaging,
      allergens: e.allergens,
      dietaryTags: e.dietaryTags,
      isOwnerOfCompany: e.ownedCompanies.length > 0,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  /**
   * Find employee by ID.
   */
  async findById(id: string): Promise<EmployeeSummaryResponse> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, isActive: true },
        },
        allergens: {
          select: { id: true, name: true },
        },
        dietaryTags: {
          select: { id: true, name: true },
        },
        ownedCompanies: {
          select: { id: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId,
      company: employee.company,
      canChooseDeliveryAddress: employee.canChooseDeliveryAddress,
      canChangeDeliveryTime: employee.canChangeDeliveryTime,
      canChangePackaging: employee.canChangePackaging,
      allergens: employee.allergens,
      dietaryTags: employee.dietaryTags,
      isOwnerOfCompany: employee.ownedCompanies.length > 0,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  /**
   * Update employee details (including moving employee to another company).
   */
  async update(
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      include: { ownedCompanies: true },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    // 1. If companyId is being changed (moving employee)
    let isMovingCompany = false;
    if (dto.companyId && dto.companyId !== existing.companyId) {
      const destinationCompany = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!destinationCompany) {
        throw new NotFoundException(
          `Destination company with ID '${dto.companyId}' not found`,
        );
      }
      isMovingCompany = true;
    }

    // 2. If email is being changed, check uniqueness
    let normalizedEmail: string | null | undefined;
    if (dto.email !== undefined) {
      if (dto.email === null) {
        normalizedEmail = null;
      } else {
        normalizedEmail = dto.email.trim().toLowerCase();
        if (normalizedEmail !== existing.email) {
          const emailExists = await this.prisma.employee.findUnique({
            where: { email: normalizedEmail },
          });
          if (emailExists) {
            throw new ConflictException(
              `Employee with email '${dto.email}' already exists`,
            );
          }
        }
      }
    }

    // 3. Verify allergens if provided
    if (dto.allergenIds) {
      if (dto.allergenIds.length > 0) {
        const allergenCount = await this.prisma.allergen.count({
          where: { id: { in: dto.allergenIds } },
        });
        if (allergenCount !== dto.allergenIds.length) {
          throw new NotFoundException(
            'One or more referenced allergens do not exist',
          );
        }
      }
    }

    // 4. Verify dietary tags if provided
    if (dto.dietaryTagIds) {
      if (dto.dietaryTagIds.length > 0) {
        const tagCount = await this.prisma.dietaryTag.count({
          where: { id: { in: dto.dietaryTagIds } },
        });
        if (tagCount !== dto.dietaryTagIds.length) {
          throw new NotFoundException(
            'One or more referenced dietary tags do not exist',
          );
        }
      }
    }

    // 5. If moving company and this employee is owner of the old company, unset ownership
    await this.prisma.$transaction(
      async (tx) => {
        if (isMovingCompany && existing.ownedCompanies.length > 0) {
          await tx.company.updateMany({
            where: { id: existing.companyId, ownerId: id },
            data: { ownerId: null },
          });
        }

        await tx.employee.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            email: normalizedEmail,
            companyId: dto.companyId,
            canChooseDeliveryAddress: dto.canChooseDeliveryAddress,
            canChangeDeliveryTime: dto.canChangeDeliveryTime,
            canChangePackaging: dto.canChangePackaging,
            isActive: dto.isActive,
            allergens: dto.allergenIds
              ? { set: dto.allergenIds.map((aid) => ({ id: aid })) }
              : undefined,
            dietaryTags: dto.dietaryTagIds
              ? { set: dto.dietaryTagIds.map((tid) => ({ id: tid })) }
              : undefined,
          },
        });
      },
      { timeout: 15000, maxWait: 10000 },
    );

    return this.findById(id);
  }

  /**
   * Soft-deactivate an employee.
   */
  async remove(id: string): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    return this.findById(id);
  }

  // ====================================================
  // 2. Business Permissions
  // ====================================================

  /**
   * Update employee order-flow permission flags.
   */
  async updatePermissions(
    id: string,
    dto: UpdateEmployeePermissionsDto,
  ): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        canChooseDeliveryAddress: dto.canChooseDeliveryAddress,
        canChangeDeliveryTime: dto.canChangeDeliveryTime,
        canChangePackaging: dto.canChangePackaging,
      },
    });

    return this.findById(id);
  }

  // ====================================================
  // 3. Allergies & Dietary Preferences
  // ====================================================

  /**
   * Update employee allergies and dietary preferences simultaneously.
   */
  async updatePreferences(
    id: string,
    dto: UpdateEmployeePreferencesDto,
  ): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    if (dto.allergenIds && dto.allergenIds.length > 0) {
      const allergenCount = await this.prisma.allergen.count({
        where: { id: { in: dto.allergenIds } },
      });
      if (allergenCount !== dto.allergenIds.length) {
        throw new NotFoundException(
          'One or more referenced allergens do not exist',
        );
      }
    }

    if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
      const tagCount = await this.prisma.dietaryTag.count({
        where: { id: { in: dto.dietaryTagIds } },
      });
      if (tagCount !== dto.dietaryTagIds.length) {
        throw new NotFoundException(
          'One or more referenced dietary tags do not exist',
        );
      }
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        allergens: dto.allergenIds
          ? { set: dto.allergenIds.map((aid) => ({ id: aid })) }
          : undefined,
        dietaryTags: dto.dietaryTagIds
          ? { set: dto.dietaryTagIds.map((tid) => ({ id: tid })) }
          : undefined,
      },
    });

    return this.findById(id);
  }

  /**
   * Set employee allergies.
   */
  async updateAllergies(
    id: string,
    dto: UpdateEmployeeAllergiesDto,
  ): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    if (dto.allergenIds.length > 0) {
      const count = await this.prisma.allergen.count({
        where: { id: { in: dto.allergenIds } },
      });
      if (count !== dto.allergenIds.length) {
        throw new NotFoundException(
          'One or more referenced allergens do not exist',
        );
      }
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        allergens: { set: dto.allergenIds.map((aid) => ({ id: aid })) },
      },
    });

    return this.findById(id);
  }

  /**
   * Set employee dietary preferences.
   */
  async updateDietaryTags(
    id: string,
    dto: UpdateEmployeeDietaryTagsDto,
  ): Promise<EmployeeSummaryResponse> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID '${id}' not found`);
    }

    if (dto.dietaryTagIds.length > 0) {
      const count = await this.prisma.dietaryTag.count({
        where: { id: { in: dto.dietaryTagIds } },
      });
      if (count !== dto.dietaryTagIds.length) {
        throw new NotFoundException(
          'One or more referenced dietary tags do not exist',
        );
      }
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        dietaryTags: { set: dto.dietaryTagIds.map((tid) => ({ id: tid })) },
      },
    });

    return this.findById(id);
  }

  // ====================================================
  // 4. Bulk CSV Import
  // ====================================================

  /**
   * Bulk imports employees for a target company from CSV content.
   * Row errors are isolated and do not prevent other valid rows from importing.
   */
  async bulkImport(
    companyId: string,
    csvContent: string,
  ): Promise<BulkImportResultResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }
    if (!company.isActive) {
      throw new BadRequestException(
        'Cannot import employees to an inactive company',
      );
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return { totalRows: 0, imported: 0, failed: 0, errors: [] };
    }

    // Split lines
    const rawLines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length <= 1) {
      return { totalRows: 0, imported: 0, failed: 0, errors: [] };
    }

    // Parse header
    const headerLine = rawLines[0];
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const chooseAddrIdx = headers.indexOf('canchoosedeliveryaddress');
    const changeTimeIdx = headers.indexOf('canchangedeliverytime');
    const changePkgIdx = headers.indexOf('canchangepackaging');

    if (nameIdx === -1) {
      throw new BadRequestException(
        "CSV header must contain at least 'name' column",
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmailsInFile = new Set<string>();

    const rowErrors: BulkImportRowError[] = [];
    let importedCount = 0;
    let failedCount = 0;

    const dataLines = rawLines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + 2; // Row 1 is header, data starts at line 2
      const line = dataLines[i];
      const cols = line.split(',').map((c) => c.trim());

      const rowErrorList: string[] = [];

      const name = cols[nameIdx];
      if (!name || name.length === 0) {
        rowErrorList.push('Name is required');
      }

      let email: string | undefined;
      if (emailIdx !== -1 && cols[emailIdx]) {
        email = cols[emailIdx].toLowerCase();
        if (!emailRegex.test(email)) {
          rowErrorList.push(`Invalid email format '${cols[emailIdx]}'`);
        } else if (seenEmailsInFile.has(email)) {
          rowErrorList.push(`Duplicate email '${email}' in import file`);
        } else {
          seenEmailsInFile.add(email);
        }
      }

      // Check DB email uniqueness if email is valid so far
      if (email && rowErrorList.length === 0) {
        const existingInDb = await this.prisma.employee.findUnique({
          where: { email },
        });
        if (existingInDb) {
          rowErrorList.push(`Email '${email}' is already registered in system`);
        }
      }

      // Parse boolean flags
      const parseBool = (val: string | undefined): boolean => {
        if (!val) return false;
        const lower = val.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      };

      const canChooseDeliveryAddress =
        chooseAddrIdx !== -1 ? parseBool(cols[chooseAddrIdx]) : false;
      const canChangeDeliveryTime =
        changeTimeIdx !== -1 ? parseBool(cols[changeTimeIdx]) : false;
      const canChangePackaging =
        changePkgIdx !== -1 ? parseBool(cols[changePkgIdx]) : false;

      if (rowErrorList.length > 0) {
        failedCount++;
        rowErrors.push({ row: rowNumber, errors: rowErrorList });
        continue;
      }

      // Attempt to save row
      try {
        await this.prisma.employee.create({
          data: {
            name: name!,
            email,
            companyId,
            canChooseDeliveryAddress,
            canChangeDeliveryTime,
            canChangePackaging,
            isActive: true,
          },
        });
        importedCount++;
      } catch (err: any) {
        failedCount++;
        rowErrors.push({
          row: rowNumber,
          errors: [err.message || 'Database error creating employee record'],
        });
      }
    }

    return {
      totalRows: dataLines.length,
      imported: importedCount,
      failed: failedCount,
      errors: rowErrors,
    };
  }
}
