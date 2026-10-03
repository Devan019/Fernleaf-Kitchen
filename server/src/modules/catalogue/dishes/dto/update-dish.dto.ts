import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DishTemperature } from '../../../../generated/prisma/enums.js';

export class UpdateDishDto {
  @ApiPropertyOptional({
    description: 'Updated name of the dish',
    example: 'Special Paneer Rice Bowl',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the dish',
    example: 'Special cottage cheese bowl served with aromatic basmati rice.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated SKU',
    example: 'DISH-PNR-002',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Serving temperature (HOT or COLD)',
    enum: DishTemperature,
    example: DishTemperature.HOT,
  })
  @IsOptional()
  @IsEnum(DishTemperature)
  temperature?: DishTemperature;

  @ApiPropertyOptional({
    description: 'Updated cost price (must be >= 0)',
    example: 5.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price must not be negative' })
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum order quantity (must be > 0 if provided)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimum order quantity must be greater than 0' })
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({
    description: 'Kitchen station ID, or null to unassign',
    example: 'clxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  kitchenStationId?: string | null;

  @ApiPropertyOptional({
    description: 'List of Allergen IDs',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'List of Dietary Tag IDs',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds?: string[];
}
