import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliveryDropStatus } from '../../../generated/prisma/enums.js';

export class DispatchBoardQueryDto {
  @ApiProperty({
    description: 'Target delivery date (YYYY-MM-DD)',
    example: '2026-10-14',
  })
  @IsNotEmpty({ message: 'deliveryDate is required' })
  @IsDateString({}, { message: 'deliveryDate must be a valid ISO date string (YYYY-MM-DD)' })
  deliveryDate!: string;

  @ApiPropertyOptional({
    description: 'Filter drops by delivery drop status',
    enum: DeliveryDropStatus,
  })
  @IsOptional()
  @IsEnum(DeliveryDropStatus, {
    message: `status must be one of: ${Object.values(DeliveryDropStatus).join(', ')}`,
  })
  status?: DeliveryDropStatus;

  @ApiPropertyOptional({
    description: 'Filter drops by assigned driver user ID',
  })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({
    description: 'Filter drops by company ID',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
