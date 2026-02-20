import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateMonthlyWagesDto {
  @ApiProperty({ example: 2026, minimum: 2020, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
