import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamDto {
  @ApiProperty({ format: 'uuid', description: '対象レコードID', example: 'd7bcf582-60ba-4825-a908-7e7c7f2b8c4f' })
  @IsUUID()
  id!: string;
}
