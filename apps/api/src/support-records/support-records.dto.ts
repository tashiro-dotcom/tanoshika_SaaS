import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ListSupportRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '作業', description: '全文検索キーワード（content部分一致）' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSupportRecordDto {
  @ApiProperty({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '対象利用者ID' })
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @ApiPropertyOptional({ example: 'daily', description: '記録種別（daily/interview など）' })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiProperty({ example: '本日の作業記録', description: '支援記録本文' })
  @IsString()
  @MinLength(1)
  content!: string;
}

export class UpdateSupportRecordDto {
  @ApiPropertyOptional({ example: 'interview', description: '更新後記録種別' })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional({ example: '面談メモ更新', description: '更新後本文' })
  @IsOptional()
  @IsString()
  content?: string;
}
