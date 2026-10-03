import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetCompanyOwnerDto {
  @ApiProperty({
    description:
      'ID of the customer employee who will be the company owner (must belong to this company)',
    example: 'cm111222333',
  })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;
}
