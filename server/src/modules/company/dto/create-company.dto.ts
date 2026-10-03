import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Unique corporate name of the customer company',
    example: 'Google',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description:
      'Initial corporate email domains belonging to the company (e.g. ["google.com"])',
    example: ['google.com'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

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
      'Minutes before target delivery time that food must leave kitchen (default 60)',
    example: 60,
    default: 60,
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
    example: 'Deliver to main reception on 2nd floor, ask for security escort',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  standingDriverInstructions?: string;

  @ApiPropertyOptional({
    description: 'Default driver staff user ID (must have DRIVER role)',
    example: 'cm123456789',
  })
  @IsOptional()
  @IsString()
  defaultDriverId?: string;

  @ApiPropertyOptional({
    description: 'Optional assigned price tier ID',
    example: 'cm987654321',
  })
  @IsOptional()
  @IsString()
  priceTierId?: string;

  @ApiPropertyOptional({
    description: 'Active status of the company (defaults to true)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
