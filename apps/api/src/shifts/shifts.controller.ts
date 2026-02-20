import { Body, Controller, ForbiddenException, NotFoundException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { PaginationQueryDto, toSkipTake } from '../common/pagination.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { ApiRolesNote } from '../common/swagger-role.decorators';
import { PrismaService } from '../prisma.service';
import { BulkShiftDto, CreateShiftDto, UpdateShiftDto } from './shifts.dto';
import { BulkShiftResponseDto, ShiftResponseDto } from './shifts.response.dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('shifts')
@UseGuards(RolesGuard)
export class ShiftsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'シフト一覧を取得' })
  @ApiOkResponse({ type: ShiftResponseDto, isArray: true })
  list(@Req() req: any, @Query() query: PaginationQueryDto) {
    const { skip, take } = toSkipTake(query);
    return this.prisma.shift.findMany({
      where: { organizationId: req.user.organizationId || ORGANIZATION_DEFAULT },
      orderBy: [{ shiftDate: 'asc' }, { startAt: 'asc' }],
      skip,
      take,
    });
  }

  @Post()
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'シフトを作成' })
  @ApiOkResponse({ type: ShiftResponseDto })
  async create(@Req() req: any, @Body() body: CreateShiftDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    await this.assertServiceUserInOrganization(body.serviceUserId, org);

    const item = await this.prisma.shift.create({
      data: {
        organizationId: org,
        serviceUserId: body.serviceUserId,
        workType: body.workType,
        shiftDate: new Date(body.shiftDate),
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CREATE',
      entity: 'shifts',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'シフトを更新' })
  @ApiOkResponse({ type: ShiftResponseDto })
  async update(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateShiftDto) {
    const { id } = params;
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const data: any = { ...body };
    if (body.shiftDate) data.shiftDate = new Date(body.shiftDate);
    if (body.startAt) data.startAt = new Date(body.startAt);
    if (body.endAt) data.endAt = new Date(body.endAt);

    const item = await this.prisma.shift.update({ where: { id }, data });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE',
      entity: 'shifts',
      entityId: id,
      detail: body,
    });

    return item;
  }

  @Post('bulk')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'シフトを一括作成' })
  @ApiOkResponse({ type: BulkShiftResponseDto })
  async bulk(@Req() req: any, @Body() body: BulkShiftDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    for (const entry of body.items) {
      await this.assertServiceUserInOrganization(entry.serviceUserId, org);
    }

    const items = await Promise.all(
      body.items.map((entry) =>
        this.prisma.shift.create({
          data: {
            organizationId: org,
            serviceUserId: entry.serviceUserId,
            workType: entry.workType,
            shiftDate: new Date(entry.shiftDate),
            startAt: new Date(entry.startAt),
            endAt: new Date(entry.endAt),
          },
        }),
      ),
    );

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'BULK_CREATE',
      entity: 'shifts',
      entityId: 'bulk',
      detail: { count: items.length },
    });

    return { count: items.length, items };
  }

  private async assertServiceUserInOrganization(serviceUserId: string, organizationId: string) {
    const serviceUser = await this.prisma.serviceUser.findUnique({ where: { id: serviceUserId } });
    if (!serviceUser) throw new ForbiddenException('service_user_not_found');
    if (serviceUser.organizationId !== organizationId) {
      throw new ForbiddenException('organization_forbidden');
    }
  }
}
