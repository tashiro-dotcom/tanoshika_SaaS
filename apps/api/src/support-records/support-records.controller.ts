import { Body, Controller, ForbiddenException, NotFoundException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { toSkipTake } from '../common/pagination.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { ApiRolesNote } from '../common/swagger-role.decorators';
import { PrismaService } from '../prisma.service';
import { CreateSupportRecordDto, ListSupportRecordsQueryDto, UpdateSupportRecordDto } from './support-records.dto';
import { SupportRecordResponseDto } from './support-records.response.dto';

@ApiTags('Support Records')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('support-records')
@UseGuards(RolesGuard)
export class SupportRecordsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '支援記録一覧を取得' })
  @ApiOkResponse({ type: SupportRecordResponseDto, isArray: true })
  list(@Req() req: any, @Query() query: ListSupportRecordsQueryDto) {
    const { skip, take } = toSkipTake(query);
    return this.prisma.supportRecord.findMany({
      where: {
        organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
        ...(query.q ? { content: { contains: query.q } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  @Post()
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '支援記録を作成' })
  @ApiOkResponse({ type: SupportRecordResponseDto })
  async create(@Req() req: any, @Body() body: CreateSupportRecordDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    await this.assertServiceUserInOrganization(body.serviceUserId, org);

    const item = await this.prisma.supportRecord.create({
      data: {
        organizationId: org,
        serviceUserId: body.serviceUserId,
        recordType: body.recordType || 'daily',
        content: body.content,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CREATE',
      entity: 'support_records',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '支援記録を更新' })
  @ApiOkResponse({ type: SupportRecordResponseDto })
  async update(@Req() req: any, @Param() params: IdParamDto, @Body() body: UpdateSupportRecordDto) {
    const { id } = params;
    const existing = await this.prisma.supportRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('not_found');
    if (existing.organizationId !== (req.user.organizationId || ORGANIZATION_DEFAULT)) {
      throw new ForbiddenException('organization_forbidden');
    }

    const item = await this.prisma.supportRecord.update({
      where: { id },
      data: body,
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'UPDATE',
      entity: 'support_records',
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
