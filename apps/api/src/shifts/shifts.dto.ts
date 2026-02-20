import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShiftItemDto {
  @ApiProperty({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '対象利用者ID' })
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @ApiProperty({ example: 'packaging', description: '作業種別コード/名称' })
  @IsString()
  @MinLength(1)
  workType!: string;

  @ApiProperty({ example: '2026-02-20T00:00:00.000Z', description: 'シフト日（ISO8601）' })
  @IsDateString()
  shiftDate!: string;

  @ApiProperty({ example: '2026-02-20T01:00:00.000Z', description: '開始時刻（ISO8601）' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-02-20T05:00:00.000Z', description: '終了時刻（ISO8601）' })
  @IsDateString()
  endAt!: string;
}

export class CreateShiftDto extends ShiftItemDto {}

export class UpdateShiftDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '更新後利用者ID' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  serviceUserId?: string;

  @ApiPropertyOptional({ example: 'cleaning', description: '更新後作業種別' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  workType?: string;

  @ApiPropertyOptional({ example: '2026-02-20T00:00:00.000Z', description: '更新後シフト日（ISO8601）' })
  @IsOptional()
  @IsDateString()
  shiftDate?: string;

  @ApiPropertyOptional({ example: '2026-02-20T01:00:00.000Z', description: '更新後開始時刻（ISO8601）' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-02-20T05:00:00.000Z', description: '更新後終了時刻（ISO8601）' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class BulkShiftDto {
  @ApiProperty({ type: ShiftItemDto, isArray: true, description: '一括登録するシフト配列' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftItemDto)
  items!: ShiftItemDto[];
}
