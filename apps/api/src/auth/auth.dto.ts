import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'ログインに使用するメールアドレス' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Admin123!', minLength: 8, description: 'ログインパスワード（8文字以上）' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyMfaDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.challenge-token', description: 'ログイン時に払い出されるMFAチャレンジトークン' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ example: '123456', description: 'TOTPワンタイムコード（6桁）' })
  @IsString()
  @IsNotEmpty()
  otp!: string;
}

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token', description: '再発行に利用するリフレッシュトークン' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token', description: '無効化対象のリフレッシュトークン' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: true, description: 'MFA入力が必要な場合 true' })
  mfaRequired!: boolean;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.challenge', description: 'MFA検証に利用するチャレンジトークン' })
  challengeToken!: string;

  @ApiProperty({ example: 'admin@example.com', description: 'ログイン対象ユーザーのメールアドレス' })
  email!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access', description: 'API呼び出し用アクセストークン' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh', description: '再発行用リフレッシュトークン' })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'アクセストークン有効秒数' })
  expiresIn!: number;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true, description: 'ログアウト処理結果' })
  success!: boolean;
}
