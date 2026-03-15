import {
  buildCorrectionTargetSummary,
  buildLatestAttendanceByServiceUser,
  buildUatReport,
  formatDateTime,
  getFilenameFromContentDisposition,
  labelForDayStatus,
  normalizeServiceUserStatus,
} from '../helpers';

describe('admin helpers', () => {
  it('normalizes unknown service user status to active', () => {
    expect(normalizeServiceUserStatus('unknown')).toBe('active');
    expect(normalizeServiceUserStatus('trial')).toBe('trial');
  });

  it('labels attendance day statuses', () => {
    expect(labelForDayStatus('present')).toBe('出勤扱い');
    expect(labelForDayStatus('custom')).toBe('custom');
  });

  it('picks the latest attendance log per service user', () => {
    const map = buildLatestAttendanceByServiceUser([
      { id: '1', serviceUserId: 'u1', method: 'web', clockInAt: '2026-03-15T08:00:00.000Z', clockOutAt: null },
      { id: '2', serviceUserId: 'u1', method: 'web', clockInAt: '2026-03-15T09:00:00.000Z', clockOutAt: null },
    ]);

    expect(map.get('u1')?.id).toBe('2');
  });

  it('builds a correction target summary with service user name', () => {
    expect(
      buildCorrectionTargetSummary(
        'attendance-log-1',
        [{ id: 'attendance-log-1', serviceUserId: 'service-user-1', method: 'web', clockInAt: '2026-03-15T08:00:00.000Z', clockOutAt: null }],
        [{ id: 'service-user-1', fullName: '山田 太郎', status: 'active', organizationId: 'org-1' }],
      ),
    ).toBe('attendan / 山田 太郎');
  });

  it('extracts a filename from content disposition', () => {
    expect(getFilenameFromContentDisposition('attachment; filename="wage-slip.csv"', 'fallback.csv')).toBe('wage-slip.csv');
    expect(getFilenameFromContentDisposition(null, 'fallback.csv')).toBe('fallback.csv');
  });

  it('formats date time for display', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime('2026-03-15T08:00:00.000Z')).toContain('2026');
  });

  it('builds the UAT clipboard report', () => {
    const report = buildUatReport(['シナリオ1'], ['シナリオ2'], '担当者', 'staging', 'メモ', new Date('2026-03-15T00:00:00.000Z'));
    expect(report).toContain('実施者: 担当者');
    expect(report).toContain('成功シナリオ: シナリオ1');
  });
});
