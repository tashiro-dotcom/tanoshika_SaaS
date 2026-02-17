import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StaffUser } from '@prisma/client';
import { hash } from 'bcryptjs';
import { authenticator } from 'otplib';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma.service';

describe('Major Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: StaffUser;
  let otherAdmin: StaffUser;
  let staffUser: StaffUser;
  let serviceUserId: string;
  let otherOrgServiceUserId: string;
  let approvedWageId: string;
  let correctionId: string;

  const organizationId = 'org-1';
  const adminEmail = 'admin.e2e@example.com';
  const otherAdminEmail = 'admin.other.e2e@example.com';
  const staffEmail = 'staff.e2e@example.com';
  const adminPassword = 'Admin123!';
  const otherAdminPassword = 'Admin456!';
  const staffPassword = 'Staff123!';
  const adminMfaSecret = 'JBSWY3DPEHPK3PXP';
  const otherAdminMfaSecret = 'JBSWY3DPEHPK3PXQ';
  const staffMfaSecret = 'JBSWY3DPEHPK3PXR';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.wageCalculation.deleteMany();
    await prisma.attendanceCorrection.deleteMany();
    await prisma.attendanceLog.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.supportRecord.deleteMany();
    await prisma.supportPlan.deleteMany();
    await prisma.wageRate.deleteMany();
    await prisma.serviceUserStatusHistory.deleteMany();
    await prisma.serviceUser.deleteMany();
    await prisma.staffUser.deleteMany();

    admin = await prisma.staffUser.create({
      data: {
        organizationId,
        email: adminEmail,
        name: 'Admin E2E',
        role: 'admin',
        passwordHash: await hash(adminPassword, 10),
        mfaEnabled: true,
        mfaSecret: adminMfaSecret,
      },
    });
    otherAdmin = await prisma.staffUser.create({
      data: {
        organizationId: 'org-2',
        email: otherAdminEmail,
        name: 'Other Admin E2E',
        role: 'admin',
        passwordHash: await hash(otherAdminPassword, 10),
        mfaEnabled: true,
        mfaSecret: otherAdminMfaSecret,
      },
    });
    staffUser = await prisma.staffUser.create({
      data: {
        organizationId,
        email: staffEmail,
        name: 'Staff E2E',
        role: 'staff',
        passwordHash: await hash(staffPassword, 10),
        mfaEnabled: true,
        mfaSecret: staffMfaSecret,
      },
    });

    const serviceUser = await prisma.serviceUser.create({
      data: {
        organizationId,
        fullName: 'E2E利用者',
        status: 'active',
        statusHistory: {
          create: {
            organizationId,
            status: 'active',
          },
        },
      },
    });

    serviceUserId = serviceUser.id;
    const otherOrgServiceUser = await prisma.serviceUser.create({
      data: {
        organizationId: 'org-2',
        fullName: 'ORG2利用者',
        status: 'active',
        statusHistory: {
          create: {
            organizationId: 'org-2',
            status: 'active',
          },
        },
      },
    });
    otherOrgServiceUserId = otherOrgServiceUser.id;

    await prisma.wageRate.create({
      data: {
        organizationId,
        serviceUserId,
        hourlyRate: 1200,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('clock in/out -> correction approve -> wage calculate -> slip', async () => {
    const accessToken = await loginAndGetAccessToken(adminEmail, adminPassword, adminMfaSecret);

    const clockInRes = await request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ serviceUserId, method: 'web' })
      .expect(201);

    const clockOutRes = await request(app.getHttpServer())
      .post('/attendance/clock-out')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ serviceUserId })
      .expect(201);

    const correctionRes = await request(app.getHttpServer())
      .post('/attendance-corrections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        attendanceLogId: clockInRes.body.id,
        reason: '退勤時刻修正',
        requestedClockOutAt: new Date(new Date(clockOutRes.body.clockOutAt).getTime() + 15 * 60 * 1000).toISOString(),
      })
      .expect(201);
    correctionId = correctionRes.body.id;

    await request(app.getHttpServer())
      .post(`/attendance-corrections/${correctionRes.body.id}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()
      .expect(201);

    const now = new Date();
    const calcRes = await request(app.getHttpServer())
      .post('/wages/calculate-monthly')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 })
      .expect(201);

    expect(calcRes.body.count).toBeGreaterThanOrEqual(1);

    const wageId = calcRes.body.items[0].id;
    approvedWageId = wageId;

    await request(app.getHttpServer())
      .post(`/wages/${wageId}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()
      .expect(201);

    const slipRes = await request(app.getHttpServer())
      .get(`/wages/${wageId}/slip`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(slipRes.body.serviceUserId).toBe(serviceUserId);
    expect(slipRes.body.serviceUserName).toBe('E2E利用者');
    expect(slipRes.body.organizationName).toBe('A型事業所 本店');
    expect(slipRes.body.closingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(slipRes.body.remarks).toBe('管理者承認済み');
    expect(slipRes.body.status).toBe('approved');

    const csvRes = await request(app.getHttpServer())
      .get(`/wages/${wageId}/slip.csv`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('明細ID');
    expect(csvRes.text).toContain('事業所名');
    expect(csvRes.text).toContain('利用者名');
    expect(csvRes.text).toContain('締日');
    expect(csvRes.text).toContain('備考');
    expect(csvRes.text).toContain('E2E利用者');
    expect(csvRes.text).toContain('A型事業所 本店');
    expect(csvRes.text).toContain(wageId);

    const pdfRes = await request(app.getHttpServer())
      .get(`/wages/${wageId}/slip.pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer()
      .parse((res: any, callback: (err: Error | null, body: Buffer) => void) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    const pdfBody = Buffer.isBuffer(pdfRes.body)
      ? pdfRes.body
      : Buffer.from((pdfRes.body?.data as number[] | undefined) || []);
    const pdfText = pdfBody.toString('utf8');
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('WAGE SLIP STATEMENT');
    expect(pdfText).toContain('A型事業所 本店');
    expect(pdfText).toContain('E2E利用者');
    expect(pdfText).toContain('Closing Date');
    expect(pdfText).toContain('Approval Stamp');
  });

  it('rejects cross-organization access to correction approval and wage slip', async () => {
    const otherToken = await loginAndGetAccessToken(otherAdminEmail, otherAdminPassword, otherAdminMfaSecret);

    await request(app.getHttpServer())
      .post(`/attendance-corrections/${correctionId}/approve`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send()
      .expect(403);

    await request(app.getHttpServer())
      .get(`/wages/${approvedWageId}/slip`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('rejects role access: staff cannot list staff-users', async () => {
    const staffToken = await loginAndGetAccessToken(staffEmail, staffPassword, staffMfaSecret);

    await request(app.getHttpServer())
      .get('/staff-users')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('rejects creating records with serviceUserId from another organization', async () => {
    const adminToken = await loginAndGetAccessToken(adminEmail, adminPassword, adminMfaSecret);

    await request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceUserId: otherOrgServiceUserId, method: 'web' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceUserId: otherOrgServiceUserId,
        workType: 'packaging',
        shiftDate: new Date().toISOString(),
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/support-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceUserId: otherOrgServiceUserId,
        goal: 'goal',
        content: 'content',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/support-records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceUserId: otherOrgServiceUserId,
        recordType: 'daily',
        content: 'note',
      })
      .expect(403);
  });

  it('rejects invalid id parameter format with 400', async () => {
    const adminToken = await loginAndGetAccessToken(adminEmail, adminPassword, adminMfaSecret);

    await request(app.getHttpServer())
      .get('/wages/not-a-uuid/slip')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('keeps list APIs scoped to organization and validates attendance date range', async () => {
    const adminToken = await loginAndGetAccessToken(adminEmail, adminPassword, adminMfaSecret);
    const otherToken = await loginAndGetAccessToken(otherAdminEmail, otherAdminPassword, otherAdminMfaSecret);

    await request(app.getHttpServer())
      .post('/support-records')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        serviceUserId: otherOrgServiceUserId,
        recordType: 'daily',
        content: 'org2-only-record',
      })
      .expect(201);

    const serviceUsersRes = await request(app.getHttpServer())
      .get('/service-users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(serviceUsersRes.body)).toBe(true);
    expect(serviceUsersRes.body.some((x: any) => x.organizationId !== organizationId)).toBe(false);

    const recordsRes = await request(app.getHttpServer())
      .get('/support-records?page=1&limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(recordsRes.body)).toBe(true);
    expect(recordsRes.body.some((x: any) => x.content === 'org2-only-record')).toBe(false);

    const invalidRangeRes = await request(app.getHttpServer())
      .get('/attendance?from=2026-12-31T00:00:00.000Z&to=2026-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(invalidRangeRes.body.message).toBe('invalid_date_range');
  });

  it('exposes OpenAPI JSON document', async () => {
    const res = await request(app.getHttpServer()).get('/api-docs-json').expect(200);
    expect(res.body.openapi).toBeDefined();
    expect(res.body.info?.title).toBe('A型事業所向け支援管理API');
  });

  async function loginAndGetAccessToken(email: string, password: string, mfaSecret: string) {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const otp = authenticator.generate(mfaSecret);

    const mfaRes = await request(app.getHttpServer())
      .post('/auth/mfa/verify')
      .send({
        challengeToken: loginRes.body.challengeToken,
        otp,
      })
      .expect(201);

    return mfaRes.body.accessToken as string;
  }
});
