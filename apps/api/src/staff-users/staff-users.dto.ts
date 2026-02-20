import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const roles = ['admin', 'manager', 'staff', 'user'] as const;

export class CreateStaffUserDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '支援スタッフA' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'staff', enum: roles })
  @IsString()
  @IsIn(roles)
  role!: string;

  @ApiProperty({ example: 'Staff123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'JBSWY3DPEHPK3PXP' })
  @IsOptional()
  @IsString()
  mfaSecret?: string;
}

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: 'staff-updated@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '支援スタッフB' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'manager', enum: roles })
  @IsOptional()
  @IsString()
  @IsIn(roles)
  role?: string;

  @ApiPropertyOptional({ example: 'Updated123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  mfaEnabled?: boolean;

  @ApiPropertyOptional({ example: 'JBSWY3DPEHPK3PXP' })
  @IsOptional()
  @IsString()
  mfaSecret?: string;
}

export class PatchRoleDto {
  @ApiProperty({ example: 'manager', enum: roles })
  @IsString()
  @IsIn(roles)
  role!: string;
}
