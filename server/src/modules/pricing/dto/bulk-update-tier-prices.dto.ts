import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkDishPriceItemDto {
  @ApiProperty({
    description: 'Target dish ID to price',
    example: 'cm123456789',
  })
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @ApiProperty({
    description: 'Selling price for the dish (must be > 0)',
    example: 12.5,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must have at most 2 decimal places' },
  )
  @Min(0.01, { message: 'Price must be greater than 0' })
  price!: number;
}

export class BulkUpdateTierPricesDto {
  @ApiProperty({
    description: 'List of dish price updates to apply transactionally',
    type: [BulkDishPriceItemDto],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Prices list cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => BulkDishPriceItemDto)
  prices!: BulkDishPriceItemDto[];
}
