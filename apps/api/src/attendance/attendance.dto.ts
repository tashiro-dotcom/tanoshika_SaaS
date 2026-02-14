import { IsDateString, IsIP, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';

export class ClockInDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class ClockOutDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceUserId?: string;
}

export class AttendanceListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  serviceUserId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateAttendanceCorrectionDto {
  @IsString()
  @MinLength(1)
  attendanceLogId!: string;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsDateString()
  requestedClockInAt?: string;

  @IsOptional()
  @IsDateString()
  requestedClockOutAt?: string;
}
