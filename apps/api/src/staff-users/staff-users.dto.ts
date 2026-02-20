import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const roles = ['admin', 'manager', 'staff', 'user'] as const;

export class CreateStaffUserDto {
  @ApiProperty({ example: 'staff@example.com', description: 'スタッフのメールアドレス（ログインID）' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '支援スタッフA', description: 'スタッフ表示名' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'staff', enum: roles, description: 'ロール（admin/manager/staff/user）' })
  @IsString()
  @IsIn(roles)
  role!: string;

  @ApiProperty({ example: 'Staff123!', minLength: 8, description: '初期パスワード（8文字以上）' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'JBSWY3DPEHPK3PXP', description: 'TOTPシークレット（MFA有効化時）' })
  @IsOptional()
  @IsString()
  mfaSecret?: string;
}

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: 'staff-updated@example.com', description: '更新後メールアドレス' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '支援スタッフB', description: '更新後表示名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'manager', enum: roles, description: '更新後ロール' })
  @IsOptional()
  @IsString()
  @IsIn(roles)
  role?: string;

  @ApiPropertyOptional({ example: 'Updated123!', minLength: 8, description: '更新後パスワード（8文字以上）' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: true, description: 'MFA有効フラグ' })
  @IsOptional()
  @IsBoolean()
  mfaEnabled?: boolean;

  @ApiPropertyOptional({ example: 'JBSWY3DPEHPK3PXP', description: '更新後TOTPシークレット' })
  @IsOptional()
  @IsString()
  mfaSecret?: string;
}

export class PatchRoleDto {
  @ApiProperty({ example: 'manager', enum: roles, description: '付与するロール' })
  @IsString()
  @IsIn(roles)
  role!: string;
}
