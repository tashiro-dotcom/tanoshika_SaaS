import { IsDateString, IsIP, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ClockInDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '打刻対象の利用者ID（userロール時は省略可）' })
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;

  @ApiPropertyOptional({ example: 'web', description: '打刻方法（web/qr/proxy など）' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: '127.0.0.1', description: '打刻元IP（サーバ側で補完される場合あり）' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ example: '福岡市中央区', description: '打刻位置情報メモ' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class ClockOutDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '退勤対象の利用者ID（userロール時は省略可）' })
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;
}

export class AttendanceListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '対象利用者ID（管理者系ロール向け）' })
  @IsOptional()
  @IsUUID()
  serviceUserId?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z', description: '検索開始日時（ISO8601）' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-02-29T23:59:59.999Z', description: '検索終了日時（ISO8601）' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateAttendanceCorrectionDto {
  @ApiProperty({ format: 'uuid', example: '89335df7-b64c-45af-a4f5-941aa7f4ee58', description: '修正対象の勤怠ログID' })
  @IsString()
  @MinLength(1)
  attendanceLogId!: string;

  @ApiProperty({ example: '退勤時刻修正', description: '修正理由' })
  @IsString()
  @MinLength(1)
  reason!: string;

  @ApiPropertyOptional({ example: '2026-02-20T00:00:00.000Z', description: '希望する出勤時刻（ISO8601）' })
  @IsOptional()
  @IsDateString()
  requestedClockInAt?: string;

  @ApiPropertyOptional({ example: '2026-02-20T08:15:00.000Z', description: '希望する退勤時刻（ISO8601）' })
  @IsOptional()
  @IsDateString()
  requestedClockOutAt?: string;
}
