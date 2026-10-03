import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/enums.js';

export class CreateOrderCombinationOptionDto {
  @ApiProperty({ description: 'ID of the option group' })
  @IsString()
  @IsNotEmpty()
  optionGroupId!: string;

  @ApiProperty({ description: 'ID of the catalogue option' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @ApiPropertyOptional({ description: 'ID of the portion size, if applicable' })
  @IsOptional()
  @IsString()
  portionSizeId?: string;
}

export class CreateOrderLineCombinationDto {
  @ApiProperty({
    description: 'Quantity of dishes prepared with this specific combination of options',
    minimum: 1,
    example: 4,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Selected options for this combination',
    type: [CreateOrderCombinationOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderCombinationOptionDto)
  options: CreateOrderCombinationOptionDto[] = [];
}

export class CreateOrderLineDto {
  @ApiProperty({ description: 'ID of the dish to order' })
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @ApiProperty({
    description: 'Total quantity of this dish ordered. Must equal the sum of combination quantities.',
    minimum: 1,
    example: 10,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Option combinations for this dish line (sum of combination quantities must equal line quantity)',
    type: [CreateOrderLineCombinationDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineCombinationDto)
  combinations!: CreateOrderLineCombinationDto[];
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer Employee ID for whom the order is created' })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({
    description: 'Delivery date in YYYY-MM-DD format',
    example: '2026-10-10',
  })
  @IsDateString()
  deliveryDate!: string;

  @ApiPropertyOptional({
    description: 'Requested delivery time in HH:mm format',
    example: '12:30',
  })
  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Specific company delivery address ID. If omitted or not allowed, company default is used.',
  })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({
    description: 'Packaging type (e.g. STANDARD, ECO). If omitted, company default is used.',
    example: 'STANDARD',
  })
  @IsOptional()
  @IsString()
  packagingType?: string;

  @ApiPropertyOptional({
    description: 'Custom delivery instructions for this order',
    example: 'Leave at 4th floor reception',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @ApiPropertyOptional({
    description: 'Initial order status. Defaults to DRAFT if omitted.',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = OrderStatus.DRAFT;

  @ApiProperty({
    description: 'Order lines (dishes, quantities, and preparation combinations)',
    type: [CreateOrderLineDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];
}
