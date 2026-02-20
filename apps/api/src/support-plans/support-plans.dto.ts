import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportPlanDto {
  @ApiProperty({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1', description: '対象利用者ID' })
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @ApiPropertyOptional({ example: '作業継続性の改善', description: '支援計画の目標' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '週5日の安定出勤を目指す', description: '支援計画本文' })
  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateSupportPlanDto {
  @ApiPropertyOptional({ example: '一般就労に向けた準備', description: '更新後目標' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '業務手順の定着支援を継続', description: '更新後本文' })
  @IsOptional()
  @IsString()
  content?: string;
}
