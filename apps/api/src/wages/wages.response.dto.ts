import { ApiProperty } from '@nestjs/swagger';

export class MunicipalityTemplateOptionDto {
  @ApiProperty({ example: 'fukuoka' })
  code!: string;

  @ApiProperty({ example: '福岡県様式（MVP）' })
  label!: string;
}

export class WageTemplatesResponseDto {
  @ApiProperty({ type: MunicipalityTemplateOptionDto })
  current!: MunicipalityTemplateOptionDto;

  @ApiProperty({ type: MunicipalityTemplateOptionDto, isArray: true })
  available!: MunicipalityTemplateOptionDto[];
}

export class WageCalculationItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 2 })
  month!: number;

  @ApiProperty({ example: 120.5 })
  totalHours!: number;

  @ApiProperty({ example: 1200 })
  hourlyRate!: number;

  @ApiProperty({ example: 144600 })
  grossAmount!: number;

  @ApiProperty({ example: 0 })
  deductions!: number;

  @ApiProperty({ example: 144600 })
  netAmount!: number;

  @ApiProperty({ example: 'calculated' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class WageCalculateResponseDto {
  @ApiProperty({ example: 1 })
  count!: number;

  @ApiProperty({ type: WageCalculationItemDto, isArray: true })
  items!: WageCalculationItemDto[];
}

export class WageSlipResponseDto {
  @ApiProperty({ format: 'uuid' })
  slipId!: string;

  @ApiProperty({ example: 'org-1' })
  organizationId!: string;

  @ApiProperty({ example: 'A型事業所 本店' })
  organizationName!: string;

  @ApiProperty({ format: 'uuid' })
  serviceUserId!: string;

  @ApiProperty({ example: 'E2E利用者' })
  serviceUserName!: string;

  @ApiProperty({ example: '2026-02' })
  month!: string;

  @ApiProperty({ example: '2026-02-28' })
  closingDate!: string;

  @ApiProperty({ example: 120.5 })
  totalHours!: number;

  @ApiProperty({ example: 1200 })
  hourlyRate!: number;

  @ApiProperty({ example: 144600 })
  grossAmount!: number;

  @ApiProperty({ example: 0 })
  deductions!: number;

  @ApiProperty({ example: 144600 })
  netAmount!: number;

  @ApiProperty({ example: 'approved' })
  status!: string;

  @ApiProperty({ example: '確定済み' })
  statusLabel!: string;

  @ApiProperty({ example: '管理者承認済み' })
  remarks!: string;

  @ApiProperty({ example: 'staff-admin-id' })
  approverId!: string;

  @ApiProperty({ format: 'date-time' })
  issuedAt!: string;
}
