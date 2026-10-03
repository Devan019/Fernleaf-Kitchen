import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCompanyDomainDto {
  @ApiProperty({
    description:
      'Corporate email domain to register for the company (e.g. google.com)',
    example: 'google.com',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  domain!: string;
}
