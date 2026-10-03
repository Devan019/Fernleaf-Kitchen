import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DishTemperature } from '../../../../generated/prisma/enums.js';

export class CreateDishDto {
  @ApiProperty({
    description: 'Name of the dish (e.g. Paneer Rice Bowl)',
    example: 'Paneer Rice Bowl',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the dish',
    example: 'A warm spiced cottage cheese bowl with aromatic basmati rice.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Unique internal SKU identifier',
    example: 'DISH-PNR-001',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku!: string;

  @ApiProperty({
    description: 'Serving temperature of the dish (HOT or COLD)',
    enum: DishTemperature,
    example: DishTemperature.HOT,
  })
  @IsEnum(DishTemperature)
  temperature!: DishTemperature;

  @ApiProperty({
    description: 'Cost price of the dish (must be >= 0)',
    example: 4.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price must not be negative' })
  costPrice!: number;

  @ApiPropertyOptional({
    description: 'Minimum order quantity (must be > 0 if provided)',
    example: 5,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimum order quantity must be greater than 0' })
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({
    description: 'Kitchen station ID assigned to cook this dish',
    example: 'clxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  kitchenStationId?: string;

  @ApiPropertyOptional({
    description: 'List of Allergen IDs present in this dish',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'List of Dietary Tag IDs relevant to this dish',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds?: string[];
}
