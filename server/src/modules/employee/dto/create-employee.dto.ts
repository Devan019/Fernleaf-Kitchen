import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Full name of the customer employee',
    example: 'Rahul Sharma',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Corporate email of the customer employee',
    example: 'rahul@google.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'ID of the company this employee belongs to',
    example: 'cm111222333',
  })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can select their own delivery address for orders',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  canChooseDeliveryAddress?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can change order delivery time within window',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  canChangeDeliveryTime?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can customize meal packaging options',
    example: true,
    default: false,
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
    description: 'Active status of the employee account',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
