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
import { DayOfWeek, UserRole } from '../../generated/prisma/enums.js';
import {
  isPublicEmailDomain,
  isValidDomainFormat,
  normalizeDomain,
} from './constants/public-domains.constant.js';
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
  CompanySummaryResponse,
  DeliveryAddressResponse,
  PaginatedCompaniesResponse,
} from './types/company.types.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  // ====================================================
  // 1. Company CRUD
  // ====================================================

  /**
   * Create a new company.
   */
  async create(dto: CreateCompanyDto): Promise<CompanyDetailResponse> {
    // 1. Check name uniqueness
    const existingName = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(
        `Company with name '${dto.name}' already exists`,
      );
    }

    // 2. Validate email domains if provided
    const validatedDomains: string[] = [];
    if (dto.domains && dto.domains.length > 0) {
      for (const rawDomain of dto.domains) {
        const normalized = normalizeDomain(rawDomain);
        if (!isValidDomainFormat(normalized)) {
          throw new BadRequestException(
            `Invalid email domain format '${rawDomain}'`,
          );
        }
        if (isPublicEmailDomain(normalized)) {
          throw new BadRequestException(
            `Public email provider '${rawDomain}' cannot be claimed as a corporate domain`,
          );
        }
        // Check cross-company uniqueness
        const domainExists = await this.prisma.companyEmailDomain.findUnique({
          where: { domain: normalized },
        });
        if (domainExists) {
          throw new ConflictException(
            `Email domain '${rawDomain}' is already claimed by another company`,
          );
        }
        if (!validatedDomains.includes(normalized)) {
          validatedDomains.push(normalized);
        }
      }
    }

    // 3. Validate default driver if specified
    if (dto.defaultDriverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
      });
      if (!driver) {
        throw new NotFoundException(
          `Staff driver with ID '${dto.defaultDriverId}' not found`,
        );
      }
      if (driver.role !== UserRole.DRIVER) {
        throw new BadRequestException(
          `User '${driver.name}' does not have the DRIVER role`,
        );
      }
    }

    // 4. Validate price tier if specified
    if (dto.priceTierId) {
      const tier = await this.prisma.priceTier.findUnique({
        where: { id: dto.priceTierId },
      });
      if (!tier) {
        throw new NotFoundException(
          `Price tier with ID '${dto.priceTierId}' not found`,
        );
      }
      if (!tier.isActive) {
        throw new BadRequestException(
          `Cannot assign inactive price tier '${tier.name}'`,
        );
      }
    }

    // 5. Create company with initial domains in a transaction
    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: dto.name,
          billingContactName: dto.billingContactName,
          billingContactEmail: dto.billingContactEmail,
          billingContactPhone: dto.billingContactPhone,
          workingDays: dto.workingDays ?? [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          defaultDeliveryTime: dto.defaultDeliveryTime,
          leaveKitchenMinutes: dto.leaveKitchenMinutes ?? 60,
          defaultPackagingType: dto.defaultPackagingType,
          standingDriverInstructions: dto.standingDriverInstructions,
          defaultDriverId: dto.defaultDriverId,
          priceTierId: dto.priceTierId,
          isActive: dto.isActive ?? true,
          emailDomains: {
            create: validatedDomains.map((domain) => ({ domain })),
          },
        },
      });
      return created;
    }, { timeout: 15000, maxWait: 10000 });

    return this.findById(company.id);
  }

  /**
   * Find paginated companies with search and active status filters.
   */
  async findAll(query: CompanyQueryDto): Promise<PaginatedCompaniesResponse> {
    const { skip, take, safePage, safeLimit } = calculatePagination(
      query.page,
      query.limit,
    );

    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, records] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          priceTier: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
          emailDomains: { select: { domain: true } },
          _count: {
            select: { employees: true },
          },
        },
      }),
    ]);

    const data: CompanySummaryResponse[] = records.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      priceTierId: c.priceTierId,
      priceTier: c.priceTier ? { id: c.priceTier.id, name: c.priceTier.name } : null,
      ownerId: c.ownerId,
      owner: c.owner
        ? { id: c.owner.id, name: c.owner.name, email: c.owner.email }
        : null,
      employeeCount: c._count.employees,
      emailDomains: c.emailDomains.map((d) => d.domain),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return createPaginatedResponse(data, total, safePage, safeLimit);
  }

  /**
   * Find company by ID with full details.
   */
  async findById(id: string): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        priceTier: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        defaultDriver: { select: { id: true, name: true, email: true } },
        emailDomains: { orderBy: { createdAt: 'asc' } },
        deliveryAddresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        holidays: { orderBy: { date: 'asc' } },
        companyHiddenCategories: { select: { categoryId: true } },
        companyHiddenDishes: { select: { dishId: true } },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    return {
      id: company.id,
      name: company.name,
      isActive: company.isActive,
      billingContact: {
        name: company.billingContactName,
        email: company.billingContactEmail,
        phone: company.billingContactPhone,
      },
      workingDays: company.workingDays,
      deliveryDefaults: {
        defaultDeliveryTime: company.defaultDeliveryTime,
        leaveKitchenMinutes: company.leaveKitchenMinutes,
        defaultPackagingType: company.defaultPackagingType,
        standingDriverInstructions: company.standingDriverInstructions,
        defaultDriverId: company.defaultDriverId,
        defaultDriver: company.defaultDriver,
      },
      priceTierId: company.priceTierId,
      priceTier: company.priceTier,
      ownerId: company.ownerId,
      owner: company.owner,
      employeeCount: company._count.employees,
      emailDomains: company.emailDomains.map((d) => ({
        id: d.id,
        domain: d.domain,
        companyId: d.companyId,
        createdAt: d.createdAt,
      })),
      deliveryAddresses: company.deliveryAddresses.map((a) => ({
        id: a.id,
        companyId: a.companyId,
        label: a.label,
        street: a.street,
        unit: a.unit,
        city: a.city,
        postcode: a.postcode,
        deliveryInstructions: a.deliveryInstructions,
        isDefault: a.isDefault,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      holidays: company.holidays.map((h) => ({
        id: h.id,
        companyId: h.companyId,
        date: h.date.toISOString().split('T')[0],
        name: h.name,
        description: h.description,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
      hiddenCategoryIds: company.companyHiddenCategories.map((hc) => hc.categoryId),
      hiddenDishIds: company.companyHiddenDishes.map((hd) => hd.dishId),
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  /**
   * Update an existing company.
   */
  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyDetailResponse> {
    const existing = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    // 1. If name is being changed, check uniqueness
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.company.findUnique({
        where: { name: dto.name },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Company with name '${dto.name}' already exists`,
        );
      }
    }

    // 2. If ownerId is provided, verify employee belongs to this company
    if (dto.ownerId !== undefined) {
      if (dto.ownerId !== null) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: dto.ownerId },
        });
        if (!employee) {
          throw new NotFoundException(
            `Employee with ID '${dto.ownerId}' not found`,
          );
        }
        if (employee.companyId !== id) {
          throw new BadRequestException(
            'Company owner must be an employee belonging to the same company',
          );
        }
      }
    }

    // 3. If defaultDriverId is provided, verify driver role
    if (dto.defaultDriverId !== undefined && dto.defaultDriverId !== null) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
      });
      if (!driver) {
        throw new NotFoundException(
          `Staff driver with ID '${dto.defaultDriverId}' not found`,
        );
      }
      if (driver.role !== UserRole.DRIVER) {
        throw new BadRequestException(
          `User '${driver.name}' does not have the DRIVER role`,
        );
      }
    }

    // 4. If priceTierId is provided, verify tier exists and is active
    if (dto.priceTierId !== undefined && dto.priceTierId !== null) {
      const tier = await this.prisma.priceTier.findUnique({
        where: { id: dto.priceTierId },
      });
      if (!tier) {
        throw new NotFoundException(
          `Price tier with ID '${dto.priceTierId}' not found`,
        );
      }
      if (!tier.isActive) {
        throw new BadRequestException(
          `Cannot assign inactive price tier '${tier.name}'`,
        );
      }
    }

    try {
      await this.prisma.company.update({
        where: { id },
        data: {
          name: dto.name,
          billingContactName: dto.billingContactName,
          billingContactEmail: dto.billingContactEmail,
          billingContactPhone: dto.billingContactPhone,
          workingDays: dto.workingDays,
          defaultDeliveryTime: dto.defaultDeliveryTime,
          leaveKitchenMinutes: dto.leaveKitchenMinutes,
          defaultPackagingType: dto.defaultPackagingType,
          standingDriverInstructions: dto.standingDriverInstructions,
          defaultDriverId: dto.defaultDriverId,
          ownerId: dto.ownerId,
          priceTierId: dto.priceTierId,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Unique constraint violation');
      }
      throw error;
    }

    return this.findById(id);
  }

  /**
   * Soft-deactivate a company.
   */
  async remove(id: string): Promise<CompanyDetailResponse> {
    const existing = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    await this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    return this.findById(id);
  }

  // ====================================================
  // 2. Email Domains Management
  // ====================================================

  /**
   * Add a corporate domain to the company.
   */
  async addDomain(
    companyId: string,
    dto: CreateCompanyDomainDto,
  ): Promise<CompanyDomainResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const normalized = normalizeDomain(dto.domain);
    if (!isValidDomainFormat(normalized)) {
      throw new BadRequestException(
        `Invalid email domain format '${dto.domain}'`,
      );
    }
    if (isPublicEmailDomain(normalized)) {
      throw new BadRequestException(
        `Public email provider '${dto.domain}' cannot be claimed as a corporate domain`,
      );
    }

    const existingDomain = await this.prisma.companyEmailDomain.findUnique({
      where: { domain: normalized },
    });
    if (existingDomain) {
      if (existingDomain.companyId === companyId) {
        throw new ConflictException(
          `Domain '${dto.domain}' is already assigned to this company`,
        );
      }
      throw new ConflictException(
        `Email domain '${dto.domain}' is already claimed by another company`,
      );
    }

    const created = await this.prisma.companyEmailDomain.create({
      data: {
        domain: normalized,
        companyId,
      },
    });

    return {
      id: created.id,
      domain: created.domain,
      companyId: created.companyId,
      createdAt: created.createdAt,
    };
  }

  /**
   * Remove an email domain from the company.
   */
  async removeDomain(
    companyId: string,
    domainId: string,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.prisma.companyEmailDomain.findUnique({
      where: { id: domainId },
      include: { company: true },
    });

    if (!domain || domain.companyId !== companyId) {
      throw new NotFoundException(
        `Domain with ID '${domainId}' not found for company '${companyId}'`,
      );
    }

    // A company must have at least one domain when active
    if (domain.company.isActive) {
      const domainCount = await this.prisma.companyEmailDomain.count({
        where: { companyId },
      });
      if (domainCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last email domain of an active company',
        );
      }
    }

    await this.prisma.companyEmailDomain.delete({
      where: { id: domainId },
    });

    return { success: true, message: 'Domain removed successfully' };
  }

  // ====================================================
  // 3. Delivery Addresses Management
  // ====================================================

  /**
   * Get all delivery addresses for a company.
   */
  async getAddresses(companyId: string): Promise<DeliveryAddressResponse[]> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const addresses = await this.prisma.deliveryAddress.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return addresses.map((a) => ({
      id: a.id,
      companyId: a.companyId,
      label: a.label,
      street: a.street,
      unit: a.unit,
      city: a.city,
      postcode: a.postcode,
      deliveryInstructions: a.deliveryInstructions,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  /**
   * Add a delivery address to the company.
   */
  async addAddress(
    companyId: string,
    dto: CreateDeliveryAddressDto,
  ): Promise<DeliveryAddressResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const existingCount = await this.prisma.deliveryAddress.count({
      where: { companyId },
    });

    const isFirstAddress = existingCount === 0;
    const shouldBeDefault = isFirstAddress || dto.isDefault === true;

    const address = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault && !isFirstAddress) {
        await tx.deliveryAddress.updateMany({
          where: { companyId },
          data: { isDefault: false },
        });
      }

      return tx.deliveryAddress.create({
        data: {
          companyId,
          label: dto.label,
          street: dto.street,
          unit: dto.unit,
          city: dto.city,
          postcode: dto.postcode,
          deliveryInstructions: dto.deliveryInstructions,
          isDefault: shouldBeDefault,
        },
      });
    }, { timeout: 15000, maxWait: 10000 });

    return {
      id: address.id,
      companyId: address.companyId,
      label: address.label,
      street: address.street,
      unit: address.unit,
      city: address.city,
      postcode: address.postcode,
      deliveryInstructions: address.deliveryInstructions,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Update a delivery address for the company.
   */
  async updateAddress(
    companyId: string,
    addressId: string,
    dto: UpdateDeliveryAddressDto,
  ): Promise<DeliveryAddressResponse> {
    const address = await this.prisma.deliveryAddress.findUnique({
      where: { id: addressId },
    });

    if (!address || address.companyId !== companyId) {
      throw new NotFoundException(
        `Address with ID '${addressId}' not found for company '${companyId}'`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.deliveryAddress.updateMany({
          where: { companyId },
          data: { isDefault: false },
        });
      }

      return tx.deliveryAddress.update({
        where: { id: addressId },
        data: {
          label: dto.label,
          street: dto.street,
          unit: dto.unit,
          city: dto.city,
          postcode: dto.postcode,
          deliveryInstructions: dto.deliveryInstructions,
          isDefault: dto.isDefault,
        },
      });
    }, { timeout: 15000, maxWait: 10000 });

    return {
      id: updated.id,
      companyId: updated.companyId,
      label: updated.label,
      street: updated.street,
      unit: updated.unit,
      city: updated.city,
      postcode: updated.postcode,
      deliveryInstructions: updated.deliveryInstructions,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a delivery address.
   */
  async removeAddress(
    companyId: string,
    addressId: string,
  ): Promise<{ success: boolean; message: string }> {
    const address = await this.prisma.deliveryAddress.findUnique({
      where: { id: addressId },
      include: { company: true },
    });

    if (!address || address.companyId !== companyId) {
      throw new NotFoundException(
        `Address with ID '${addressId}' not found for company '${companyId}'`,
      );
    }

    // Cannot delete the last address of an active Company
    if (address.company.isActive) {
      const addressCount = await this.prisma.deliveryAddress.count({
        where: { companyId },
      });
      if (addressCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last delivery address of an active company',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryAddress.delete({
        where: { id: addressId },
      });

      // If the deleted address was default, promote another address to default
      if (address.isDefault) {
        const remaining = await tx.deliveryAddress.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'asc' },
        });
        if (remaining) {
          await tx.deliveryAddress.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }
    }, { timeout: 15000, maxWait: 10000 });

    return {
      success: true,
      message: 'Delivery address removed successfully',
    };
  }

  // ====================================================
  // 4. Billing Contact
  // ====================================================

  /**
   * Update billing contact details.
   */
  async updateBillingContact(
    companyId: string,
    dto: UpdateBillingContactDto,
  ): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        billingContactName: dto.name,
        billingContactEmail: dto.email,
        billingContactPhone: dto.phone,
      },
    });

    return this.findById(companyId);
  }

  // ====================================================
  // 5. Company Owner
  // ====================================================

  /**
   * Set or update company owner.
   */
  async setOwner(
    companyId: string,
    dto: SetCompanyOwnerDto,
  ): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee with ID '${dto.employeeId}' not found`,
      );
    }

    if (employee.companyId !== companyId) {
      throw new BadRequestException(
        'Company owner must be an employee belonging to the same company',
      );
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { ownerId: dto.employeeId },
    });

    return this.findById(companyId);
  }

  // ====================================================
  // 6. Company Calendar & Working Days
  // ====================================================

  /**
   * Update company calendar working days.
   */
  async updateCalendar(
    companyId: string,
    dto: UpdateCompanyCalendarDto,
  ): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { workingDays: dto.workingDays },
    });

    return this.findById(companyId);
  }

  // ====================================================
  // 7. Company Holidays
  // ====================================================

  /**
   * List company holidays.
   */
  async getHolidays(companyId: string): Promise<CompanyHolidayResponse[]> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const holidays = await this.prisma.companyHoliday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });

    return holidays.map((h) => ({
      id: h.id,
      companyId: h.companyId,
      date: h.date.toISOString().split('T')[0],
      name: h.name,
      description: h.description,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));
  }

  /**
   * Add a company holiday.
   */
  async addHoliday(
    companyId: string,
    dto: CreateCompanyHolidayDto,
  ): Promise<CompanyHolidayResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const dateObj = new Date(`${dto.date.split('T')[0]}T00:00:00.000Z`);

    const existing = await this.prisma.companyHoliday.findUnique({
      where: {
        companyId_date: {
          companyId,
          date: dateObj,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A company holiday on '${dto.date.split('T')[0]}' already exists for this company`,
      );
    }

    const holiday = await this.prisma.companyHoliday.create({
      data: {
        companyId,
        date: dateObj,
        name: dto.name,
        description: dto.description,
      },
    });

    return {
      id: holiday.id,
      companyId: holiday.companyId,
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      description: holiday.description,
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
    };
  }

  /**
   * Update a company holiday.
   */
  async updateHoliday(
    companyId: string,
    holidayId: string,
    dto: UpdateCompanyHolidayDto,
  ): Promise<CompanyHolidayResponse> {
    const holiday = await this.prisma.companyHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday || holiday.companyId !== companyId) {
      throw new NotFoundException(
        `Holiday with ID '${holidayId}' not found for company '${companyId}'`,
      );
    }

    let dateObj: Date | undefined;
    if (dto.date) {
      dateObj = new Date(`${dto.date.split('T')[0]}T00:00:00.000Z`);
      if (dateObj.getTime() !== holiday.date.getTime()) {
        const conflict = await this.prisma.companyHoliday.findUnique({
          where: {
            companyId_date: {
              companyId,
              date: dateObj,
            },
          },
        });
        if (conflict) {
          throw new ConflictException(
            `A company holiday on '${dto.date.split('T')[0]}' already exists for this company`,
          );
        }
      }
    }

    const updated = await this.prisma.companyHoliday.update({
      where: { id: holidayId },
      data: {
        date: dateObj,
        name: dto.name,
        description: dto.description,
      },
    });

    return {
      id: updated.id,
      companyId: updated.companyId,
      date: updated.date.toISOString().split('T')[0],
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a company holiday.
   */
  async removeHoliday(
    companyId: string,
    holidayId: string,
  ): Promise<{ success: boolean; message: string }> {
    const holiday = await this.prisma.companyHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday || holiday.companyId !== companyId) {
      throw new NotFoundException(
        `Holiday with ID '${holidayId}' not found for company '${companyId}'`,
      );
    }

    await this.prisma.companyHoliday.delete({
      where: { id: holidayId },
    });

    return {
      success: true,
      message: 'Company holiday removed successfully',
    };
  }

  // ====================================================
  // 8. Delivery Defaults
  // ====================================================

  /**
   * Update company delivery defaults.
   */
  async updateDeliveryDefaults(
    companyId: string,
    dto: UpdateDeliveryDefaultsDto,
  ): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (dto.defaultDriverId !== undefined && dto.defaultDriverId !== null) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
      });
      if (!driver) {
        throw new NotFoundException(
          `Staff driver with ID '${dto.defaultDriverId}' not found`,
        );
      }
      if (driver.role !== UserRole.DRIVER) {
        throw new BadRequestException(
          `User '${driver.name}' does not have the DRIVER role`,
        );
      }
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        defaultDeliveryTime: dto.defaultDeliveryTime,
        leaveKitchenMinutes: dto.leaveKitchenMinutes,
        defaultPackagingType: dto.defaultPackagingType,
        standingDriverInstructions: dto.standingDriverInstructions,
        defaultDriverId: dto.defaultDriverId,
      },
    });

    return this.findById(companyId);
  }

  // ====================================================
  // 9. Price Tier
  // ====================================================

  /**
   * Assign or remove price tier for company.
   */
  async assignPriceTier(
    companyId: string,
    dto: AssignPriceTierDto,
  ): Promise<CompanyDetailResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (dto.priceTierId !== null && dto.priceTierId !== undefined) {
      const tier = await this.prisma.priceTier.findUnique({
        where: { id: dto.priceTierId },
      });
      if (!tier) {
        throw new NotFoundException(
          `Price tier with ID '${dto.priceTierId}' not found`,
        );
      }
      if (!tier.isActive) {
        throw new BadRequestException(
          `Cannot assign inactive price tier '${tier.name}'`,
        );
      }
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { priceTierId: dto.priceTierId },
    });

    return this.findById(companyId);
  }

  // ====================================================
  // 10. Menu Visibility (Hidden Categories and Dishes)
  // ====================================================

  /**
   * Hide a category from this company.
   */
  async hideCategory(
    companyId: string,
    categoryId: string,
  ): Promise<{ success: boolean; message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Menu category with ID '${categoryId}' not found`,
      );
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
        `Category '${category.name}' is already hidden for this company`,
      );
    }

    await this.prisma.companyHiddenCategory.create({
      data: {
        companyId,
        categoryId,
      },
    });

    return {
      success: true,
      message: `Category '${category.name}' is now hidden for company '${company.name}'`,
    };
  }

  /**
   * Unhide a category from this company.
   */
  async unhideCategory(
    companyId: string,
    categoryId: string,
  ): Promise<{ success: boolean; message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const hidden = await this.prisma.companyHiddenCategory.findUnique({
      where: {
        companyId_categoryId: {
          companyId,
          categoryId,
        },
      },
    });

    if (!hidden) {
      throw new NotFoundException('Category is not hidden for this company');
    }

    await this.prisma.companyHiddenCategory.delete({
      where: {
        companyId_categoryId: {
          companyId,
          categoryId,
        },
      },
    });

    return {
      success: true,
      message: 'Category unhidden successfully',
    };
  }

  /**
   * Hide a dish from this company.
   */
  async hideDish(
    companyId: string,
    dishId: string,
  ): Promise<{ success: boolean; message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID '${dishId}' not found`);
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
        `Dish '${dish.name}' is already hidden for this company`,
      );
    }

    await this.prisma.companyHiddenDish.create({
      data: {
        companyId,
        dishId,
      },
    });

    return {
      success: true,
      message: `Dish '${dish.name}' is now hidden for company '${company.name}'`,
    };
  }

  /**
   * Unhide a dish from this company.
   */
  async unhideDish(
    companyId: string,
    dishId: string,
  ): Promise<{ success: boolean; message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    const hidden = await this.prisma.companyHiddenDish.findUnique({
      where: {
        companyId_dishId: {
          companyId,
          dishId,
        },
      },
    });

    if (!hidden) {
      throw new NotFoundException('Dish is not hidden for this company');
    }

    await this.prisma.companyHiddenDish.delete({
      where: {
        companyId_dishId: {
          companyId,
          dishId,
        },
      },
    });

    return {
      success: true,
      message: 'Dish unhidden successfully',
    };
  }

  // ====================================================
  // 11. Delivery Availability Verification
  // ====================================================

  /**
   * Checks whether the company can receive deliveries on a given date.
   * A company cannot receive deliveries on non-working days or company holidays.
   */
  async checkDeliveryAvailability(
    companyId: string,
    dateStr: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { holidays: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${companyId}' not found`);
    }

    if (!company.isActive) {
      return { allowed: false, reason: 'Company is inactive' };
    }

    const targetDate = new Date(`${dateStr.split('T')[0]}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException(`Invalid date format '${dateStr}'`);
    }

    // Map JS getUTCDay() (0 = Sunday, 1 = Monday, ..., 6 = Saturday) to DayOfWeek enum
    const daysMap: Record<number, DayOfWeek> = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };
    const targetDayEnum = daysMap[targetDate.getUTCDay()];

    if (!company.workingDays.includes(targetDayEnum)) {
      return {
        allowed: false,
        reason: `Deliveries not available on non-working day (${targetDayEnum})`,
      };
    }

    // Check holidays
    const isHoliday = company.holidays.some(
      (h) => h.date.toISOString().split('T')[0] === dateStr.split('T')[0],
    );
    if (isHoliday) {
      return {
        allowed: false,
        reason: `Deliveries not available on company holiday (${dateStr.split('T')[0]})`,
      };
    }

    return { allowed: true };
  }
}
