import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderGroupOptionDto {
  @ApiProperty({
    description:
      'Ordered array of Option IDs representing the new display sequence',
    type: [String],
    example: ['opt_id_1', 'opt_id_2', 'opt_id_3'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedOptionIds!: string[];
}
