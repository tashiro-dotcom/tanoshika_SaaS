import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { ApiRolesNote } from '../common/swagger-role.decorators';
import { PrismaService } from '../prisma.service';
import { CalculateMonthlyWagesDto, RejectWageRuleRequestDto, UpdateWageRulesDto, WageRuleRequestQueryDto } from './wages.dto';
import { applyWageRuleOverride, AttendanceDayStatusRule, DayStatusHoursPolicy } from './wage-calculation-rules';
import { getMunicipalityTemplate, listMunicipalityTemplates, WageSlipView } from './wage-slip-template';
import {
  WageCalculateResponseDto,
  WageRuleChangeRequestItemDto,
  WageCalculationItemDto,
  WageRulesResponseDto,
  WageSlipResponseDto,
  WageTemplatesResponseDto,
} from './wages.response.dto';

function hoursBetween(start: Date, end: Date | null): number {
  if (!end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 1000 / 60 / 60);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@ApiTags('Wages')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('wages')
@UseGuards(RolesGuard)
export class WagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('rules')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '賃金計算ルールを取得' })
  @ApiOkResponse({ type: WageRulesResponseDto })
  async getRules(@Req() req: any) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const rules = await this.getWageRules(org);
    return {
      standardDailyHours: rules.standardDailyHours,
      presentPolicy: rules.statusPolicies.present,
      absentPolicy: rules.statusPolicies.absent,
      paidLeavePolicy: rules.statusPolicies.paid_leave,
      scheduledHolidayPolicy: rules.statusPolicies.scheduled_holiday,
      specialLeavePolicy: rules.statusPolicies.special_leave,
    };
  }

  @Get('rules/requests')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金ルール変更申請を一覧取得' })
  @ApiOkResponse({ type: WageRuleChangeRequestItemDto, isArray: true })
  async listRuleRequests(@Req() req: any, @Query() query: WageRuleRequestQueryDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const createdAtWhere =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;
    const rows = await this.prisma.wageRuleChangeRequest.findMany({
      where: {
        organizationId: org,
        ...(query.status ? { status: query.status } : {}),
        ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows;
  }

  @Post('rules/requests')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金ルール変更申請を作成' })
  @ApiOkResponse({ type: WageRuleChangeRequestItemDto })
  async createRuleRequest(@Req() req: any, @Body() body: UpdateWageRulesDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const changeReason = body.changeReason.trim();
    if (!changeReason) {
      throw new BadRequestException('change_reason_required');
    }
    const row = await this.prisma.wageRuleChangeRequest.create({
      data: {
        organizationId: org,
        requestedBy: req.user.id,
        status: 'pending',
        changeReason,
        standardDailyHours: body.standardDailyHours,
        presentPolicy: body.presentPolicy,
        absentPolicy: body.absentPolicy,
        paidLeavePolicy: body.paidLeavePolicy,
        scheduledHolidayPolicy: body.scheduledHolidayPolicy,
        specialLeavePolicy: body.specialLeavePolicy,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'REQUEST_RULES_UPDATE',
      entity: 'wage_rule_change_requests',
      entityId: row.id,
      detail: row,
    });

    return row;
  }

  @Post('rules/requests/:id/approve')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金ルール変更申請を承認して適用' })
  @ApiOkResponse({ type: WageRuleChangeRequestItemDto })
  async approveRuleRequest(@Req() req: any, @Param() params: IdParamDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const row = await this.prisma.wageRuleChangeRequest.findUnique({ where: { id: params.id } });
    if (!row) throw new BadRequestException('not_found');
    if (row.organizationId !== org) throw new ForbiddenException('organization_forbidden');
    if (row.status !== 'pending') throw new BadRequestException('request_not_pending');
    if (row.requestedBy === req.user.id) throw new ForbiddenException('reviewer_must_differ');

    const before = await this.getWageRules(org);
    await this.prisma.wageRuleSetting.upsert({
      where: { organizationId: org },
      update: {
        standardDailyHours: row.standardDailyHours,
        presentPolicy: row.presentPolicy,
        absentPolicy: row.absentPolicy,
        paidLeavePolicy: row.paidLeavePolicy,
        scheduledHolidayPolicy: row.scheduledHolidayPolicy,
        specialLeavePolicy: row.specialLeavePolicy,
        updatedBy: req.user.id,
      },
      create: {
        organizationId: org,
        standardDailyHours: row.standardDailyHours,
        presentPolicy: row.presentPolicy,
        absentPolicy: row.absentPolicy,
        paidLeavePolicy: row.paidLeavePolicy,
        scheduledHolidayPolicy: row.scheduledHolidayPolicy,
        specialLeavePolicy: row.specialLeavePolicy,
        updatedBy: req.user.id,
      },
    });
    const approved = await this.prisma.wageRuleChangeRequest.update({
      where: { id: row.id },
      data: {
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'APPROVE_RULES_UPDATE_REQUEST',
      entity: 'wage_rule_change_requests',
      entityId: row.id,
      detail: {
        changeReason: row.changeReason,
        before,
        after: {
          standardDailyHours: row.standardDailyHours,
          statusPolicies: {
            present: row.presentPolicy,
            absent: row.absentPolicy,
            paid_leave: row.paidLeavePolicy,
            scheduled_holiday: row.scheduledHolidayPolicy,
            special_leave: row.specialLeavePolicy,
          },
        },
      },
    });

    return approved;
  }

  @Post('rules/requests/:id/reject')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金ルール変更申請を却下' })
  @ApiOkResponse({ type: WageRuleChangeRequestItemDto })
  async rejectRuleRequest(@Req() req: any, @Param() params: IdParamDto, @Body() body: RejectWageRuleRequestDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const row = await this.prisma.wageRuleChangeRequest.findUnique({ where: { id: params.id } });
    if (!row) throw new BadRequestException('not_found');
    if (row.organizationId !== org) throw new ForbiddenException('organization_forbidden');
    if (row.status !== 'pending') throw new BadRequestException('request_not_pending');
    if (row.requestedBy === req.user.id) throw new ForbiddenException('reviewer_must_differ');

    const reviewComment = body.reviewComment.trim();
    if (!reviewComment) {
      throw new BadRequestException('review_comment_required');
    }
    const rejected = await this.prisma.wageRuleChangeRequest.update({
      where: { id: row.id },
      data: {
        status: 'rejected',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewedComment: reviewComment,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'REJECT_RULES_UPDATE_REQUEST',
      entity: 'wage_rule_change_requests',
      entityId: row.id,
      detail: {
        reviewComment,
        request: {
          changeReason: row.changeReason,
          standardDailyHours: row.standardDailyHours,
          presentPolicy: row.presentPolicy,
          absentPolicy: row.absentPolicy,
          paidLeavePolicy: row.paidLeavePolicy,
          scheduledHolidayPolicy: row.scheduledHolidayPolicy,
          specialLeavePolicy: row.specialLeavePolicy,
        },
      },
    });

    return rejected;
  }

  @Put('rules')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金計算ルールを更新' })
  @ApiOkResponse({ type: WageRulesResponseDto })
  async updateRules(@Req() req: any, @Body() body: UpdateWageRulesDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const changeReason = body.changeReason.trim();
    if (!changeReason) {
      throw new BadRequestException('change_reason_required');
    }
    const before = await this.getWageRules(org);
    const updated = await this.prisma.wageRuleSetting.upsert({
      where: { organizationId: org },
      update: {
        standardDailyHours: body.standardDailyHours,
        presentPolicy: body.presentPolicy,
        absentPolicy: body.absentPolicy,
        paidLeavePolicy: body.paidLeavePolicy,
        scheduledHolidayPolicy: body.scheduledHolidayPolicy,
        specialLeavePolicy: body.specialLeavePolicy,
        updatedBy: req.user.id,
      },
      create: {
        organizationId: org,
        standardDailyHours: body.standardDailyHours,
        presentPolicy: body.presentPolicy,
        absentPolicy: body.absentPolicy,
        paidLeavePolicy: body.paidLeavePolicy,
        scheduledHolidayPolicy: body.scheduledHolidayPolicy,
        specialLeavePolicy: body.specialLeavePolicy,
        updatedBy: req.user.id,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'UPDATE_RULES',
      entity: 'wage_rule_settings',
      entityId: updated.id,
      detail: {
        changeReason,
        before,
        after: {
          standardDailyHours: updated.standardDailyHours,
          statusPolicies: {
            present: updated.presentPolicy,
            absent: updated.absentPolicy,
            paid_leave: updated.paidLeavePolicy,
            scheduled_holiday: updated.scheduledHolidayPolicy,
            special_leave: updated.specialLeavePolicy,
          },
        },
      },
    });

    return {
      standardDailyHours: updated.standardDailyHours,
      presentPolicy: updated.presentPolicy,
      absentPolicy: updated.absentPolicy,
      paidLeavePolicy: updated.paidLeavePolicy,
      scheduledHolidayPolicy: updated.scheduledHolidayPolicy,
      specialLeavePolicy: updated.specialLeavePolicy,
    };
  }

  @Get('templates')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '賃金明細の自治体テンプレート一覧を取得' })
  @ApiOkResponse({
    type: WageTemplatesResponseDto,
    example: {
      current: { code: 'fukuoka', label: '福岡県様式（MVP）' },
      available: [
        { code: 'fukuoka', label: '福岡県様式（MVP）' },
        { code: 'kumamoto', label: '熊本県様式（MVP）' },
        { code: 'saga', label: '佐賀県様式（MVP）' },
      ],
    },
  })
  listTemplates() {
    const current = getMunicipalityTemplate();
    return {
      current: { code: current.code, label: current.label },
      available: listMunicipalityTemplates(),
    };
  }

  @Post('calculate-monthly')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '月次賃金を計算' })
  @ApiOkResponse({
    type: WageCalculateResponseDto,
    example: {
      count: 1,
      items: [
        {
          id: 'd7bcf582-60ba-4825-a908-7e7c7f2b8c4f',
          organizationId: 'org-1',
          serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
          year: 2026,
          month: 2,
          totalHours: 120.5,
          hourlyRate: 1200,
          grossAmount: 144600,
          deductions: 0,
          netAmount: 144600,
          status: 'calculated',
          createdAt: '2026-02-20T05:00:00.000Z',
          updatedAt: '2026-02-20T05:00:00.000Z',
        },
      ],
    },
  })
  async calculate(@Req() req: any, @Body() body: CalculateMonthlyWagesDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const start = new Date(Date.UTC(body.year, body.month - 1, 1));
    const end = new Date(Date.UTC(body.year, body.month, 1));
    const rules = await this.getWageRules(org);

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        organizationId: org,
        clockInAt: { gte: start, lt: end },
      },
      orderBy: [{ serviceUserId: 'asc' }, { clockInAt: 'asc' }],
    });

    const dayStatuses = await this.prisma.attendanceDayStatus.findMany({
      where: {
        organizationId: org,
        workDate: { gte: start, lt: end },
      },
      orderBy: [{ serviceUserId: 'asc' }, { workDate: 'asc' }],
    });

    const grouped: Record<string, number> = {};
    const workedByServiceUserDate: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      const worked = hoursBetween(log.clockInAt, log.clockOutAt);
      grouped[log.serviceUserId] = (grouped[log.serviceUserId] || 0) + worked;
      const dateKey = toDateKey(log.clockInAt);
      workedByServiceUserDate[log.serviceUserId] = workedByServiceUserDate[log.serviceUserId] || {};
      workedByServiceUserDate[log.serviceUserId][dateKey] =
        (workedByServiceUserDate[log.serviceUserId][dateKey] || 0) + worked;
    }

    const statusesByServiceUserDate: Record<string, Record<string, AttendanceDayStatusRule>> = {};
    for (const item of dayStatuses) {
      const dateKey = toDateKey(item.workDate);
      statusesByServiceUserDate[item.serviceUserId] = statusesByServiceUserDate[item.serviceUserId] || {};
      statusesByServiceUserDate[item.serviceUserId][dateKey] = item.status as AttendanceDayStatusRule;
    }

    const items = [];
    const serviceUserIds = new Set<string>([
      ...Object.keys(grouped),
      ...Object.keys(statusesByServiceUserDate),
    ]);
    for (const serviceUserId of serviceUserIds) {
      const perDateWorked = { ...(workedByServiceUserDate[serviceUserId] || {}) };
      const statusPerDate = statusesByServiceUserDate[serviceUserId] || {};
      const summaryCounts = {
        present: 0,
        absent: 0,
        paid_leave: 0,
        scheduled_holiday: 0,
        special_leave: 0,
      };

      for (const [dateKey, status] of Object.entries(statusPerDate)) {
        if (status in summaryCounts) {
          summaryCounts[status as keyof typeof summaryCounts] += 1;
        }
        const currentHours = perDateWorked[dateKey] || 0;
        const policy = rules.statusPolicies[status];
        if (policy === 'fixed_zero') {
          perDateWorked[dateKey] = 0;
        } else if (policy === 'fixed_standard') {
          perDateWorked[dateKey] = rules.standardDailyHours;
        } else {
          perDateWorked[dateKey] = currentHours;
        }
      }

      const actualWorkedHours = Number((grouped[serviceUserId] || 0).toFixed(2));
      const adjustedHours = Number(
        Object.values(perDateWorked)
          .reduce((acc, x) => acc + x, 0)
          .toFixed(2),
      );

      const rate = await this.prisma.wageRate.findFirst({
        where: {
          organizationId: org,
          serviceUserId,
          effectiveFrom: { lte: end },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      const hourlyRate = rate?.hourlyRate || 1000;
      const gross = Math.round(adjustedHours * hourlyRate);

      const calc = await this.prisma.wageCalculation.create({
        data: {
          organizationId: org,
          serviceUserId,
          year: body.year,
          month: body.month,
          totalHours: adjustedHours,
          hourlyRate,
          grossAmount: gross,
          deductions: 0,
          netAmount: gross,
          status: 'calculated',
        },
      });

      items.push({
        ...calc,
        dayStatusSummary: {
          standardDailyHours: rules.standardDailyHours,
          actualWorkedHours,
          adjustedHours,
          deltaHours: Number((adjustedHours - actualWorkedHours).toFixed(2)),
          counts: summaryCounts,
        },
      });
    }

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CALCULATE',
      entity: 'wage_calculations',
      entityId: `${body.year}-${body.month}`,
      detail: {
        count: items.length,
        rules,
      },
    });

    return { count: items.length, items };
  }

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '賃金計算を承認確定' })
  @ApiOkResponse({
    type: WageCalculationItemDto,
    example: {
      id: 'd7bcf582-60ba-4825-a908-7e7c7f2b8c4f',
      organizationId: 'org-1',
      serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
      year: 2026,
      month: 2,
      totalHours: 120.5,
      hourlyRate: 1200,
      grossAmount: 144600,
      deductions: 0,
      netAmount: 144600,
      status: 'approved',
      createdAt: '2026-02-20T05:00:00.000Z',
      updatedAt: '2026-02-20T05:03:00.000Z',
    },
  })
  async approve(@Req() req: any, @Param() params: IdParamDto) {
    const { id } = params;
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const item = await this.prisma.wageCalculation.findUnique({ where: { id } });
    if (!item) throw new BadRequestException('not_found');
    if (item.organizationId !== org) throw new ForbiddenException('organization_forbidden');

    const approved = await this.prisma.wageCalculation.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'APPROVE',
      entity: 'wage_calculations',
      entityId: id,
      detail: approved,
    });

    return approved;
  }

  @Get(':id/slip')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '賃金明細(JSON)を取得' })
  @ApiOkResponse({
    type: WageSlipResponseDto,
    example: {
      slipId: 'd7bcf582-60ba-4825-a908-7e7c7f2b8c4f',
      organizationId: 'org-1',
      organizationName: 'A型事業所 本店',
      serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
      serviceUserName: 'E2E利用者',
      month: '2026-02',
      closingDate: '2026-02-28',
      totalHours: 120.5,
      hourlyRate: 1200,
      grossAmount: 144600,
      deductions: 0,
      netAmount: 144600,
      status: 'approved',
      statusLabel: '確定済み',
      remarks: '管理者承認済み',
      approverId: 'admin-user-id',
      issuedAt: '2026-02-20T05:03:00.000Z',
      dayStatusSummary: {
        standardDailyHours: 4,
        actualWorkedHours: 120.5,
        adjustedHours: 124.5,
        deltaHours: 4,
        counts: {
          present: 20,
          absent: 1,
          paid_leave: 1,
          scheduled_holiday: 0,
          special_leave: 0,
        },
      },
    },
  })
  async slip(@Req() req: any, @Param() params: IdParamDto) {
    const { id } = params;
    const view = await this.getSlipViewOrThrow(req, id);

    return {
      ...view,
    };
  }

  @Get(':id/slip.csv')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '賃金明細(CSV)を出力' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSVファイル（UTF-8 BOM付き）を添付形式で返却',
    headers: {
      'Content-Type': {
        description: 'text/csv; charset=utf-8',
        schema: { type: 'string', example: 'text/csv; charset=utf-8' },
      },
      'Content-Disposition': {
        description: '添付ファイル名',
        schema: {
          type: 'string',
          example: 'attachment; filename="wage-slip-d7bcf582-60ba-4825-a908-7e7c7f2b8c4f-202602.csv"',
        },
      },
    },
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async slipCsv(@Req() req: any, @Param() params: IdParamDto, @Res() res: Response) {
    const { id } = params;
    const view = await this.getSlipViewOrThrow(req, id);
    const template = getMunicipalityTemplate();
    const filename = `wage-slip-${view.slipId}-${view.month.replace('-', '')}.csv`;

    const rows = [template.csvHeaders, template.csvRow(view)];

    const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    res.status(200).send(csv);
  }

  @Get(':id/slip.pdf')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '賃金明細(PDF)を出力' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDFファイルを添付形式で返却',
    headers: {
      'Content-Type': {
        description: 'application/pdf',
        schema: { type: 'string', example: 'application/pdf' },
      },
      'Content-Disposition': {
        description: '添付ファイル名',
        schema: {
          type: 'string',
          example: 'attachment; filename="wage-slip-d7bcf582-60ba-4825-a908-7e7c7f2b8c4f-202602.pdf"',
        },
      },
    },
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async slipPdf(@Req() req: any, @Param() params: IdParamDto, @Res() res: Response) {
    const { id } = params;
    const view = await this.getSlipViewOrThrow(req, id);
    const template = getMunicipalityTemplate();
    const filename = `wage-slip-${view.slipId}-${view.month.replace('-', '')}.pdf`;

    const lines = template.pdfLines(view);

    const pdfBuffer = buildSimplePdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    res.status(200).send(pdfBuffer);
  }

  private async getSlipOrThrow(req: any, id: string) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const item = await this.prisma.wageCalculation.findUnique({ where: { id } });
    if (!item) throw new BadRequestException('not_found');
    if (item.organizationId !== org) throw new ForbiddenException('organization_forbidden');
    if (req.user.role === 'user' && item.serviceUserId !== req.user.serviceUserId) {
      throw new ForbiddenException('forbidden');
    }
    return item;
  }

  private async getSlipViewOrThrow(req: any, id: string) {
    const item = await this.getSlipOrThrow(req, id);
    const serviceUser = await this.prisma.serviceUser.findUnique({ where: { id: item.serviceUserId } });
    const dayStatusSummary = await this.calculateDayStatusSummary(item.organizationId, item.serviceUserId, item.year, item.month);
    return buildSlipView(item, serviceUser?.fullName || '不明', dayStatusSummary);
  }

  private async calculateDayStatusSummary(organizationId: string, serviceUserId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const rules = await this.getWageRules(organizationId);
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        organizationId,
        serviceUserId,
        clockInAt: { gte: start, lt: end },
      },
      orderBy: { clockInAt: 'asc' },
    });
    const dayStatuses = await this.prisma.attendanceDayStatus.findMany({
      where: {
        organizationId,
        serviceUserId,
        workDate: { gte: start, lt: end },
      },
      orderBy: { workDate: 'asc' },
    });

    const workedByDate: Record<string, number> = {};
    for (const log of logs) {
      const key = toDateKey(log.clockInAt);
      workedByDate[key] = (workedByDate[key] || 0) + hoursBetween(log.clockInAt, log.clockOutAt);
    }

    const counts = {
      present: 0,
      absent: 0,
      paid_leave: 0,
      scheduled_holiday: 0,
      special_leave: 0,
    };

    for (const ds of dayStatuses) {
      const key = toDateKey(ds.workDate);
      const status = ds.status as AttendanceDayStatusRule;
      if (status in counts) {
        counts[status as keyof typeof counts] += 1;
      }
      const policy = rules.statusPolicies[status];
      const current = workedByDate[key] || 0;
      if (policy === 'fixed_zero') {
        workedByDate[key] = 0;
      } else if (policy === 'fixed_standard') {
        workedByDate[key] = rules.standardDailyHours;
      } else {
        workedByDate[key] = current;
      }
    }

    const actualWorkedHours = Number(logs.reduce((acc, log) => acc + hoursBetween(log.clockInAt, log.clockOutAt), 0).toFixed(2));
    const adjustedHours = Number(
      Object.values(workedByDate)
        .reduce((acc, h) => acc + h, 0)
        .toFixed(2),
    );

    return {
      standardDailyHours: rules.standardDailyHours,
      actualWorkedHours,
      adjustedHours,
      deltaHours: Number((adjustedHours - actualWorkedHours).toFixed(2)),
      counts,
    };
  }

  private async getWageRules(organizationId: string) {
    const row = await this.prisma.wageRuleSetting.findUnique({ where: { organizationId } });
    if (!row) return applyWageRuleOverride();
    return applyWageRuleOverride({
      standardDailyHours: row.standardDailyHours,
      statusPolicies: {
        present: row.presentPolicy as DayStatusHoursPolicy,
        absent: row.absentPolicy as DayStatusHoursPolicy,
        paid_leave: row.paidLeavePolicy as DayStatusHoursPolicy,
        scheduled_holiday: row.scheduledHolidayPolicy as DayStatusHoursPolicy,
        special_leave: row.specialLeavePolicy as DayStatusHoursPolicy,
      },
    });
  }
}

function buildSlipView(item: {
  id: string;
  organizationId: string;
  serviceUserId: string;
  year: number;
  month: number;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  approvedBy: string | null;
}, serviceUserName: string, dayStatusSummary: WageSlipView['dayStatusSummary']): WageSlipView {
  const month = `${item.year}-${String(item.month).padStart(2, '0')}`;
  const closingDate = lastDayOfMonth(item.year, item.month);
  return {
    slipId: item.id,
    organizationId: item.organizationId,
    organizationName: toOrganizationName(item.organizationId),
    serviceUserId: item.serviceUserId,
    serviceUserName,
    month,
    closingDate,
    totalHours: item.totalHours,
    hourlyRate: item.hourlyRate,
    grossAmount: item.grossAmount,
    deductions: item.deductions,
    netAmount: item.netAmount,
    status: item.status,
    statusLabel: toStatusLabel(item.status),
    remarks: toRemarks(item.status),
    approverId: item.approvedBy || '',
    issuedAt: new Date().toISOString(),
    dayStatusSummary,
  };
}

function csvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function toStatusLabel(status: string): string {
  const map: Record<string, string> = {
    calculated: '計算済み',
    approved: '確定済み',
  };
  return map[status] || status;
}

function toRemarks(status: string): string {
  if (status === 'approved') return '管理者承認済み';
  if (status === 'calculated') return '計算済み（未確定）';
  return '確認中';
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

function toOrganizationName(organizationId: string): string {
  const map: Record<string, string> = {
    'org-1': 'A型事業所 本店',
    'org-2': 'A型事業所 第二拠点',
  };
  return map[organizationId] || `事業所(${organizationId})`;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Buffer {
  const contentLines = lines.map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 18} Td (${pdfEscape(line)}) Tj ET`);
  const contentStream = contentLines.join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf8')} >> stream\n${contentStream}\nendstream endobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
