import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCompanyHolidayDto {
  @ApiProperty({
    description: 'Holiday date in ISO 8601 format (YYYY-MM-DD)',
    example: '2026-12-25',
  })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({
    description: 'Name or title of the holiday',
    example: 'Christmas Day',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the holiday',
    example: 'Office closed for Christmas celebrations',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
