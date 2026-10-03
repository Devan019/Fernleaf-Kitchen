import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePortionSizeDto {
  @ApiProperty({
    description: 'Unique name of the portion size (e.g. Regular, Large, Small)',
    example: 'Regular',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
