import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name should not be empty' })
  name?: string;

  @ApiPropertyOptional({ description: 'Unique email address', example: 'john@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @ApiPropertyOptional({ description: 'Staff account password (minimum 8 characters)', example: 'NewPassword@123' })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @ApiPropertyOptional({ description: 'Staff role', enum: UserRole, example: UserRole.DISPATCH })
  @IsOptional()
  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
