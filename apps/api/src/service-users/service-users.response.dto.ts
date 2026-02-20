import { ApiProperty } from '@nestjs/swagger';

class ServiceUserStatusHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ServiceUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ example: 'E2E利用者' })
  fullName!: string;

  @ApiProperty({ example: '身体', nullable: true })
  disabilityCategory!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  contractDate!: string | null;

  @ApiProperty({ example: '09012345678', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: '母 09000000000', nullable: true })
  emergencyContact!: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: ServiceUserStatusHistoryResponseDto, isArray: true })
  statusHistory!: ServiceUserStatusHistoryResponseDto[];
}
