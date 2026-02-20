import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../common/authz';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { PrismaService } from '../prisma.service';
import { AttendanceSummaryResponseDto, SupportSummaryResponseDto, WageSummaryResponseDto } from './me.response.dto';

@ApiTags('User Portal')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller('me')
@UseGuards(RolesGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('attendance-summary')
  @Roles('user')
  @ApiOperation({ summary: '利用者向け勤怠サマリーを取得' })
  @ApiOkResponse({ type: AttendanceSummaryResponseDto })
  async attendanceSummary(@Req() req: any) {
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
        serviceUserId: req.user.serviceUserId,
      },
      orderBy: { clockInAt: 'desc' },
      take: 10,
    });

    return {
      serviceUserId: req.user.serviceUserId,
      totalRecords: logs.length,
      latest: logs,
    };
  }

  @Get('wage-summary')
  @Roles('user')
  @ApiOperation({ summary: '利用者向け工賃サマリーを取得' })
  @ApiOkResponse({ type: WageSummaryResponseDto })
  async wageSummary(@Req() req: any) {
    const rows = await this.prisma.wageCalculation.findMany({
      where: {
        organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
        serviceUserId: req.user.serviceUserId,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    });

    return {
      serviceUserId: req.user.serviceUserId,
      totalMonths: rows.length,
      latest: rows,
    };
  }

  @Get('support-summary')
  @Roles('user')
  @ApiOperation({ summary: '利用者向け支援サマリーを取得' })
  @ApiOkResponse({ type: SupportSummaryResponseDto })
  async supportSummary(@Req() req: any) {
    const [records, latestPlan] = await Promise.all([
      this.prisma.supportRecord.findMany({
        where: {
          organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
          serviceUserId: req.user.serviceUserId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.supportPlan.findFirst({
        where: {
          organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
          serviceUserId: req.user.serviceUserId,
        },
        orderBy: { version: 'desc' },
      }),
    ]);

    return {
      serviceUserId: req.user.serviceUserId,
      latestPlan,
      latestRecords: records,
    };
  }
}
