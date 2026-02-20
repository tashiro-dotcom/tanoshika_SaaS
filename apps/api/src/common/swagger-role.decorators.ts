import { applyDecorators } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export function ApiRolesNote(...roles: string[]) {
  return applyDecorators(
    ApiExtension('x-roles', roles),
    ApiExtension('x-role-note', `Allowed roles: ${roles.join(', ')}`),
  );
}
