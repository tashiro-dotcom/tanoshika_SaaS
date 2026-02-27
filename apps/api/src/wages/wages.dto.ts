import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayStatusHoursPolicy } from './wage-calculation-rules';

export class CalculateMonthlyWagesDto {
  @ApiProperty({ example: 2026, minimum: 2020, maximum: 2100, description: '計算対象年（西暦）' })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 12, description: '計算対象月（1-12）' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class UpdateWageRulesDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 12, description: '標準日時間（有給/特休の換算時間）' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  standardDailyHours!: number;

  @ApiProperty({ example: 'actual_only', enum: ['actual_only', 'fixed_zero', 'fixed_standard'] })
  @IsIn(['actual_only', 'fixed_zero', 'fixed_standard'])
  presentPolicy!: DayStatusHoursPolicy;

  @ApiProperty({ example: 'fixed_zero', enum: ['actual_only', 'fixed_zero', 'fixed_standard'] })
  @IsIn(['actual_only', 'fixed_zero', 'fixed_standard'])
  absentPolicy!: DayStatusHoursPolicy;

  @ApiProperty({ example: 'fixed_standard', enum: ['actual_only', 'fixed_zero', 'fixed_standard'] })
  @IsIn(['actual_only', 'fixed_zero', 'fixed_standard'])
  paidLeavePolicy!: DayStatusHoursPolicy;

  @ApiProperty({ example: 'fixed_zero', enum: ['actual_only', 'fixed_zero', 'fixed_standard'] })
  @IsIn(['actual_only', 'fixed_zero', 'fixed_standard'])
  scheduledHolidayPolicy!: DayStatusHoursPolicy;

  @ApiProperty({ example: 'fixed_standard', enum: ['actual_only', 'fixed_zero', 'fixed_standard'] })
  @IsIn(['actual_only', 'fixed_zero', 'fixed_standard'])
  specialLeavePolicy!: DayStatusHoursPolicy;
}
