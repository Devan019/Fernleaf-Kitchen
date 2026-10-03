import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { BillingAdjustmentType } from '../../../generated/prisma/enums.js';

export class InvoiceAdjustmentDto {
  @ApiProperty({
    description: 'ID of the invoiced order being adjusted',
    example: 'order-cuid-1',
  })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required' })
  orderId!: string;

  @ApiProperty({
    description: 'Reason for the adjustment (e.g. "Short delivery", "Order cancelled")',
    example: 'Short delivery of 2 meals',
  })
  @IsString()
  @IsNotEmpty({ message: 'Adjustment reason is required' })
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Adjustment type (DEBIT or CREDIT). Required if specifying explicit amount.',
    enum: BillingAdjustmentType,
  })
  @IsOptional()
  @IsEnum(BillingAdjustmentType)
  type?: BillingAdjustmentType;

  @ApiPropertyOptional({
    description:
      'Explicit adjustment amount (positive decimal string e.g. "20.00"). Used with type.',
    example: '20.00',
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Adjustment amount must be a valid numeric string' })
  amount?: string;

  @ApiPropertyOptional({
    description:
      'New final billable amount for the order (e.g. "80.00"). The service will automatically determine CREDIT/DEBIT based on difference from current effective invoiced amount.',
    example: '80.00',
  })
  @IsOptional()
  @IsNumberString({}, { message: 'New billable amount must be a valid numeric string' })
  newBillableAmount?: string;
}
