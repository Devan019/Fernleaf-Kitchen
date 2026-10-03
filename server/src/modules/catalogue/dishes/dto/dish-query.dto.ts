import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DishTemperature } from '../../../../generated/prisma/enums.js';

export class DishQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search string matching dish name or SKU',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by kitchen station ID',
  })
  @IsOptional()
  @IsString()
  kitchenStationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by serving temperature',
    enum: DishTemperature,
  })
  @IsOptional()
  @IsEnum(DishTemperature)
  temperature?: DishTemperature;
}
