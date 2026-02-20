import { IsDateString, IsIP, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ClockInDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1' })
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;

  @ApiPropertyOptional({ example: 'web' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: '127.0.0.1' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ example: '福岡市中央区' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class ClockOutDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1' })
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;
}

export class AttendanceListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1' })
  @IsOptional()
  @IsUUID()
  serviceUserId?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-02-29T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateAttendanceCorrectionDto {
  @ApiProperty({ format: 'uuid', example: '89335df7-b64c-45af-a4f5-941aa7f4ee58' })
  @IsString()
  @MinLength(1)
  attendanceLogId!: string;

  @ApiProperty({ example: '退勤時刻修正' })
  @IsString()
  @MinLength(1)
  reason!: string;

  @ApiPropertyOptional({ example: '2026-02-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  requestedClockInAt?: string;

  @ApiPropertyOptional({ example: '2026-02-20T08:15:00.000Z' })
  @IsOptional()
  @IsDateString()
  requestedClockOutAt?: string;
}
