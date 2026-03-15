export const serviceUserStatuses = ['tour', 'trial', 'interview', 'active', 'leaving', 'left'] as const;
export type ServiceUserStatus = (typeof serviceUserStatuses)[number];

export const attendanceDayStatusOptions = [
  { value: 'present', label: '出勤扱い' },
  { value: 'absent', label: '欠勤' },
  { value: 'paid_leave', label: '有給' },
  { value: 'scheduled_holiday', label: '所定休日' },
  { value: 'special_leave', label: '特別休暇' },
] as const;
export type AttendanceDayStatusValue = (typeof attendanceDayStatusOptions)[number]['value'];

export const uatScenarioItems = [
  'シナリオ1: ログイン',
  'シナリオ2: 利用者登録とステータス更新',
  'シナリオ3: 打刻（出勤・退勤）',
  'シナリオ4: 勤怠修正申請と承認',
  'シナリオ5: 月次賃金計算から明細出力',
  '異常系: MFA誤り/権限不足/不正IDの確認',
] as const;

export const uatStorageKey = 'admin-uat-progress-v1';

export type ServiceUser = {
  id: string;
  fullName: string;
  status: string;
  organizationId: string;
};

export type AttendanceLog = {
  id: string;
  serviceUserId: string;
  method: string;
  clockInAt: string;
  clockOutAt: string | null;
};

export type AttendanceCorrection = {
  id: string;
  attendanceLogId: string;
  reason: string;
  status: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
};

export type AttendanceDayStatus = {
  id: string;
  serviceUserId: string;
  workDate: string;
  status: string;
  note: string | null;
};

export type WageTemplatesResponse = {
  current: { code: string; label: string; note: string };
  available: Array<{ code: string; label: string; note: string }>;
};

export type WageRules = {
  standardDailyHours: number;
  presentPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  absentPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  paidLeavePolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  scheduledHolidayPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  specialLeavePolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
};

export type WageRuleChangeRequest = {
  id: string;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedComment?: string | null;
  status: string;
  changeReason: string;
  standardDailyHours: number;
  presentPolicy: WageRules['presentPolicy'];
  absentPolicy: WageRules['absentPolicy'];
  paidLeavePolicy: WageRules['paidLeavePolicy'];
  scheduledHolidayPolicy: WageRules['scheduledHolidayPolicy'];
  specialLeavePolicy: WageRules['specialLeavePolicy'];
  createdAt: string;
};

export type WageCalculationSummary = {
  standardDailyHours: number;
  actualWorkedHours: number;
  adjustedHours: number;
  deltaHours: number;
  counts: {
    present: number;
    absent: number;
    paid_leave: number;
    scheduled_holiday: number;
    special_leave: number;
  };
};

export type WageCalculationItem = {
  id: string;
  serviceUserId: string;
  year: number;
  month: number;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  dayStatusSummary?: WageCalculationSummary;
};

export type WageCalculateResponse = {
  count: number;
  items: WageCalculationItem[];
};

export type WageSlip = {
  slipId: string;
  organizationName: string;
  serviceUserName: string;
  month: string;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  statusLabel: string;
  remarks: string;
  approverId: string;
  issuedAt: string;
  dayStatusSummary: WageCalculationSummary;
};

export type LoginResponse = {
  mfaRequired: boolean;
  challengeToken: string;
  email: string;
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
};

export type GlobalActionRunner = <T>(action: () => Promise<T>) => Promise<T>;
