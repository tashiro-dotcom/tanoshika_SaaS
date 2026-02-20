import { ApiProperty } from '@nestjs/swagger';

export class SupportPlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ example: '作業継続性の改善' })
  goal!: string;

  @ApiProperty({ example: '週5日の安定出勤を目指す' })
  content!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
