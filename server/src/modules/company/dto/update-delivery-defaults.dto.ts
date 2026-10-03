import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateDeliveryDefaultsDto {
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
      'Minutes before target delivery time that food must leave kitchen (>= 0)',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'leaveKitchenMinutes must be greater than or equal to 0' })
  leaveKitchenMinutes?: number;

  @ApiPropertyOptional({
    description: 'Default packaging preference for orders',
    example: 'INDIVIDUAL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultPackagingType?: string;

  @ApiPropertyOptional({
    description: 'Standing driver instructions for company deliveries',
    example: 'Park in loading dock B and ring intercom 102',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  standingDriverInstructions?: string;

  @ApiPropertyOptional({
    description:
      'Default driver staff user ID (must be an active staff member with DRIVER role)',
    example: 'cm123456789',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  defaultDriverId?: string | null;
}
