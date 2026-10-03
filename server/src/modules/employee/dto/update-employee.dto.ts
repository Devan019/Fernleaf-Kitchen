import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Full name of the customer employee',
    example: 'Rahul Sharma',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Corporate email of the customer employee',
    example: 'rahul.sharma@google.com',
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description:
      'Move employee to a different Company ID (changes effective pricing, menu, addresses, and calendar)',
    example: 'cm999888777',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can select their own delivery address for orders',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canChooseDeliveryAddress?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can change order delivery time within window',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canChangeDeliveryTime?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can customize meal packaging options',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canChangePackaging?: boolean;

  @ApiPropertyOptional({
    description: 'Catalogue Allergen IDs applicable to this employee',
    example: ['cm444555666'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'Catalogue DietaryTag IDs applicable to this employee',
    example: ['cm777888999'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds?: string[];

  @ApiPropertyOptional({
    description: 'Active status of the employee',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
