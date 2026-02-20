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
  @ApiOkResponse({
    type: AttendanceSummaryResponseDto,
    example: {
      serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
      totalRecords: 2,
      latest: [
        {
          id: '89335df7-b64c-45af-a4f5-941aa7f4ee58',
          serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
          method: 'web',
          clockInAt: '2026-02-20T00:00:00.000Z',
          clockOutAt: '2026-02-20T08:00:00.000Z',
        },
      ],
    },
  })
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
  @ApiOkResponse({
    type: WageSummaryResponseDto,
    example: {
      serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
      totalMonths: 2,
      latest: [
        {
          id: 'd7bcf582-60ba-4825-a908-7e7c7f2b8c4f',
          year: 2026,
          month: 2,
          netAmount: 144600,
          status: 'approved',
        },
      ],
    },
  })
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
  @ApiOkResponse({
    type: SupportSummaryResponseDto,
    example: {
      serviceUserId: 'f8b0f209-f5d4-4af5-8a45-60f26f9f5df1',
      latestPlan: {
        id: '2b70f8b2-bc85-4f69-a3f1-df592e9082aa',
        version: 2,
        goal: '一般就労に向けた作業安定化',
      },
      latestRecords: [
        {
          id: '14ed5de2-0d2c-4a26-adf3-7ec7fa9c70f2',
          recordType: 'daily',
          content: '本日の作業状況',
          createdAt: '2026-02-20T05:00:00.000Z',
        },
      ],
    },
  })
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
