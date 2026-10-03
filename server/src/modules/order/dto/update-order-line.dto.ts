import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderLineCombinationDto } from './create-order.dto.js';

export class UpdateOrderLineDto {
  @ApiPropertyOptional({
    description: 'Updated total quantity of this dish. Must equal sum of combination quantities.',
    minimum: 1,
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Updated combinations for this line',
    type: [CreateOrderLineCombinationDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineCombinationDto)
  combinations?: CreateOrderLineCombinationDto[];
}
