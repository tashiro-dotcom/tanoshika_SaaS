import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { PrismaService } from '../prisma.service';
import { CalculateMonthlyWagesDto } from './wages.dto';
import { getMunicipalityTemplate, listMunicipalityTemplates, WageSlipView } from './wage-slip-template';

function hoursBetween(start: Date, end: Date | null): number {
  if (!end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 1000 / 60 / 60);
}

@ApiTags('Wages')
@ApiBearerAuth()
@Controller('wages')
@UseGuards(RolesGuard)
export class WagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('templates')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: '工賃明細の自治体テンプレート一覧を取得' })
  listTemplates() {
    const current = getMunicipalityTemplate();
    return {
      current: { code: current.code, label: current.label },
      available: listMunicipalityTemplates(),
    };
  }

  @Post('calculate-monthly')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '月次工賃を計算' })
  async calculate(@Req() req: any, @Body() body: CalculateMonthlyWagesDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const start = new Date(Date.UTC(body.year, body.month - 1, 1));
    const end = new Date(Date.UTC(body.year, body.month, 1));

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        organizationId: org,
        clockInAt: { gte: start, lt: end },
      },
      orderBy: { serviceUserId: 'asc' },
    });

    const grouped: Record<string, number> = {};
    for (const log of logs) {
      grouped[log.serviceUserId] = (grouped[log.serviceUserId] || 0) + hoursBetween(log.clockInAt, log.clockOutAt);
    }

    const items = [];
    for (const [serviceUserId, totalHours] of Object.entries(grouped)) {
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
      const gross = Math.round(totalHours * hourlyRate);

      const calc = await this.prisma.wageCalculation.create({
        data: {
          organizationId: org,
          serviceUserId,
          year: body.year,
          month: body.month,
          totalHours: Number(totalHours.toFixed(2)),
          hourlyRate,
          grossAmount: gross,
          deductions: 0,
          netAmount: gross,
          status: 'calculated',
        },
      });

      items.push(calc);
    }

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CALCULATE',
      entity: 'wage_calculations',
      entityId: `${body.year}-${body.month}`,
      detail: { count: items.length },
    });

    return { count: items.length, items };
  }

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '工賃計算を承認確定' })
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
  @ApiOperation({ summary: '工賃明細(JSON)を取得' })
  async slip(@Req() req: any, @Param() params: IdParamDto) {
    const { id } = params;
    const view = await this.getSlipViewOrThrow(req, id);

    return {
      ...view,
    };
  }

  @Get(':id/slip.csv')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '工賃明細(CSV)を出力' })
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
  @ApiOperation({ summary: '工賃明細(PDF)を出力' })
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
    return buildSlipView(item, serviceUser?.fullName || '不明');
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
}, serviceUserName: string): WageSlipView {
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
