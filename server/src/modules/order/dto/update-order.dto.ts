import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateOrderLineDto } from './create-order.dto.js';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Updated delivery date in YYYY-MM-DD format',
    example: '2026-10-11',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery time in HH:mm format',
    example: '13:00',
  })
  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery address ID',
  })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({
    description: 'Updated packaging type',
    example: 'ECO',
  })
  @IsOptional()
  @IsString()
  packagingType?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery instructions',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @ApiPropertyOptional({
    description: 'Updated order lines. If provided, replaces existing lines with the new items.',
    type: [CreateOrderLineDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines?: CreateOrderLineDto[];
}
