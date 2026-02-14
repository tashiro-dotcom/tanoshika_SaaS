import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

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
