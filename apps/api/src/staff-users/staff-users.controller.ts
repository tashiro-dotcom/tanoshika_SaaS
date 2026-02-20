import { Body, Controller, ForbiddenException, NotFoundException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { hash } from 'bcryptjs';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { PaginationQueryDto, toSkipTake } from '../common/pagination.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { ApiRolesNote } from '../common/swagger-role.decorators';
import { PrismaService } from '../prisma.service';
import { CreateStaffUserDto, PatchRoleDto, UpdateStaffUserDto } from './staff-users.dto';
import { StaffUserResponseDto } from './staff-users.response.dto';

@ApiTags('Staff Users')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('staff-users')
@UseGuards(RolesGuard)
export class StaffUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: 'スタッフ一覧を取得' })
  @ApiOkResponse({ type: StaffUserResponseDto, isArray: true })
  list(@Req() req: any, @Query() query: PaginationQueryDto) {
    const { skip, take } = toSkipTake(query);
    return this.prisma.staffUser.findMany({
      where: { organizationId: req.user.organizationId || ORGANIZATION_DEFAULT },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }

  @Post()
  @Roles('admin')
  @ApiRolesNote('admin')
  @ApiOperation({ summary: 'スタッフを作成' })
  @ApiOkResponse({ type: StaffUserResponseDto })
  async create(@Req() req: any, @Body() body: CreateStaffUserDto) {
    const item = await this.prisma.staffUser.create({
      data: {
        organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: await hash(body.password, 10),
        mfaEnabled: !!body.mfaSecret,
        mfaSecret: body.mfaSecret || null,
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'CREATE',
      entity: 'staff_users',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Patch(':id')
  @Roles('admin')
  @ApiRolesNote('admin')
  @ApiOperation({ summary: 'スタッフ情報を更新' })
  @ApiOkResponse({ type: StaffUserResponseDto })
  async update(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateStaffUserDto) {
    const { id } = params;
    return this.updateById(req, id, body);
  }

  @Patch(':id/roles')
  @Roles('admin')
  @ApiRolesNote('admin')
  @ApiOperation({ summary: 'スタッフロールを更新' })
  @ApiOkResponse({ type: StaffUserResponseDto })
  patchRole(@Req() req: any, @Param() params: IdParamDto, @Body() body: PatchRoleDto) {
    const { id } = params;
    return this.updateById(req, id, { role: body.role });
  }

  private async updateById(req: any, id: string, body: UpdateStaffUserDto) {
    const existing = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const data: any = { ...body };
    if (typeof body.password === 'string') {
      data.passwordHash = await hash(body.password, 10);
      delete data.password;
    }

    const item = await this.prisma.staffUser.update({
      where: { id },
      data,
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE',
      entity: 'staff_users',
      entityId: id,
      detail: body,
    });

    return item;
  }
}
