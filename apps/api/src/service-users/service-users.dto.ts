import { IsDateString, IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const statuses = ['tour', 'trial', 'interview', 'active', 'leaving', 'left'] as const;

export class CreateServiceUserDto {
  @ApiProperty({ example: '山田 太郎' })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiPropertyOptional({ example: '身体' })
  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ example: '09012345678' })
  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @ApiPropertyOptional({ example: '母 09000000000' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'active', enum: statuses })
  @IsOptional()
  @IsString()
  @IsIn(statuses)
  status?: string;
}

export class UpdateServiceUserDto {
  @ApiPropertyOptional({ example: '山田 太郎' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiPropertyOptional({ example: '精神' })
  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ example: '09012345678' })
  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @ApiPropertyOptional({ example: '父 09000000001' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdateServiceUserStatusDto {
  @ApiProperty({ example: 'active', enum: statuses })
  @IsString()
  @IsIn(statuses)
  status!: string;
}
