import { IsDateString, IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

const statuses = ['tour', 'trial', 'interview', 'active', 'leaving', 'left'] as const;

export class CreateServiceUserDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @IsIn(statuses)
  status?: string;
}

export class UpdateServiceUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
  disabilityCategory?: string;

  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @IsOptional()
  @IsPhoneNumber('JP')
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdateServiceUserStatusDto {
  @IsString()
  @IsIn(statuses)
  status!: string;
}
