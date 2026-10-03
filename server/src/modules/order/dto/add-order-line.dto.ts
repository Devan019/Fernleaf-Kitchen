import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderLineCombinationDto } from './create-order.dto.js';

export class AddOrderLineDto {
  @ApiProperty({ description: 'ID of the dish to add' })
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @ApiProperty({
    description: 'Quantity of the dish. Must equal sum of combination quantities.',
    minimum: 1,
    example: 5,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Preparation combinations for this line',
    type: [CreateOrderLineCombinationDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineCombinationDto)
  combinations!: CreateOrderLineCombinationDto[];
}
