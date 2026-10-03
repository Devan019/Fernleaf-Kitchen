import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderGroupPortionDto {
  @ApiProperty({
    description:
      'Ordered array of Portion Size IDs representing the new display sequence',
    type: [String],
    example: ['portion_id_1', 'portion_id_2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedPortionSizeIds!: string[];
}
