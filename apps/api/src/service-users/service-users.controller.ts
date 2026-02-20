import { Body, Controller, ForbiddenException, NotFoundException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { PaginationQueryDto, toSkipTake } from '../common/pagination.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { PrismaService } from '../prisma.service';
import { CreateServiceUserDto, UpdateServiceUserDto, UpdateServiceUserStatusDto } from './service-users.dto';

@ApiTags('Service Users')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('service-users')
@UseGuards(RolesGuard)
export class ServiceUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '利用者一覧を取得' })
  list(@Req() req: any, @Query() query: PaginationQueryDto) {
    const { skip, take } = toSkipTake(query);
    return this.prisma.serviceUser.findMany({
      where: { organizationId: req.user.organizationId || ORGANIZATION_DEFAULT },
      include: { statusHistory: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }

  @Post()
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '利用者を登録' })
  async create(@Req() req: any, @Body() body: CreateServiceUserDto) {
    const item = await this.prisma.serviceUser.create({
      data: {
        organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
        fullName: body.fullName,
        disabilityCategory: body.disabilityCategory || null,
        contractDate: body.contractDate ? new Date(body.contractDate) : null,
        phone: body.phone || null,
        emergencyContact: body.emergencyContact || null,
        status: body.status || 'active',
        statusHistory: {
          create: {
            organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
            status: body.status || 'active',
          },
        },
      },
      include: { statusHistory: true },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'CREATE',
      entity: 'service_users',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '利用者情報を更新' })
  async update(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateServiceUserDto) {
    const { id } = params;
    const existing = await this.prisma.serviceUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const data: any = { ...body };
    if (body.contractDate) data.contractDate = new Date(body.contractDate);

    const item = await this.prisma.serviceUser.update({
      where: { id },
      data,
      include: { statusHistory: true },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE',
      entity: 'service_users',
      entityId: id,
      detail: body,
    });

    return item;
  }

  @Patch(':id/status')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '利用者ステータスを更新' })
  async updateStatus(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateServiceUserStatusDto) {
    const { id } = params;
    const existing = await this.prisma.serviceUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const item = await this.prisma.serviceUser.update({
      where: { id },
      data: {
        status: body.status,
        statusHistory: {
          create: {
            organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
            status: body.status,
          },
        },
      },
      include: { statusHistory: true },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE_STATUS',
      entity: 'service_users',
      entityId: id,
      detail: body,
    });

    return item;
  }
}
