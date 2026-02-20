import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ListSupportRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '作業' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSupportRecordDto {
  @ApiProperty({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1' })
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiProperty({ example: '本日の作業記録' })
  @IsString()
  @MinLength(1)
  content!: string;
}

export class UpdateSupportRecordDto {
  @ApiPropertyOptional({ example: 'interview' })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional({ example: '面談メモ更新' })
  @IsOptional()
  @IsString()
  content?: string;
}
