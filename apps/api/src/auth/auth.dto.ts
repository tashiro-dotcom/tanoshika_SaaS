import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Admin123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyMfaDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.challenge-token' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp!: string;
}

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  mfaRequired!: boolean;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.challenge' })
  challengeToken!: string;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh' })
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
