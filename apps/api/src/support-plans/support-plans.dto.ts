import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSupportPlanDto {
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateSupportPlanDto {
  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
