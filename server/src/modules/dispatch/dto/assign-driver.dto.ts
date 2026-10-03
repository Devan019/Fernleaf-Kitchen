import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDriverDto {
  @ApiProperty({
    description: 'User ID of the staff member with DRIVER role to assign to this drop',
    example: 'user-cuid-123',
  })
  @IsNotEmpty({ message: 'driverId is required' })
  @IsString({ message: 'driverId must be a string' })
  driverId!: string;
}
