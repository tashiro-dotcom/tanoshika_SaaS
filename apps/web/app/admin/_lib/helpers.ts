import {
  attendanceDayStatusOptions,
  type AttendanceCorrection,
  type AttendanceDayStatus,
  type AttendanceDayStatusValue,
  type AttendanceLog,
  type ServiceUser,
  serviceUserStatuses,
  type ServiceUserStatus,
  type WageCalculationItem,
} from './types';

export function normalizeServiceUserStatus(status: string): ServiceUserStatus {
  if (serviceUserStatuses.includes(status as ServiceUserStatus)) {
    return status as ServiceUserStatus;
  }
  return 'active';
}

export function labelForDayStatus(status: string): string {
  const found = attendanceDayStatusOptions.find((option) => option.value === status);
  return found?.label || status;
}

export function buildLatestAttendanceByServiceUser(attendanceLogs: AttendanceLog[]): Map<string, AttendanceLog> {
  const map = new Map<string, AttendanceLog>();
  for (const log of attendanceLogs) {
    const prev = map.get(log.serviceUserId);
    if (!prev || new Date(log.clockInAt).getTime() > new Date(prev.clockInAt).getTime()) {
      map.set(log.serviceUserId, log);
    }
  }
  return map;
}

export function buildDayStatusByServiceUser(dayStatuses: AttendanceDayStatus[]): Map<string, AttendanceDayStatus> {
  const map = new Map<string, AttendanceDayStatus>();
  for (const item of dayStatuses) {
    map.set(item.serviceUserId, item);
  }
  return map;
}

export function buildCorrectionTargetSummary(
  correctionTargetLogId: string,
  attendanceLogs: AttendanceLog[],
  serviceUsers: ServiceUser[],
): string {
  if (!correctionTargetLogId) return '';
  const target = attendanceLogs.find((log) => log.id === correctionTargetLogId);
  if (!target) return correctionTargetLogId.slice(0, 8);
  const serviceUserName = serviceUsers.find((user) => user.id === target.serviceUserId)?.fullName || target.serviceUserId.slice(0, 8);
  return `${target.id.slice(0, 8)} / ${serviceUserName}`;
}

export function getFilenameFromContentDisposition(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const matched = value.match(/filename="?([^"]+)"?/i);
  return matched?.[1] || fallback;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('ja-JP');
}

export function isLeaveLikeStatus(status: AttendanceDayStatusValue): boolean {
  return ['absent', 'paid_leave', 'scheduled_holiday', 'special_leave'].includes(status);
}

export function buildUatReport(
  doneItems: string[],
  pendingItems: string[],
  executor: string,
  environment: string,
  notes: string,
  date = new Date(),
): string {
  return [
    `実施日: ${date.toLocaleDateString('ja-JP')}`,
    `実施者: ${executor || '(未入力)'}`,
    `対象環境: ${environment || '(未入力)'}`,
    `成功シナリオ: ${doneItems.length > 0 ? doneItems.join(' / ') : '(なし)'}`,
    `未実施シナリオ: ${pendingItems.length > 0 ? pendingItems.join(' / ') : '(なし)'}`,
    `不具合・要望: ${notes || '(なし)'}`,
  ].join('\n');
}

export function updateAttendanceLogCollection(
  currentLogs: AttendanceLog[],
  nextLog: AttendanceLog,
): AttendanceLog[] {
  const idx = currentLogs.findIndex((item) => item.id === nextLog.id);
  if (idx >= 0) {
    const next = [...currentLogs];
    next[idx] = nextLog;
    return next;
  }
  return [nextLog, ...currentLogs];
}

export function updateAttendanceCorrectionCollection(
  currentCorrections: AttendanceCorrection[],
  nextCorrection: AttendanceCorrection,
): AttendanceCorrection[] {
  return [nextCorrection, ...currentCorrections.filter((item) => item.id !== nextCorrection.id)];
}

export function updateWageCalculationCollection(
  currentItems: WageCalculationItem[],
  nextItem: WageCalculationItem,
): WageCalculationItem[] {
  return [nextItem, ...currentItems.filter((item) => item.id !== nextItem.id)];
}
