import { ApiProperty } from '@nestjs/swagger';

export class ShiftResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 'packaging' })
  workType!: string;

  @ApiProperty({ format: 'date-time' })
  shiftDate!: string;

  @ApiProperty({ format: 'date-time' })
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  endAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class BulkShiftResponseDto {
  @ApiProperty({ example: 2 })
  count!: number;

  @ApiProperty({ type: ShiftResponseDto, isArray: true })
  items!: ShiftResponseDto[];
}
