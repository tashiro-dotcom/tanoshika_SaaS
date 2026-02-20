import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportPlanDto {
  @ApiProperty({ format: 'uuid', example: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1' })
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @ApiPropertyOptional({ example: '作業継続性の改善' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '週5日の安定出勤を目指す' })
  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateSupportPlanDto {
  @ApiPropertyOptional({ example: '一般就労に向けた準備' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '業務手順の定着支援を継続' })
  @IsOptional()
  @IsString()
  content?: string;
}
