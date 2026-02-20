import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'ページ番号（1始まり）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, description: '1ページあたり件数' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export function toSkipTake(query: PaginationQueryDto, defaults = { page: 1, limit: 50 }) {
  const rawPage = query.page ?? defaults.page;
  const rawLimit = query.limit ?? defaults.limit;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : defaults.page;
  const safeLimit = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : defaults.limit;
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}
