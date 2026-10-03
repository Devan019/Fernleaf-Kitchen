import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateBillingContactDto {
  @ApiProperty({
    description: 'Name of the billing contact person',
    example: 'Sundar Pichai',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Corporate billing email address',
    example: 'billing@google.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Direct phone number for accounts/billing enquiries',
    example: '+1-650-253-0000',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone!: string;
}
