import { ApiProperty } from '@nestjs/swagger';

export class AttendanceLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 'web' })
  method!: string;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ example: '福岡市中央区', nullable: true })
  location!: string | null;

  @ApiProperty({ format: 'date-time' })
  clockInAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  clockOutAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AttendanceCorrectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  attendanceLogId!: string;

  @ApiProperty({ example: '退勤時刻修正' })
  reason!: string;

  @ApiProperty({ format: 'uuid' })
  requestedBy!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  requestedClockInAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  requestedClockOutAt!: string | null;

  @ApiProperty({ example: 'requested' })
  status!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  approvedBy!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AttendanceDayStatusResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ format: 'date-time', example: '2026-02-26T00:00:00.000Z' })
  workDate!: string;

  @ApiProperty({ example: 'paid_leave' })
  status!: string;

  @ApiProperty({ nullable: true, example: '通院のため有給' })
  note!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ format: 'uuid' })
  updatedBy!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
