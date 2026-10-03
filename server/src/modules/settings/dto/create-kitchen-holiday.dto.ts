import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateKitchenHolidayDto {
  @ApiProperty({
    description: 'Holiday date in ISO 8601 format (YYYY-MM-DD)',
    example: '2026-12-25',
  })
  @IsDateString(
    {},
    { message: 'date must be a valid ISO 8601 date string (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'date is required' })
  date!: string;

  @ApiProperty({
    description: 'Name or title of the holiday',
    example: 'Christmas Day',
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the holiday',
    example: 'Kitchen closed for Christmas celebrations',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(500, { message: 'description cannot exceed 500 characters' })
  description?: string;
}
