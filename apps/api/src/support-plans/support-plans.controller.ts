import { Body, Controller, ForbiddenException, NotFoundException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { PaginationQueryDto, toSkipTake } from '../common/pagination.dto';
import { PrismaService } from '../prisma.service';
import { CreateSupportPlanDto, UpdateSupportPlanDto } from './support-plans.dto';

@Controller('support-plans')
@UseGuards(RolesGuard)
export class SupportPlansController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  list(@Req() req: any, @Query() query: PaginationQueryDto) {
    const { skip, take } = toSkipTake(query);
    return this.prisma.supportPlan.findMany({
      where: { organizationId: req.user.organizationId || ORGANIZATION_DEFAULT },
      orderBy: [{ serviceUserId: 'asc' }, { version: 'desc' }],
      skip,
      take,
    });
  }

  @Post()
  @Roles('admin', 'manager', 'staff')
  async create(@Req() req: any, @Body() body: CreateSupportPlanDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    await this.assertServiceUserInOrganization(body.serviceUserId, org);

    const latest = await this.prisma.supportPlan.findFirst({
      where: {
        organizationId: org,
        serviceUserId: body.serviceUserId,
      },
      orderBy: { version: 'desc' },
    });

    const item = await this.prisma.supportPlan.create({
      data: {
        organizationId: org,
        serviceUserId: body.serviceUserId,
        version: (latest?.version || 0) + 1,
        goal: body.goal || '',
        content: body.content || '',
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CREATE',
      entity: 'support_plans',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff')
  async update(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateSupportPlanDto) {
    const { id } = params;
    const existing = await this.prisma.supportPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const item = await this.prisma.supportPlan.update({
      where: { id },
      data: body,
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE',
      entity: 'support_plans',
      entityId: id,
      detail: body,
    });

    return item;
  }

  private async assertServiceUserInOrganization(serviceUserId: string, organizationId: string) {
    const serviceUser = await this.prisma.serviceUser.findUnique({ where: { id: serviceUserId } });
    if (!serviceUser) throw new NotFoundException('service_user_not_found');
    if (serviceUser.organizationId !== organizationId) {
      throw new ForbiddenException('organization_forbidden');
    }
  }
}
