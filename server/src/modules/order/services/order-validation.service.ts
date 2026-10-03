import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { DayOfWeek } from '../../../generated/prisma/enums.js';
import { MenuService } from '../../menu/menu.service.js';
import { CreateOrderLineDto } from '../dto/create-order.dto.js';
import { OrderAddressSnapshot } from '../types/order.types.js';
import { OrderCutoffService } from './order-cutoff.service.js';

const DAY_OF_WEEK_NAMES: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
] as const;

export interface ValidatedDeliveryDetails {
  addressSnapshot: OrderAddressSnapshot;
  deliveryTime: string;
  packagingType: string;
  deliveryInstructions: string | null;
}

@Injectable()
export class OrderValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuService: MenuService,
    private readonly cutoffService: OrderCutoffService,
  ) {}

  /**
   * Validates employee and their assigned company.
   */
  async validateEmployeeAndCompany(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            deliveryAddresses: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    if (!employee.isActive) {
      throw new ForbiddenException(
        `Employee account '${employee.name}' is inactive`,
      );
    }

    if (!employee.company) {
      throw new BadRequestException(
        `Employee '${employee.name}' is not assigned to any company`,
      );
    }

    if (!employee.company.isActive) {
      throw new ForbiddenException(
        `Company '${employee.company.name}' is inactive`,
      );
    }

    return { employee, company: employee.company };
  }

  /**
   * Validates company delivery calendar (working days and holidays).
   * Note: This affects delivery eligibility, NOT kitchen cut-off.
   */
  async validateCompanyDeliveryCalendar(
    companyId: string,
    companyWorkingDays: DayOfWeek[],
    deliveryDateStr: string,
  ) {
    const targetDate = new Date(`${deliveryDateStr}T00:00:00.000Z`);

    // 1. Check Day of Week against company working days
    const dayIndex = targetDate.getUTCDay();
    const dow = DAY_OF_WEEK_NAMES[dayIndex];

    if (!companyWorkingDays.includes(dow)) {
      throw new BadRequestException(
        `Company does not accept deliveries on ${dow}s`,
      );
    }

    // 2. Check Company Holidays
    const holiday = await this.prisma.companyHoliday.findFirst({
      where: {
        companyId,
        date: targetDate,
      },
    });

    if (holiday) {
      throw new BadRequestException(
        `Selected delivery date is a company holiday: '${holiday.name}'`,
      );
    }
  }

  /**
   * Validates delivery details and creates the immutable address snapshot.
   */
  async validateDeliveryDetails(
    employee: {
      canChooseDeliveryAddress: boolean;
      canChangeDeliveryTime: boolean;
      canChangePackaging: boolean;
    },
    company: {
      id: string;
      defaultDeliveryTime: string | null;
      defaultPackagingType: string | null;
      deliveryAddresses: Array<{
        id: string;
        label: string | null;
        street: string;
        unit: string | null;
        city: string;
        postcode: string;
        deliveryInstructions: string | null;
        isDefault: boolean;
      }>;
    },
    dto: {
      deliveryAddressId?: string;
      deliveryTime?: string;
      packagingType?: string;
      deliveryInstructions?: string;
    },
  ): Promise<ValidatedDeliveryDetails> {
    if (company.deliveryAddresses.length === 0) {
      throw new BadRequestException(
        'Company does not have any delivery addresses configured',
      );
    }

    let selectedAddress = company.deliveryAddresses.find((a) => a.isDefault);
    if (!selectedAddress) {
      selectedAddress = company.deliveryAddresses[0];
    }

    // Address selection rule
    if (dto.deliveryAddressId) {
      const customAddress = company.deliveryAddresses.find(
        (a) => a.id === dto.deliveryAddressId,
      );

      if (!customAddress) {
        throw new BadRequestException(
          `Delivery address '${dto.deliveryAddressId}' does not belong to this company`,
        );
      }

      if (
        !employee.canChooseDeliveryAddress &&
        customAddress.id !== selectedAddress?.id
      ) {
        // Fall back to default address if employee cannot choose
        // Alternatively, if employee cannot choose custom address, enforce default
        selectedAddress = company.deliveryAddresses.find((a) => a.isDefault) ?? company.deliveryAddresses[0];
      } else {
        selectedAddress = customAddress;
      }
    }

    if (!selectedAddress) {
      throw new BadRequestException('No valid delivery address could be determined');
    }

    const addressSnapshot: OrderAddressSnapshot = {
      deliveryAddressId: selectedAddress.id,
      deliveryAddressLabel: selectedAddress.label,
      deliveryStreet: selectedAddress.street,
      deliveryUnit: selectedAddress.unit,
      deliveryCity: selectedAddress.city,
      deliveryPostcode: selectedAddress.postcode,
      deliveryInstructions:
        dto.deliveryInstructions ?? selectedAddress.deliveryInstructions,
    };

    // Delivery time rule
    let deliveryTime = company.defaultDeliveryTime ?? '12:00';
    if (dto.deliveryTime) {
      if (employee.canChangeDeliveryTime) {
        deliveryTime = dto.deliveryTime;
      }
    }

    // Packaging rule
    let packagingType = company.defaultPackagingType ?? 'STANDARD';
    if (dto.packagingType) {
      if (employee.canChangePackaging) {
        packagingType = dto.packagingType;
      }
    }

    return {
      addressSnapshot,
      deliveryTime,
      packagingType,
      deliveryInstructions: dto.deliveryInstructions ?? null,
    };
  }

  /**
   * Validates that all dishes are present in the employee's effective menu and options are valid.
   */
  async validateMenuAndDishes(
    employeeId: string,
    companyId: string,
    lines: CreateOrderLineDto[],
  ) {
    // 1. Resolve employee's effective menu using MenuService
    const effectiveMenu =
      await this.menuService.getEffectiveMenuForEmployee(employeeId);

    const visibleDishesMap = new Map(
      effectiveMenu.categories.flatMap((cat) =>
        cat.items.map((item) => [item.id, item]),
      ),
    );

    // 2. Validate each line
    for (const line of lines) {
      if (!visibleDishesMap.has(line.dishId)) {
        throw new BadRequestException(
          `Dish with ID '${line.dishId}' is not visible or not priced on employee's effective menu`,
        );
      }

      if (line.quantity <= 0) {
        throw new BadRequestException('Line quantity must be greater than zero');
      }

      if (!line.combinations || line.combinations.length === 0) {
        throw new BadRequestException(
          `Dish '${line.dishId}' must have at least one preparation combination`,
        );
      }

      // Check combination sum equals line quantity
      const sumCombinationQty = line.combinations.reduce(
        (acc, c) => acc + c.quantity,
        0,
      );

      if (sumCombinationQty !== line.quantity) {
        throw new BadRequestException(
          `Sum of combination quantities (${sumCombinationQty}) must equal order line quantity (${line.quantity})`,
        );
      }

      // Fetch dish with complete option groups configuration
      const dish = await this.prisma.dish.findUnique({
        where: { id: line.dishId },
        include: {
          optionGroups: {
            include: {
              optionGroupOptions: {
                include: { option: true },
              },
              optionGroupPortions: {
                include: { portionSize: true },
              },
            },
          },
        },
      });

      if (!dish || !dish.isActive) {
        throw new BadRequestException(
          `Dish with ID '${line.dishId}' is inactive or not found`,
        );
      }

      // Validate each combination
      for (const comb of line.combinations) {
        if (comb.quantity <= 0) {
          throw new BadRequestException(
            'Combination quantity must be greater than zero',
          );
        }

        const selectedGroupIds = new Set<string>();

        for (const optDto of comb.options) {
          // Verify option group exists on this dish
          const group = dish.optionGroups.find(
            (g) => g.id === optDto.optionGroupId,
          );
          if (!group) {
            throw new BadRequestException(
              `Option group '${optDto.optionGroupId}' does not belong to dish '${dish.name}'`,
            );
          }

          // Verify option belongs to this option group
          const optMapping = group.optionGroupOptions.find(
            (ogo) => ogo.optionId === optDto.optionId,
          );
          if (!optMapping || !optMapping.option.isActive) {
            throw new BadRequestException(
              `Option '${optDto.optionId}' does not belong to group '${group.name}' or is inactive`,
            );
          }

          // If group uses portions, validate portion if provided
          if (group.usesPortions && optDto.portionSizeId) {
            const portionMapping = group.optionGroupPortions.find(
              (ogp) => ogp.portionSizeId === optDto.portionSizeId,
            );
            if (!portionMapping || !portionMapping.portionSize.isActive) {
              throw new BadRequestException(
                `Portion '${optDto.portionSizeId}' is not allowed for option group '${group.name}'`,
              );
            }
          }

          selectedGroupIds.add(group.id);
        }

        // Check that all required option groups are satisfied
        for (const group of dish.optionGroups) {
          if (group.isRequired && !selectedGroupIds.has(group.id)) {
            throw new BadRequestException(
              `Required option group '${group.name}' for dish '${dish.name}' is missing a selection in a combination`,
            );
          }
        }
      }
    }
  }

  /**
   * Validates cut-off for placing/editing.
   */
  async validateCutoff(deliveryDateStr: string, isAdmin = false) {
    if (isAdmin) {
      // Admins are allowed to bypass standard cut-off restrictions
      return;
    }

    const isPast = await this.cutoffService.isPastCutoff(deliveryDateStr);
    if (isPast) {
      throw new BadRequestException(
        `Order cut-off has passed for delivery date '${deliveryDateStr}'`,
      );
    }
  }
}
