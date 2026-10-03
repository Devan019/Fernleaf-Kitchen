import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateKitchenHolidayDto {
  @ApiPropertyOptional({
    description: 'Holiday date in ISO 8601 format (YYYY-MM-DD)',
    example: '2026-12-25',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'date must be a valid ISO 8601 date string (YYYY-MM-DD)' },
  )
  date?: string;

  @ApiPropertyOptional({
    description: 'Name or title of the holiday',
    example: 'Boxing Day',
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name cannot be empty if provided' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional description of the holiday',
    example: 'Kitchen closed for Boxing Day',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(500, { message: 'description cannot exceed 500 characters' })
  description?: string;
}
