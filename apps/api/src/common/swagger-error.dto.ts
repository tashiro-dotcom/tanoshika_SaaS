import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'invalid_request' })
  message!: string | string[];

  @ApiProperty({ example: 'BadRequestException' })
  error!: string;

  @ApiProperty({ example: 'P2002', required: false, nullable: true })
  code?: string;

  @ApiProperty({ example: '2026-02-20T05:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/wages/calculate-monthly' })
  path!: string;
}
