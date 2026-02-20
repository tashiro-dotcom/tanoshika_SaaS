import { ApiProperty } from '@nestjs/swagger';

class AttendanceLogSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 'web' })
  method!: string;

  @ApiProperty({ format: 'date-time' })
  clockInAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  clockOutAt!: string | null;
}

class WageCalculationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 2 })
  month!: number;

  @ApiProperty({ example: 144600 })
  netAmount!: number;

  @ApiProperty({ example: 'approved' })
  status!: string;
}

class SupportRecordSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'daily' })
  recordType!: string;

  @ApiProperty({ example: '本日の作業状況' })
  content!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

class SupportPlanSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ example: '一般就労に向けた作業安定化' })
  goal!: string;
}

export class AttendanceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 10 })
  totalRecords!: number;

  @ApiProperty({ type: AttendanceLogSummaryDto, isArray: true })
  latest!: AttendanceLogSummaryDto[];
}

export class WageSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 6 })
  totalMonths!: number;

  @ApiProperty({ type: WageCalculationSummaryDto, isArray: true })
  latest!: WageCalculationSummaryDto[];
}

export class SupportSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ type: SupportPlanSummaryDto, nullable: true })
  latestPlan!: SupportPlanSummaryDto | null;

  @ApiProperty({ type: SupportRecordSummaryDto, isArray: true })
  latestRecords!: SupportRecordSummaryDto[];
}
