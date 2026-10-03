import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkDeliveredDto {
  @ApiPropertyOptional({
    description: 'Optional operational delivery note from the driver',
    example: 'Left packages with reception desk on ground floor.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'note must not exceed 500 characters' })
  note?: string;

  @ApiPropertyOptional({
    description: 'Optional delivery photo URL or storage reference key',
    example: 'https://storage.local/catalogue/delivery/drops/drop-123/proof.webp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'photoUrl must not exceed 1000 characters' })
  photoUrl?: string;
}
