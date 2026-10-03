import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class SetDishPriceDto {
  @ApiProperty({
    description: 'Explicit selling price for the dish (must be > 0)',
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
