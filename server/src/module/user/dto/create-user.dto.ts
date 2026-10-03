import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name should not be empty' })
  name: string;

  @ApiProperty({ description: 'Unique email address', example: 'john@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({ description: 'Staff account password (minimum 8 characters)', example: 'Test@1234' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ description: 'Staff role', enum: UserRole, example: UserRole.KITCHEN })
  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  role: UserRole;
}
