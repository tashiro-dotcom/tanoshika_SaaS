import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AttendanceController } from './attendance/attendance.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { RolesGuard } from './common/authz';
import { AuditService } from './common/audit.service';
import { JwtUserMiddleware } from './common/jwt-user.middleware';
import { MeController } from './me/me.controller';
import { PrismaService } from './prisma.service';
import { ServiceUsersController } from './service-users/service-users.controller';
import { ShiftsController } from './shifts/shifts.controller';
import { StaffUsersController } from './staff-users/staff-users.controller';
import { SupportPlansController } from './support-plans/support-plans.controller';
import { SupportRecordsController } from './support-records/support-records.controller';
import { WagesController } from './wages/wages.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    AuthController,
    StaffUsersController,
    ServiceUsersController,
    SupportPlansController,
    SupportRecordsController,
    ShiftsController,
    AttendanceController,
    WagesController,
    MeController,
  ],
  providers: [PrismaService, AuthService, AuditService, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtUserMiddleware).forRoutes('*');
  }
}
