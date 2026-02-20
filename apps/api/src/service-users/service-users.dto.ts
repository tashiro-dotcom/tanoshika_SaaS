import { IsDateString, IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const statuses = ['tour', 'trial', 'interview', 'active', 'leaving', 'left'] as const;

export class CreateServiceUserDto {
  @ApiProperty({ example: '山田 太郎', description: '利用者氏名' })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiPropertyOptional({ example: '身体', description: '障害区分メモ' })
  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z', description: '契約日（ISO8601）' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ example: '09012345678', description: '連絡先電話番号（JP形式）' })
  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @ApiPropertyOptional({ example: '母 09000000000', description: '緊急連絡先メモ' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'active', enum: statuses, description: '初期在籍ステータス' })
  @IsOptional()
  @IsString()
  @IsIn(statuses)
  status?: string;
}

export class UpdateServiceUserDto {
  @ApiPropertyOptional({ example: '山田 太郎', description: '更新後氏名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiPropertyOptional({ example: '精神', description: '更新後障害区分メモ' })
  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z', description: '更新後契約日（ISO8601）' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ example: '09012345678', description: '更新後電話番号（JP形式）' })
  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @ApiPropertyOptional({ example: '父 09000000001', description: '更新後緊急連絡先メモ' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdateServiceUserStatusDto {
  @ApiProperty({ example: 'active', enum: statuses, description: '変更先在籍ステータス' })
  @IsString()
  @IsIn(statuses)
  status!: string;
}
