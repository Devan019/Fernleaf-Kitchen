import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { KitchenUnitStatus } from '../../../generated/prisma/enums.js';

export class KitchenBoardQueryDto {
  @ApiProperty({
    description: 'Target delivery date in YYYY-MM-DD format',
    example: '2026-10-14',
  })
  @IsNotEmpty({ message: 'deliveryDate is required' })
  @IsISO8601({ strict: true }, { message: 'deliveryDate must be a valid ISO 8601 date string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'deliveryDate must be in YYYY-MM-DD format',
  })
  deliveryDate: string;

  @ApiPropertyOptional({
    description: 'Filter by kitchen station ID (or empty string/null for unassigned)',
  })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional({
    enum: KitchenUnitStatus,
    description: 'Filter by unit preparation status (PENDING, STARTED, DONE)',
  })
  @IsOptional()
  @IsEnum(KitchenUnitStatus, {
    message: 'status must be a valid KitchenUnitStatus (PENDING, STARTED, DONE)',
  })
  status?: KitchenUnitStatus;
}
