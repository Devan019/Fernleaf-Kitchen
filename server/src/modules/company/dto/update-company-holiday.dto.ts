import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyHolidayDto {
  @ApiPropertyOptional({
    description: 'Updated holiday date in ISO 8601 format (YYYY-MM-DD)',
    example: '2026-12-26',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Updated holiday name',
    example: 'Boxing Day',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated holiday description',
    example: 'Public holiday observed across corporate offices',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
