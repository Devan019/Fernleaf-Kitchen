import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Unique corporate name of the customer company',
    example: 'Google Inc.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Billing contact person name',
    example: 'Sundar Pichai',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingContactName?: string;

  @ApiPropertyOptional({
    description: 'Billing contact email address',
    example: 'billing@google.com',
  })
  @IsOptional()
  @IsEmail()
  billingContactEmail?: string;

  @ApiPropertyOptional({
    description: 'Billing contact phone number',
    example: '+1-650-253-0000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Working days for the company delivery calendar',
    enum: DayOfWeek,
    isArray: true,
    example: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  workingDays?: DayOfWeek[];

  @ApiPropertyOptional({
    description: 'Default target delivery time in 24h format (HH:mm)',
    example: '12:30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'defaultDeliveryTime must be in HH:mm 24-hour format',
  })
  defaultDeliveryTime?: string;

  @ApiPropertyOptional({
    description:
      'Minutes before target delivery time that food must leave kitchen',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leaveKitchenMinutes?: number;

  @ApiPropertyOptional({
    description: 'Default packaging preference for orders',
    example: 'ECO_BOX',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultPackagingType?: string;

  @ApiPropertyOptional({
    description: 'Standing delivery instructions for drivers',
    example: 'Deliver to main reception on 2nd floor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  standingDriverInstructions?: string;

  @ApiPropertyOptional({
    description: 'Default driver staff user ID (must have DRIVER role)',
    example: 'cm123456789',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  defaultDriverId?: string | null;

  @ApiPropertyOptional({
    description:
      'Company owner employee ID (must be an employee belonging to this company)',
    example: 'cm999999999',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @ApiPropertyOptional({
    description: 'Assigned price tier ID',
    example: 'cm987654321',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  priceTierId?: string | null;

  @ApiPropertyOptional({
    description:
      'Active status of the company for soft activation/deactivation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
