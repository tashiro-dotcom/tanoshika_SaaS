import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTPステータスコード' })
  statusCode!: number;

  @ApiProperty({ example: 'invalid_request', description: 'エラー内容（文字列または配列）' })
  message!: string | string[];

  @ApiProperty({ example: 'BadRequestException', description: 'エラー種別' })
  error!: string;

  @ApiProperty({ example: 'P2002', required: false, nullable: true, description: '内部エラーコード（任意）' })
  code?: string;

  @ApiProperty({ example: '2026-02-20T05:30:00.000Z', description: 'エラー発生時刻(UTC)' })
  timestamp!: string;

  @ApiProperty({ example: '/wages/calculate-monthly', description: 'リクエストパス' })
  path!: string;
}
