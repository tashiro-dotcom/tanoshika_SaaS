import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../common/authz';
import { AuditService } from '../common/audit.service';
import { ORGANIZATION_DEFAULT } from '../common/constants';
import { IdParamDto } from '../common/param.dto';
import { toSkipTake } from '../common/pagination.dto';
import { ApiCommonErrorResponses } from '../common/swagger-error.decorators';
import { ApiRolesNote } from '../common/swagger-role.decorators';
import { PrismaService } from '../prisma.service';
import {
  AttendanceDayStatusListQueryDto,
  AttendanceListQueryDto,
  ClockInDto,
  ClockOutDto,
  CreateAttendanceCorrectionDto,
  UpsertAttendanceDayStatusDto,
} from './attendance.dto';
import {
  AttendanceCorrectionResponseDto,
  AttendanceDayStatusResponseDto,
  AttendanceLogResponseDto,
} from './attendance.response.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@Controller()
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('attendance/clock-in')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '出勤打刻' })
  @ApiOkResponse({ type: AttendanceLogResponseDto })
  async clockIn(@Req() req: any, @Body() body: ClockInDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const serviceUserId = body.serviceUserId || req.user.serviceUserId;
    if (!serviceUserId) throw new BadRequestException('service_user_required');
    await this.assertServiceUserInOrganization(serviceUserId, org);

    const item = await this.prisma.attendanceLog.create({
      data: {
        organizationId: org,
        serviceUserId,
        method: body.method || 'web',
        ipAddress: body.ipAddress || req.ip,
        location: body.location || null,
        clockInAt: new Date(),
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CLOCK_IN',
      entity: 'attendance_logs',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Post('attendance/clock-out')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '退勤打刻' })
  @ApiOkResponse({ type: AttendanceLogResponseDto })
  async clockOut(@Req() req: any, @Body() body: ClockOutDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const serviceUserId = body.serviceUserId || req.user.serviceUserId;
    if (!serviceUserId) throw new BadRequestException('service_user_required');
    await this.assertServiceUserInOrganization(serviceUserId, org);

    const openLog = await this.prisma.attendanceLog.findFirst({
      where: {
        organizationId: org,
        serviceUserId,
        clockOutAt: null,
      },
      orderBy: { clockInAt: 'desc' },
    });

    if (!openLog) throw new BadRequestException('open_clock_in_not_found');

    const item = await this.prisma.attendanceLog.update({
      where: { id: openLog.id },
      data: { clockOutAt: new Date() },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CLOCK_OUT',
      entity: 'attendance_logs',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Get('attendance')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '勤怠一覧を取得' })
  @ApiOkResponse({ type: AttendanceLogResponseDto, isArray: true })
  list(@Req() req: any, @Query() query: AttendanceListQueryDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const { skip, take } = toSkipTake(query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('invalid_date_range');
    }

    const clockInFilter = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };

    if (req.user.role === 'user') {
      return this.prisma.attendanceLog.findMany({
        where: {
          organizationId: org,
          serviceUserId: req.user.serviceUserId,
          ...(from || to ? { clockInAt: clockInFilter } : {}),
        },
        orderBy: { clockInAt: 'desc' },
        skip,
        take,
      });
    }

    return this.prisma.attendanceLog.findMany({
      where: {
        organizationId: org,
        ...(query.serviceUserId ? { serviceUserId: query.serviceUserId } : {}),
        ...(from || to ? { clockInAt: clockInFilter } : {}),
      },
      orderBy: { clockInAt: 'desc' },
      skip,
      take,
    });
  }

  @Get('attendance-statuses')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '日別勤怠区分を取得' })
  @ApiOkResponse({ type: AttendanceDayStatusResponseDto, isArray: true })
  listDayStatuses(@Req() req: any, @Query() query: AttendanceDayStatusListQueryDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const { skip, take } = toSkipTake(query);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('invalid_date_range');
    }

    const workDateFilter = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };

    if (req.user.role === 'user') {
      return this.prisma.attendanceDayStatus.findMany({
        where: {
          organizationId: org,
          serviceUserId: req.user.serviceUserId,
          ...(from || to ? { workDate: workDateFilter } : {}),
        },
        orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      });
    }

    return this.prisma.attendanceDayStatus.findMany({
      where: {
        organizationId: org,
        ...(query.serviceUserId ? { serviceUserId: query.serviceUserId } : {}),
        ...(from || to ? { workDate: workDateFilter } : {}),
      },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });
  }

  @Post('attendance-statuses/upsert')
  @Roles('admin', 'manager', 'staff')
  @ApiRolesNote('admin', 'manager', 'staff')
  @ApiOperation({ summary: '日別勤怠区分を登録/更新' })
  @ApiOkResponse({ type: AttendanceDayStatusResponseDto })
  async upsertDayStatus(@Req() req: any, @Body() body: UpsertAttendanceDayStatusDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    await this.assertServiceUserInOrganization(body.serviceUserId, org);

    const workDate = this.normalizeWorkDate(body.workDate);
    const item = await this.prisma.attendanceDayStatus.upsert({
      where: {
        organizationId_serviceUserId_workDate: {
          organizationId: org,
          serviceUserId: body.serviceUserId,
          workDate,
        },
      },
      update: {
        status: body.status,
        note: body.note || null,
        updatedBy: req.user.id,
      },
      create: {
        organizationId: org,
        serviceUserId: body.serviceUserId,
        workDate,
        status: body.status,
        note: body.note || null,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'UPSERT',
      entity: 'attendance_day_statuses',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Post('attendance-corrections')
  @Roles('admin', 'manager', 'staff', 'user')
  @ApiRolesNote('admin', 'manager', 'staff', 'user')
  @ApiOperation({ summary: '勤怠修正申請を作成' })
  @ApiOkResponse({ type: AttendanceCorrectionResponseDto })
  async correction(@Req() req: any, @Body() body: CreateAttendanceCorrectionDto) {
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const attendance = await this.prisma.attendanceLog.findUnique({ where: { id: body.attendanceLogId } });
    if (!attendance) throw new BadRequestException('attendance_not_found');
    if (attendance.organizationId !== org) throw new ForbiddenException('organization_forbidden');

    const item = await this.prisma.attendanceCorrection.create({
      data: {
        organizationId: org,
        attendanceLogId: body.attendanceLogId,
        reason: body.reason,
        requestedBy: req.user.id,
        requestedClockInAt: body.requestedClockInAt ? new Date(body.requestedClockInAt) : null,
        requestedClockOutAt: body.requestedClockOutAt ? new Date(body.requestedClockOutAt) : null,
        status: 'requested',
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: org,
      action: 'CREATE',
      entity: 'attendance_corrections',
      entityId: item.id,
      detail: item,
    });

    return item;
  }

  @Post('attendance-corrections/:id/approve')
  @Roles('admin', 'manager')
  @ApiRolesNote('admin', 'manager')
  @ApiOperation({ summary: '勤怠修正申請を承認' })
  @ApiOkResponse({ type: AttendanceCorrectionResponseDto })
  async approveCorrection(@Req() req: any, @Param() params: IdParamDto) {
    const { id } = params;
    const org = req.user.organizationId || ORGANIZATION_DEFAULT;
    const corr = await this.prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!corr) throw new BadRequestException('not_found');
    if (corr.organizationId !== org) throw new ForbiddenException('organization_forbidden');

    const att = await this.prisma.attendanceLog.findUnique({ where: { id: corr.attendanceLogId } });
    if (!att) throw new BadRequestException('attendance_not_found');
    if (att.organizationId !== org) throw new ForbiddenException('organization_forbidden');

    await this.prisma.attendanceLog.update({
      where: { id: att.id },
      data: {
        clockInAt: corr.requestedClockInAt || att.clockInAt,
        clockOutAt: corr.requestedClockOutAt || att.clockOutAt,
      },
    });

    const approved = await this.prisma.attendanceCorrection.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
      },
    });

    await this.audit.log({
      actorId: req.user.id,
      organizationId: req.user.organizationId || ORGANIZATION_DEFAULT,
      action: 'APPROVE',
      entity: 'attendance_corrections',
      entityId: id,
      detail: approved,
    });

    return approved;
  }

  private async assertServiceUserInOrganization(serviceUserId: string, organizationId: string) {
    const serviceUser = await this.prisma.serviceUser.findUnique({ where: { id: serviceUserId } });
    if (!serviceUser) throw new BadRequestException('service_user_not_found');
    if (serviceUser.organizationId !== organizationId) {
      throw new ForbiddenException('organization_forbidden');
    }
  }

  private normalizeWorkDate(workDate: string) {
    const parsed = new Date(`${workDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('invalid_work_date');
    }
    return parsed;
  }
}
