import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ListSupportRecordsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSupportRecordDto {
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @IsOptional()
  @IsString()
  recordType?: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class UpdateSupportRecordDto {
  @IsOptional()
  @IsString()
  recordType?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
