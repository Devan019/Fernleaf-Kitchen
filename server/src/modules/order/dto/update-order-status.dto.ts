import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/enums.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Target order status',
    enum: OrderStatus,
    example: OrderStatus.PLACED,
  })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({
    description: 'Note explaining the status transition',
    example: 'Staff approved change',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Employee called in sick',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProcessCutoffDto {
  @ApiProperty({
    description: 'Delivery date to process cut-off for (YYYY-MM-DD)',
    example: '2026-10-10',
  })
  @IsDateString()
  @IsNotEmpty()
  deliveryDate!: string;
}
