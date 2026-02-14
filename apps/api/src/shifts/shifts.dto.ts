import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class ShiftItemDto {
  @IsString()
  @MinLength(1)
  serviceUserId!: string;

  @IsString()
  @MinLength(1)
  workType!: string;

  @IsDateString()
  shiftDate!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}

export class CreateShiftDto extends ShiftItemDto {}

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  serviceUserId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workType?: string;

  @IsOptional()
  @IsDateString()
  shiftDate?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class BulkShiftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftItemDto)
  items!: ShiftItemDto[];
}
