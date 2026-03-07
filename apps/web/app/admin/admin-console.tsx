'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ServiceUser = {
  id: string;
  fullName: string;
  status: string;
  organizationId: string;
};

type AttendanceLog = {
  id: string;
  serviceUserId: string;
  method: string;
  clockInAt: string;
  clockOutAt: string | null;
};

type AttendanceCorrection = {
  id: string;
  attendanceLogId: string;
  reason: string;
  status: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
};

type AttendanceDayStatus = {
  id: string;
  serviceUserId: string;
  workDate: string;
  status: string;
  note: string | null;
};

type WageTemplatesResponse = {
  current: { code: string; label: string; note: string };
  available: Array<{ code: string; label: string; note: string }>;
};

type WageRules = {
  standardDailyHours: number;
  presentPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  absentPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  paidLeavePolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  scheduledHolidayPolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
  specialLeavePolicy: 'actual_only' | 'fixed_zero' | 'fixed_standard';
};

type WageRuleChangeRequest = {
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

type WageCalculationItem = {
  id: string;
  serviceUserId: string;
  year: number;
  month: number;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  netAmount: number;
  status: string;
  dayStatusSummary?: {
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
};

type WageCalculateResponse = {
  count: number;
  items: WageCalculationItem[];
};

type WageSlip = {
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
  dayStatusSummary: {
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
};

type LoginResponse = {
  mfaRequired: boolean;
  challengeToken: string;
  email: string;
};

type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const serviceUserStatuses = ['tour', 'trial', 'interview', 'active', 'leaving', 'left'] as const;
type ServiceUserStatus = (typeof serviceUserStatuses)[number];
const attendanceDayStatusOptions = [
  { value: 'present', label: '出勤扱い' },
  { value: 'absent', label: '欠勤' },
  { value: 'paid_leave', label: '有給' },
  { value: 'scheduled_holiday', label: '所定休日' },
  { value: 'special_leave', label: '特別休暇' },
] as const;
type AttendanceDayStatusValue = (typeof attendanceDayStatusOptions)[number]['value'];

function normalizeServiceUserStatus(status: string): ServiceUserStatus {
  if (serviceUserStatuses.includes(status as ServiceUserStatus)) {
    return status as ServiceUserStatus;
  }
  return 'active';
}

const apiErrorCodeMessages: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません。',
  mfa_not_configured: 'MFAが未設定のアカウントです。管理者へ連絡してください。',
  invalid_otp: 'MFAコードが正しくありません。最新コードを再入力してください。',
  invalid_challenge_type: 'MFAチャレンジが不正です。ログインからやり直してください。',
  challenge_invalid_or_expired: 'MFAチャレンジの有効期限が切れました。ログインからやり直してください。',
  unauthorized: '認証に失敗しました。ログイン状態を確認してください。',
  forbidden: 'この操作を実行する権限がありません。',
  organization_forbidden: '他組織データへのアクセスは許可されていません。',
  service_user_not_found: '対象の利用者が見つかりません。',
  attendance_not_found: '対象の勤怠データが見つかりません。',
  not_found: '対象データが見つかりません。',
  invalid_date_range: '日付範囲が不正です（from は to 以下にしてください）。',
  open_clock_in_not_found: '未退勤の出勤打刻が見つかりません。',
  validation_error: '入力値が不正です。必須項目と形式を確認してください。',
  change_reason_required: 'ルール変更理由を入力してください。',
  reviewer_must_differ: '申請者本人は承認できません。別ユーザーで承認してください。',
  request_not_pending: 'この申請は承認可能な状態ではありません。',
  review_comment_required: '却下理由を入力してください。',
};

type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
};

function resolveApiErrorMessage(status: number, text: string): string {
  try {
    const payload = JSON.parse(text) as ApiErrorPayload;
    if (payload.code && apiErrorCodeMessages[payload.code]) return apiErrorCodeMessages[payload.code];
    if (typeof payload.message === 'string' && apiErrorCodeMessages[payload.message]) {
      return apiErrorCodeMessages[payload.message];
    }
    if (typeof payload.message === 'string' && payload.message.trim().length > 0) return payload.message;
    if (Array.isArray(payload.message) && payload.message.length > 0) return payload.message.join(', ');
  } catch {
    // noop
  }
  if (status === 401 && text.toLowerCase().includes('jwt')) {
    return '認証トークンの有効期限が切れています。再ログインしてください。';
  }
  return `API呼び出しに失敗しました（HTTP ${status}）`;
}

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
}

async function fetchJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(resolveApiErrorMessage(res.status, text));
  }
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('POST', path, body, token);
}

async function patchJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('PATCH', path, body, token);
}

async function sendJson<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(resolveApiErrorMessage(res.status, text));
  }
  return (await res.json()) as T;
}

function getFilenameFromContentDisposition(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const matched = value.match(/filename="?([^"]+)"?/i);
  return matched?.[1] || fallback;
}

const uatScenarioItems = [
  'シナリオ1: ログイン',
  'シナリオ2: 利用者登録とステータス更新',
  'シナリオ3: 打刻（出勤・退勤）',
  'シナリオ4: 勤怠修正申請と承認',
  'シナリオ5: 月次賃金計算から明細出力',
  '異常系: MFA誤り/権限不足/不正IDの確認',
] as const;

const uatStorageKey = 'admin-uat-progress-v1';

export default function AdminConsole() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [opsInfo, setOpsInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrection[]>([]);
  const [attendanceDayStatuses, setAttendanceDayStatuses] = useState<AttendanceDayStatus[]>([]);
  const [wageTemplates, setWageTemplates] = useState<WageTemplatesResponse | null>(null);
  const [wageRules, setWageRules] = useState<WageRules>({
    standardDailyHours: 4,
    presentPolicy: 'actual_only',
    absentPolicy: 'fixed_zero',
    paidLeavePolicy: 'fixed_standard',
    scheduledHolidayPolicy: 'fixed_zero',
    specialLeavePolicy: 'fixed_standard',
  });
  const [wageRuleChangeReason, setWageRuleChangeReason] = useState('');
  const [wageRuleRequests, setWageRuleRequests] = useState<WageRuleChangeRequest[]>([]);
  const [wageRuleReviewCommentById, setWageRuleReviewCommentById] = useState<Record<string, string>>({});
  const [wageCalculations, setWageCalculations] = useState<WageCalculationItem[]>([]);
  const [wageSlip, setWageSlip] = useState<WageSlip | null>(null);
  const [wageYear, setWageYear] = useState(new Date().getFullYear());
  const [wageMonth, setWageMonth] = useState(new Date().getMonth() + 1);
  const [approveWageId, setApproveWageId] = useState('');
  const [slipWageId, setSlipWageId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newDisabilityCategory, setNewDisabilityCategory] = useState('');
  const [newContractDate, setNewContractDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newStatus, setNewStatus] = useState<ServiceUserStatus>('active');
  const [inlineStatusDrafts, setInlineStatusDrafts] = useState<Record<string, ServiceUserStatus>>({});
  const [updatingServiceUserId, setUpdatingServiceUserId] = useState('');
  const [recentCreatedUserId, setRecentCreatedUserId] = useState('');
  const [correctionTargetLogId, setCorrectionTargetLogId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionClockInAt, setCorrectionClockInAt] = useState('');
  const [correctionClockOutAt, setCorrectionClockOutAt] = useState('');
  const [approveCorrectionId, setApproveCorrectionId] = useState('');
  const [clockServiceUserId, setClockServiceUserId] = useState('');
  const [clockMethod, setClockMethod] = useState('web');
  const [clockLocation, setClockLocation] = useState('');
  const [quickClockLoadingByUser, setQuickClockLoadingByUser] = useState<Record<string, boolean>>({});
  const [quickClockErrorByUser, setQuickClockErrorByUser] = useState<Record<string, string>>({});
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayStatusDraftByUser, setDayStatusDraftByUser] = useState<Record<string, AttendanceDayStatusValue>>({});
  const [dayStatusNoteByUser, setDayStatusNoteByUser] = useState<Record<string, string>>({});
  const [dayStatusSavingByUser, setDayStatusSavingByUser] = useState<Record<string, boolean>>({});
  const [dayStatusErrorByUser, setDayStatusErrorByUser] = useState<Record<string, string>>({});
  const [uatChecks, setUatChecks] = useState<Record<string, boolean>>({});
  const [uatExecutor, setUatExecutor] = useState('');
  const [uatEnvironment, setUatEnvironment] = useState('');
  const [uatNotes, setUatNotes] = useState('');

  const tokenReady = useMemo(() => accessToken.trim().length > 0, [accessToken]);
  const selectedClockUserName = useMemo(
    () => serviceUsers.find((x) => x.id === clockServiceUserId)?.fullName || '',
    [serviceUsers, clockServiceUserId],
  );
  const latestAttendanceByServiceUser = useMemo(() => {
    const map = new Map<string, AttendanceLog>();
    for (const log of attendanceLogs) {
      const prev = map.get(log.serviceUserId);
      if (!prev || new Date(log.clockInAt).getTime() > new Date(prev.clockInAt).getTime()) {
        map.set(log.serviceUserId, log);
      }
    }
    return map;
  }, [attendanceLogs]);
  const dayStatusByServiceUser = useMemo(() => {
    const map = new Map<string, AttendanceDayStatus>();
    for (const item of attendanceDayStatuses) {
      map.set(item.serviceUserId, item);
    }
    return map;
  }, [attendanceDayStatuses]);

  useEffect(() => {
    if (!tokenReady) return;
    void refreshAttendanceDayStatuses(accessToken.trim(), workDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenReady, accessToken, workDate]);

  useEffect(() => {
    const raw = localStorage.getItem(uatStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        checks?: Record<string, boolean>;
        executor?: string;
        environment?: string;
        notes?: string;
      };
      if (parsed.checks) setUatChecks(parsed.checks);
      if (typeof parsed.executor === 'string') setUatExecutor(parsed.executor);
      if (typeof parsed.environment === 'string') setUatEnvironment(parsed.environment);
      if (typeof parsed.notes === 'string') setUatNotes(parsed.notes);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      uatStorageKey,
      JSON.stringify({
        checks: uatChecks,
        executor: uatExecutor,
        environment: uatEnvironment,
        notes: uatNotes,
      }),
    );
  }, [uatChecks, uatExecutor, uatEnvironment, uatNotes]);

  function labelForDayStatus(status: string) {
    const found = attendanceDayStatusOptions.find((x) => x.value === status);
    return found?.label || status;
  }

  function applyAttendanceLogUpdate(log: AttendanceLog) {
    setAttendanceLogs((prev) => {
      const idx = prev.findIndex((x) => x.id === log.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = log;
        return next;
      }
      return [log, ...prev];
    });
    if (!correctionTargetLogId) {
      setCorrectionTargetLogId(log.id);
    }
  }

  async function refreshAttendanceLogs(token: string) {
    const data = await fetchJson<AttendanceLog[]>('/attendance?page=1&limit=20', token.trim());
    setAttendanceLogs(data);
    if (data.length > 0 && !correctionTargetLogId) {
      setCorrectionTargetLogId(data[0].id);
    }
  }

  async function refreshAttendanceDayStatuses(token: string, targetWorkDate = workDate) {
    const from = `${targetWorkDate}T00:00:00.000Z`;
    const to = `${targetWorkDate}T23:59:59.999Z`;
    const data = await fetchJson<AttendanceDayStatus[]>(
      `/attendance-statuses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=200`,
      token.trim(),
    );
    setAttendanceDayStatuses(data);
    setDayStatusDraftByUser((prev) => {
      const next = { ...prev };
      for (const item of data) {
        next[item.serviceUserId] = (item.status as AttendanceDayStatusValue) || 'present';
      }
      return next;
    });
    setDayStatusNoteByUser((prev) => {
      const next = { ...prev };
      for (const item of data) {
        next[item.serviceUserId] = item.note || '';
      }
      return next;
    });
  }

  async function refreshServiceUsers(token: string) {
    const data = await fetchJson<ServiceUser[]>('/service-users?page=1&limit=20', token.trim());
    setServiceUsers(data);
    setInlineStatusDrafts((prev) => {
      const next: Record<string, ServiceUserStatus> = {};
      for (const user of data) {
        next[user.id] = prev[user.id] || normalizeServiceUserStatus(user.status);
      }
      return next;
    });
    if (data.length > 0 && !clockServiceUserId) {
      setClockServiceUserId(data[0].id);
    }
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });
      setChallengeToken(data.challengeToken);
      setSessionInfo('ログイン成功。MFAコードを入力してください。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function verifyMfa(e: FormEvent) {
    e.preventDefault();
    if (!challengeToken.trim() || !otp.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<TokenPairResponse>('/auth/mfa/verify', {
        challengeToken: challengeToken.trim(),
        otp: otp.trim(),
      });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setSessionInfo(`認証完了。Access Token有効期限: ${data.expiresIn}秒`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA検証に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function refreshSession() {
    if (!refreshToken.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      const data = await postJson<TokenPairResponse>('/auth/refresh', {
        refreshToken: refreshToken.trim(),
      });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setSessionInfo(`トークン更新完了。Access Token有効期限: ${data.expiresIn}秒`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トークン更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!refreshToken.trim()) return;
    setLoading(true);
    setError('');
    setSessionInfo('');
    setOpsInfo('');
    try {
      await postJson<{ success: boolean }>('/auth/logout', {
        refreshToken: refreshToken.trim(),
      });
      setAccessToken('');
      setRefreshToken('');
      setChallengeToken('');
      setOtp('');
      setOpsInfo('');
      setSessionInfo('ログアウトしました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadServiceUsers(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      await refreshServiceUsers(accessToken.trim());
      setOpsInfo('利用者一覧を更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '利用者一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      await refreshAttendanceLogs(accessToken.trim());
      await refreshAttendanceDayStatuses(accessToken.trim());
      setOpsInfo('勤怠一覧を更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '勤怠一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadWageTemplates(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<WageTemplatesResponse>('/wages/templates', accessToken.trim());
      setWageTemplates(data);
      setOpsInfo('賃金テンプレートを取得しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadWageRules(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<WageRules>('/wages/rules', accessToken.trim());
      setWageRules(data);
      setOpsInfo('賃金計算ルールを取得しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金計算ルールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function saveWageRules(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await sendJson<WageRules>(
        'PUT',
        '/wages/rules',
        {
          ...wageRules,
          changeReason: wageRuleChangeReason,
        },
        accessToken.trim(),
      );
      setWageRules(data);
      setWageRuleChangeReason('');
      setOpsInfo('賃金計算ルールを更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金計算ルールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadWageRuleRequests(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<WageRuleChangeRequest[]>('/wages/rules/requests?status=pending', accessToken.trim());
      setWageRuleRequests(data);
      setOpsInfo(`賃金ルール変更申請を取得しました（${data.length}件）。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金ルール変更申請の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function createWageRuleRequest(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const created = await postJson<WageRuleChangeRequest>(
        '/wages/rules/requests',
        {
          ...wageRules,
          changeReason: wageRuleChangeReason,
        },
        accessToken.trim(),
      );
      setWageRuleChangeReason('');
      setWageRuleRequests((prev) => [created, ...prev]);
      setOpsInfo('賃金ルール変更申請を作成しました。別ユーザーで承認してください。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金ルール変更申請の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function approveWageRuleRequest(requestId: string) {
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      await postJson<WageRuleChangeRequest>(`/wages/rules/requests/${requestId}/approve`, {}, accessToken.trim());
      await Promise.all([refreshWageRules(accessToken.trim()), refreshWageRuleRequests(accessToken.trim())]);
      setOpsInfo('賃金ルール変更申請を承認し、ルールへ適用しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金ルール変更申請の承認に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function rejectWageRuleRequest(requestId: string) {
    if (!tokenReady) return;
    const reviewComment = (wageRuleReviewCommentById[requestId] || '').trim();
    if (!reviewComment) {
      setError('却下理由を入力してください。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await postJson<WageRuleChangeRequest>(
        `/wages/rules/requests/${requestId}/reject`,
        { reviewComment },
        accessToken.trim(),
      );
      setWageRuleReviewCommentById((prev) => ({ ...prev, [requestId]: '' }));
      await refreshWageRuleRequests(accessToken.trim());
      setOpsInfo('賃金ルール変更申請を却下しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金ルール変更申請の却下に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function refreshWageRules(token: string) {
    const data = await fetchJson<WageRules>('/wages/rules', token);
    setWageRules(data);
  }

  async function refreshWageRuleRequests(token: string) {
    const data = await fetchJson<WageRuleChangeRequest[]>('/wages/rules/requests?status=pending', token);
    setWageRuleRequests(data);
  }

  async function calculateMonthlyWages(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const data = await postJson<WageCalculateResponse>(
        '/wages/calculate-monthly',
        { year: wageYear, month: wageMonth },
        accessToken.trim(),
      );
      setWageCalculations(data.items);
      if (data.items.length > 0) {
        setApproveWageId(data.items[0].id);
        setSlipWageId(data.items[0].id);
      }
      setOpsInfo(`月次賃金を計算しました（${data.count}件）。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '月次賃金計算に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function approveWageCalculation(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !approveWageId.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const item = await postJson<WageCalculationItem>(
        `/wages/${approveWageId.trim()}/approve`,
        {},
        accessToken.trim(),
      );
      setWageCalculations((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setSlipWageId(item.id);
      setOpsInfo('賃金計算を承認しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金承認に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function loadWageSlipJson(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !slipWageId.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const item = await fetchJson<WageSlip>(`/wages/${slipWageId.trim()}/slip`, accessToken.trim());
      setWageSlip(item);
      setOpsInfo('賃金明細(JSON)を取得しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '賃金明細(JSON)の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function downloadWageSlip(format: 'csv' | 'pdf') {
    if (!tokenReady || !slipWageId.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const res = await fetch(`${apiBaseUrl()}/wages/${slipWageId.trim()}/slip.${format}`, {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(resolveApiErrorMessage(res.status, text));
      }
      const blob = await res.blob();
      const fallback = `wage-slip-${slipWageId.slice(0, 8)}.${format}`;
      const filename = getFilenameFromContentDisposition(res.headers.get('content-disposition'), fallback);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpsInfo(`賃金明細(${format.toUpperCase()})をダウンロードしました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `賃金明細(${format.toUpperCase()})の取得に失敗しました`);
    } finally {
      setLoading(false);
    }
  }

  async function createServiceUser(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !newFullName.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const created = await postJson<ServiceUser>(
        '/service-users',
        {
          fullName: newFullName.trim(),
          disabilityCategory: newDisabilityCategory.trim() || undefined,
          contractDate: newContractDate || undefined,
          phone: newPhone.trim() || undefined,
          emergencyContact: newEmergencyContact.trim() || undefined,
          status: newStatus,
        },
        accessToken.trim(),
      );
      await refreshServiceUsers(accessToken.trim());
      setClockServiceUserId(created.id);
      setRecentCreatedUserId(created.id);
      setNewFullName('');
      setNewDisabilityCategory('');
      setNewContractDate('');
      setNewPhone('');
      setNewEmergencyContact('');
      setNewStatus('active');
      setOpsInfo(`利用者を登録しました。次は「${created.fullName}」を対象にそのままステータス更新/打刻できます。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '利用者登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function updateServiceUserStatusById(serviceUserId: string, status: ServiceUserStatus) {
    setLoading(true);
    setUpdatingServiceUserId(serviceUserId);
    setError('');
    setOpsInfo('');
    try {
      await patchJson<ServiceUser>(
        `/service-users/${serviceUserId}/status`,
        { status },
        accessToken.trim(),
      );
      await refreshServiceUsers(accessToken.trim());
      setOpsInfo('利用者ステータスを更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
    } finally {
      setUpdatingServiceUserId('');
      setLoading(false);
    }
  }

  async function applyQuickStatus(serviceUserId: string, status: ServiceUserStatus) {
    setInlineStatusDrafts((prev) => ({ ...prev, [serviceUserId]: status }));
    await updateServiceUserStatusById(serviceUserId, status);
  }

  async function createAttendanceCorrection(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !correctionTargetLogId || !correctionReason.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const item = await postJson<AttendanceCorrection>(
        '/attendance-corrections',
        {
          attendanceLogId: correctionTargetLogId,
          reason: correctionReason.trim(),
          requestedClockInAt: correctionClockInAt ? new Date(correctionClockInAt).toISOString() : undefined,
          requestedClockOutAt: correctionClockOutAt ? new Date(correctionClockOutAt).toISOString() : undefined,
        },
        accessToken.trim(),
      );
      setAttendanceCorrections((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setApproveCorrectionId(item.id);
      setCorrectionReason('');
      setCorrectionClockInAt('');
      setCorrectionClockOutAt('');
      setOpsInfo('勤怠修正申請を作成しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '勤怠修正申請の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function clockIn(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !clockServiceUserId) return;
    await runClockAction(clockServiceUserId, 'clock-in');
  }

  async function clockOut() {
    if (!tokenReady || !clockServiceUserId) return;
    await runClockAction(clockServiceUserId, 'clock-out');
  }

  async function runClockAction(serviceUserId: string, action: 'clock-in' | 'clock-out') {
    if (!tokenReady) return;
    const userName = serviceUsers.find((x) => x.id === serviceUserId)?.fullName || serviceUserId.slice(0, 8);
    setLoading(true);
    setQuickClockLoadingByUser((prev) => ({ ...prev, [serviceUserId]: true }));
    setQuickClockErrorByUser((prev) => ({ ...prev, [serviceUserId]: '' }));
    setError('');
    setOpsInfo('');
    try {
      const item = await postJson<AttendanceLog>(
        `/attendance/${action}`,
        {
          serviceUserId,
          ...(action === 'clock-in'
            ? {
                method: clockMethod || 'web',
                location: clockLocation.trim() || undefined,
              }
            : {}),
        },
        accessToken.trim(),
      );
      applyAttendanceLogUpdate(item);
      setOpsInfo(`「${userName}」の${action === 'clock-in' ? '出勤' : '退勤'}打刻を登録しました。`);
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action === 'clock-in' ? '出勤' : '退勤'}打刻に失敗しました`;
      setQuickClockErrorByUser((prev) => ({ ...prev, [serviceUserId]: message }));
      setError(message);
    } finally {
      setQuickClockLoadingByUser((prev) => ({ ...prev, [serviceUserId]: false }));
      setLoading(false);
    }
  }

  async function upsertDayStatus(serviceUserId: string) {
    if (!tokenReady) return;
    const status = dayStatusDraftByUser[serviceUserId] || 'present';
    const note = dayStatusNoteByUser[serviceUserId] || '';
    setLoading(true);
    setDayStatusSavingByUser((prev) => ({ ...prev, [serviceUserId]: true }));
    setDayStatusErrorByUser((prev) => ({ ...prev, [serviceUserId]: '' }));
    setError('');
    setOpsInfo('');
    try {
      const item = await postJson<AttendanceDayStatus>(
        '/attendance-statuses/upsert',
        {
          serviceUserId,
          workDate,
          status,
          note: note.trim() || undefined,
        },
        accessToken.trim(),
      );
      setAttendanceDayStatuses((prev) => {
        const filtered = prev.filter((x) => x.serviceUserId !== serviceUserId);
        return [item, ...filtered];
      });
      setOpsInfo('日別勤怠区分を更新しました。');
    } catch (err) {
      const message = err instanceof Error ? err.message : '日別勤怠区分の更新に失敗しました';
      setDayStatusErrorByUser((prev) => ({ ...prev, [serviceUserId]: message }));
      setError(message);
    } finally {
      setDayStatusSavingByUser((prev) => ({ ...prev, [serviceUserId]: false }));
      setLoading(false);
    }
  }

  async function approveAttendanceCorrection(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !approveCorrectionId.trim()) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      const item = await postJson<AttendanceCorrection>(
        `/attendance-corrections/${approveCorrectionId.trim()}/approve`,
        {},
        accessToken.trim(),
      );
      setAttendanceCorrections((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      await refreshAttendanceLogs(accessToken.trim());
      setOpsInfo('勤怠修正申請を承認しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '勤怠修正申請の承認に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function copyUatRecord() {
    const done = uatScenarioItems.filter((item) => uatChecks[item]);
    const pending = uatScenarioItems.filter((item) => !uatChecks[item]);
    const report = [
      `実施日: ${new Date().toLocaleDateString('ja-JP')}`,
      `実施者: ${uatExecutor || '(未入力)'}`,
      `対象環境: ${uatEnvironment || '(未入力)'}`,
      `成功シナリオ: ${done.length > 0 ? done.join(' / ') : '(なし)'}`,
      `未実施シナリオ: ${pending.length > 0 ? pending.join(' / ') : '(なし)'}`,
      `不具合・要望: ${uatNotes || '(なし)'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setOpsInfo('UAT実施記録をクリップボードへコピーしました。');
    } catch {
      setError('UAT実施記録のコピーに失敗しました。');
    }
  }

  return (
    <div className="grid">
      <section className="card guide-card">
        <h2>最短手順ガイド（現場向け）</h2>
        <ol className="guide-list">
          <li>「ログイン」でMFA認証を完了する</li>
          <li>「利用者一覧を取得」で対象利用者を読み込む</li>
          <li>当日運用は「勤怠管理」で出勤/退勤を打刻する</li>
          <li>打刻ミス時は「修正申請」を作成し、管理者が承認する</li>
          <li>月末は「賃金管理」で計算→承認→明細出力する</li>
        </ol>
        <p className="small">操作結果は画面上部のメッセージ欄に表示されます。</p>
      </section>

      <section className="card">
        <h2>UAT実施記録</h2>
        <p className="small">現場テストの進捗をこの画面で記録できます（ブラウザ保存）。</p>
        <div className="checklist">
          {uatScenarioItems.map((item) => (
            <label key={item} className="check-row">
              <input
                type="checkbox"
                checked={!!uatChecks[item]}
                onChange={(e) =>
                  setUatChecks((prev) => ({
                    ...prev,
                    [item]: e.target.checked,
                  }))
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 10 }}>
          <label className="field">
            <span>実施者</span>
            <input value={uatExecutor} onChange={(e) => setUatExecutor(e.target.value)} placeholder="氏名" />
          </label>
          <label className="field">
            <span>対象環境</span>
            <input value={uatEnvironment} onChange={(e) => setUatEnvironment(e.target.value)} placeholder="staging / local など" />
          </label>
        </div>
        <label className="field">
          <span>不具合・要望メモ</span>
          <textarea
            rows={4}
            value={uatNotes}
            onChange={(e) => setUatNotes(e.target.value)}
            placeholder="再現手順・期待結果・実際結果を残す"
          />
        </label>
        <button type="button" onClick={() => void copyUatRecord()}>
          実施記録をコピー
        </button>
      </section>

      <section className="card">
        <h2>1. 認証</h2>
        <p className="small">メール/パスワード -&gt; MFAコード入力でセッションを開始します。</p>
        <ul className="small" style={{ marginTop: 6, paddingLeft: 18 }}>
          <li>OTPは認証アプリの最新6桁を入力（30秒更新）</li>
          <li>MFAチャレンジは5分で失効。期限切れ時は「ログイン（MFA開始）」から再実行</li>
          <li>運用手順詳細: <code>docs/MFA_RUNBOOK.md</code></li>
        </ul>
        <form onSubmit={login}>
          <label className="field">
            <span>メールアドレス</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
          </label>
          <button disabled={loading} type="submit">ログイン（MFA開始）</button>
        </form>
        <form onSubmit={verifyMfa} style={{ marginTop: 12 }}>
          <label className="field">
            <span>MFAコード（6桁）</span>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
          </label>
          <button disabled={loading || !challengeToken.trim()} type="submit">MFA検証</button>
        </form>
        <div className="actions" style={{ marginTop: 12 }}>
          <button disabled={loading || !refreshToken.trim()} type="button" onClick={refreshSession}>
            トークン更新
          </button>
          <button disabled={loading || !refreshToken.trim()} type="button" onClick={logout}>
            ログアウト
          </button>
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          認証状態: {tokenReady ? <span className="ok">ログイン中</span> : '未ログイン'}
        </p>
        {sessionInfo ? <p className="small">{sessionInfo}</p> : null}
        {opsInfo ? <p className="small">{opsInfo}</p> : null}
        <p className="small">API Base URL: {apiBaseUrl()}</p>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>2. 利用者管理</h2>
        <p className="small">登録した利用者は一覧行でそのままステータス更新できます。打刻対象にも自動セットされます。</p>
        <form onSubmit={loadServiceUsers}>
          <button disabled={!tokenReady || loading} type="submit">利用者一覧を取得</button>
        </form>
        <form onSubmit={createServiceUser} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>新規登録</h3>
          <label className="field">
            <span>氏名（必須）</span>
            <input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="山田 太郎" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>障害区分</span>
              <input value={newDisabilityCategory} onChange={(e) => setNewDisabilityCategory(e.target.value)} placeholder="身体" />
            </label>
            <label className="field">
              <span>契約日</span>
              <input type="date" value={newContractDate} onChange={(e) => setNewContractDate(e.target.value)} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>電話</span>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="09012345678" />
            </label>
            <label className="field">
              <span>初期ステータス</span>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as (typeof serviceUserStatuses)[number])}>
                {serviceUserStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>緊急連絡先</span>
            <input
              value={newEmergencyContact}
              onChange={(e) => setNewEmergencyContact(e.target.value)}
              placeholder="母 09000000000"
            />
          </label>
          <button disabled={!tokenReady || loading || !newFullName.trim()} type="submit">利用者を登録</button>
        </form>
        <p className="small" style={{ marginTop: 10 }}>下の一覧から「更新」またはクイック操作でステータス更新できます。</p>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>氏名</th>
              <th>ステータス</th>
              <th>組織</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {serviceUsers.map((user) => (
              <tr key={user.id} className={recentCreatedUserId === user.id ? 'row-highlight' : undefined}>
                <td>{user.id.slice(0, 8)}</td>
                <td>{user.fullName}</td>
                <td>
                  <select
                    value={inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status)}
                    onChange={(e) =>
                      setInlineStatusDrafts((prev) => ({
                        ...prev,
                        [user.id]: e.target.value as ServiceUserStatus,
                      }))
                    }
                  >
                    {serviceUserStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{user.organizationId}</td>
                <td>
                  <div className="actions compact-actions">
                    <button
                      type="button"
                      disabled={
                        !tokenReady ||
                        loading ||
                        updatingServiceUserId === user.id ||
                        (inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status)) === user.status
                      }
                      onClick={() =>
                        void updateServiceUserStatusById(
                          user.id,
                          inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status),
                        )
                      }
                    >
                      {updatingServiceUserId === user.id ? '更新中...' : '更新'}
                    </button>
                    <button
                      type="button"
                      disabled={!tokenReady || loading || updatingServiceUserId === user.id || user.status === 'active'}
                      onClick={() => {
                        void applyQuickStatus(user.id, 'active');
                      }}
                    >
                      稼働中へ
                    </button>
                    <button
                      type="button"
                      disabled={!tokenReady || loading || updatingServiceUserId === user.id || user.status === 'leaving'}
                      onClick={() => {
                        void applyQuickStatus(user.id, 'leaving');
                      }}
                    >
                      退所準備へ
                    </button>
                    <button
                      type="button"
                      disabled={!tokenReady || loading}
                      onClick={() => {
                        setClockServiceUserId(user.id);
                        setOpsInfo(`「${user.fullName}」を打刻・ステータス更新の対象に設定しました。`);
                      }}
                    >
                      この利用者で打刻
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {serviceUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="small">データ未取得</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>3. 勤怠管理</h2>
        <p className="small">現在の打刻対象: {selectedClockUserName || '未選択'}</p>
        <div className="grid-2">
          <label className="field">
            <span>勤務日</span>
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </label>
          <div className="field">
            <span>日別区分の再取得</span>
            <button
              type="button"
              disabled={!tokenReady || loading}
              onClick={() => void refreshAttendanceDayStatuses(accessToken.trim())}
            >
              区分を再取得
            </button>
          </div>
        </div>
        <h3 style={{ margin: '8px 0' }}>ワンクリック打刻（利用者ごと）</h3>
        <table className="table">
          <thead>
            <tr>
              <th>利用者</th>
              <th>最新打刻</th>
              <th>状態</th>
              <th>日別区分</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {serviceUsers.map((user) => {
              const latest = latestAttendanceByServiceUser.get(user.id);
              const isClocking = !!quickClockLoadingByUser[user.id];
              const quickError = quickClockErrorByUser[user.id] || '';
              const dayStatus = dayStatusByServiceUser.get(user.id);
              const isWorking = !!latest && !latest.clockOutAt;
              const dayStatusDraft = dayStatusDraftByUser[user.id] || (dayStatus?.status as AttendanceDayStatusValue) || 'present';
              const isLeaveLike = ['absent', 'paid_leave', 'scheduled_holiday', 'special_leave'].includes(dayStatusDraft);
              const statusText = isWorking
                ? '勤務中'
                : latest?.clockOutAt
                  ? '退勤済'
                  : dayStatus
                    ? labelForDayStatus(dayStatus.status)
                    : '未打刻';
              const statusClassName = isWorking
                ? 'status-badge status-working'
                : latest?.clockOutAt
                  ? 'status-badge status-done'
                  : dayStatus
                    ? 'status-badge status-leave'
                    : 'status-badge status-missing';
              return (
                <tr key={`quick-clock-${user.id}`}>
                  <td>
                    {user.fullName}
                    <br />
                    <span className="small">{user.id.slice(0, 8)}</span>
                    {quickError ? (
                      <>
                        <br />
                        <span className="error">{quickError}</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {latest ? new Date(latest.clockInAt).toLocaleString('ja-JP') : '-'}
                    {latest?.clockOutAt ? ` / ${new Date(latest.clockOutAt).toLocaleString('ja-JP')}` : ''}
                  </td>
                  <td><span className={statusClassName}>{statusText}</span></td>
                  <td>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <select
                        value={dayStatusDraft}
                        onChange={(e) =>
                          setDayStatusDraftByUser((prev) => ({
                            ...prev,
                            [user.id]: e.target.value as AttendanceDayStatusValue,
                          }))
                        }
                        disabled={!tokenReady || loading}
                      >
                        {attendanceDayStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={dayStatusNoteByUser[user.id] || ''}
                        onChange={(e) =>
                          setDayStatusNoteByUser((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                        placeholder="区分メモ（任意）"
                        disabled={!tokenReady || loading}
                      />
                      <button
                        type="button"
                        disabled={!tokenReady || loading || !!dayStatusSavingByUser[user.id]}
                        onClick={() => void upsertDayStatus(user.id)}
                      >
                        {dayStatusSavingByUser[user.id] ? '保存中...' : '区分を保存'}
                      </button>
                      {dayStatusErrorByUser[user.id] ? (
                        <span className="error">{dayStatusErrorByUser[user.id]}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="actions compact-actions">
                      <button
                        type="button"
                        disabled={!tokenReady || loading || isClocking || isWorking || isLeaveLike}
                        onClick={() => {
                          setClockServiceUserId(user.id);
                          void runClockAction(user.id, 'clock-in');
                        }}
                      >
                        {isClocking ? '処理中...' : '出勤'}
                      </button>
                      <button
                        type="button"
                        disabled={!tokenReady || loading || isClocking || !isWorking || isLeaveLike}
                        onClick={() => {
                          setClockServiceUserId(user.id);
                          void runClockAction(user.id, 'clock-out');
                        }}
                      >
                        {isClocking ? '処理中...' : '退勤'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {serviceUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="small">利用者一覧を先に取得してください</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <form onSubmit={clockIn}>
          <h3 style={{ margin: '0 0 8px' }}>打刻実行</h3>
          <label className="field">
            <span>対象利用者</span>
            <select
              value={clockServiceUserId}
              onChange={(e) => setClockServiceUserId(e.target.value)}
              disabled={serviceUsers.length === 0}
            >
              {serviceUsers.length === 0 ? (
                <option value="">利用者一覧を先に取得</option>
              ) : (
                serviceUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.id.slice(0, 8)})
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="grid-2">
            <label className="field">
              <span>打刻方法</span>
              <select value={clockMethod} onChange={(e) => setClockMethod(e.target.value)}>
                <option value="web">web</option>
                <option value="qr">qr</option>
                <option value="proxy">proxy</option>
              </select>
            </label>
            <label className="field">
              <span>位置情報メモ</span>
              <input
                value={clockLocation}
                onChange={(e) => setClockLocation(e.target.value)}
                placeholder="福岡市中央区"
              />
            </label>
          </div>
          <div className="actions">
            <button disabled={!tokenReady || loading || !clockServiceUserId} type="submit">出勤打刻</button>
            <button
              disabled={!tokenReady || loading || !clockServiceUserId}
              type="button"
              onClick={() => {
                void clockOut();
              }}
            >
              退勤打刻
            </button>
          </div>
        </form>
        <form onSubmit={loadAttendance}>
          <button disabled={!tokenReady || loading} type="submit">勤怠一覧を取得</button>
        </form>
        <form onSubmit={createAttendanceCorrection} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>修正申請</h3>
          <label className="field">
            <span>対象勤怠ログ</span>
            <select
              value={correctionTargetLogId}
              onChange={(e) => setCorrectionTargetLogId(e.target.value)}
              disabled={attendanceLogs.length === 0}
            >
              {attendanceLogs.length === 0 ? (
                <option value="">勤怠一覧を先に取得</option>
              ) : (
                attendanceLogs.map((log) => (
                  <option key={log.id} value={log.id}>
                    {log.id.slice(0, 8)} / {log.serviceUserId.slice(0, 8)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="field">
            <span>修正理由（必須）</span>
            <input value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="退勤時刻修正" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>希望出勤時刻</span>
              <input type="datetime-local" value={correctionClockInAt} onChange={(e) => setCorrectionClockInAt(e.target.value)} />
            </label>
            <label className="field">
              <span>希望退勤時刻</span>
              <input type="datetime-local" value={correctionClockOutAt} onChange={(e) => setCorrectionClockOutAt(e.target.value)} />
            </label>
          </div>
          <button
            disabled={!tokenReady || loading || !correctionTargetLogId || !correctionReason.trim()}
            type="submit"
          >
            修正申請を作成
          </button>
        </form>
        <form onSubmit={approveAttendanceCorrection} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>修正承認</h3>
          <label className="field">
            <span>修正申請ID</span>
            <input
              value={approveCorrectionId}
              onChange={(e) => setApproveCorrectionId(e.target.value)}
              placeholder="UUIDを入力（下表から選択可）"
            />
          </label>
          <button disabled={!tokenReady || loading || !approveCorrectionId.trim()} type="submit">申請を承認</button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>ログID</th>
              <th>利用者ID</th>
              <th>方法</th>
              <th>出勤</th>
              <th>退勤</th>
            </tr>
          </thead>
          <tbody>
            {attendanceLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.id.slice(0, 8)}</td>
                <td>{log.serviceUserId.slice(0, 8)}</td>
                <td>{log.method}</td>
                <td>{new Date(log.clockInAt).toLocaleString('ja-JP')}</td>
                <td>{log.clockOutAt ? new Date(log.clockOutAt).toLocaleString('ja-JP') : '-'}</td>
              </tr>
            ))}
            {attendanceLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="small">データ未取得</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>申請ID</th>
              <th>対象ログ</th>
              <th>状態</th>
              <th>理由</th>
              <th>希望時刻</th>
            </tr>
          </thead>
          <tbody>
            {attendanceCorrections.map((corr) => (
              <tr key={corr.id}>
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setApproveCorrectionId(corr.id)}
                    title={corr.id}
                  >
                    {corr.id.slice(0, 8)}
                  </button>
                </td>
                <td>{corr.attendanceLogId.slice(0, 8)}</td>
                <td>{corr.status}</td>
                <td>{corr.reason}</td>
                <td>
                  {corr.requestedClockInAt ? new Date(corr.requestedClockInAt).toLocaleString('ja-JP') : '-'}
                  {' / '}
                  {corr.requestedClockOutAt ? new Date(corr.requestedClockOutAt).toLocaleString('ja-JP') : '-'}
                </td>
              </tr>
            ))}
            {attendanceCorrections.length === 0 ? (
              <tr>
                <td colSpan={5} className="small">申請データ未作成</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>4. 賃金管理</h2>
        <form onSubmit={loadWageRules}>
          <h3 style={{ margin: '0 0 8px' }}>賃金計算ルール</h3>
          <button disabled={!tokenReady || loading} type="submit">ルールを取得</button>
        </form>
        <form onSubmit={createWageRuleRequest} style={{ marginTop: 12 }}>
          <div className="grid-2">
            <label className="field">
              <span>標準日時間</span>
              <input
                type="number"
                min={1}
                max={12}
                step={0.5}
                value={wageRules.standardDailyHours}
                onChange={(e) => setWageRules((prev) => ({ ...prev, standardDailyHours: Number(e.target.value) }))}
              />
            </label>
            <label className="field">
              <span>出勤(present)</span>
              <select
                value={wageRules.presentPolicy}
                onChange={(e) => setWageRules((prev) => ({ ...prev, presentPolicy: e.target.value as WageRules['presentPolicy'] }))}
              >
                <option value="actual_only">実績時間を使用</option>
                <option value="fixed_zero">0時間固定</option>
                <option value="fixed_standard">標準時間固定</option>
              </select>
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>欠勤(absent)</span>
              <select
                value={wageRules.absentPolicy}
                onChange={(e) => setWageRules((prev) => ({ ...prev, absentPolicy: e.target.value as WageRules['absentPolicy'] }))}
              >
                <option value="actual_only">実績時間を使用</option>
                <option value="fixed_zero">0時間固定</option>
                <option value="fixed_standard">標準時間固定</option>
              </select>
            </label>
            <label className="field">
              <span>有給(paid_leave)</span>
              <select
                value={wageRules.paidLeavePolicy}
                onChange={(e) =>
                  setWageRules((prev) => ({ ...prev, paidLeavePolicy: e.target.value as WageRules['paidLeavePolicy'] }))
                }
              >
                <option value="actual_only">実績時間を使用</option>
                <option value="fixed_zero">0時間固定</option>
                <option value="fixed_standard">標準時間固定</option>
              </select>
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>所定休日(scheduled_holiday)</span>
              <select
                value={wageRules.scheduledHolidayPolicy}
                onChange={(e) =>
                  setWageRules((prev) => ({
                    ...prev,
                    scheduledHolidayPolicy: e.target.value as WageRules['scheduledHolidayPolicy'],
                  }))
                }
              >
                <option value="actual_only">実績時間を使用</option>
                <option value="fixed_zero">0時間固定</option>
                <option value="fixed_standard">標準時間固定</option>
              </select>
            </label>
            <label className="field">
              <span>特休(special_leave)</span>
              <select
                value={wageRules.specialLeavePolicy}
                onChange={(e) =>
                  setWageRules((prev) => ({ ...prev, specialLeavePolicy: e.target.value as WageRules['specialLeavePolicy'] }))
                }
              >
                <option value="actual_only">実績時間を使用</option>
                <option value="fixed_zero">0時間固定</option>
                <option value="fixed_standard">標準時間固定</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>変更理由（監査ログ用・必須）</span>
            <input
              value={wageRuleChangeReason}
              onChange={(e) => setWageRuleChangeReason(e.target.value)}
              placeholder="例: 2026年4月運用見直しのため"
              required
            />
          </label>
          <button disabled={!tokenReady || loading} type="submit">変更申請を作成</button>
        </form>
        <form onSubmit={loadWageRuleRequests} style={{ marginTop: 8 }}>
          <button disabled={!tokenReady || loading} type="submit">変更申請を取得</button>
        </form>
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>申請ID</th>
              <th>理由</th>
              <th>標準時間</th>
              <th>申請者</th>
              <th>状態</th>
              <th>却下理由</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {wageRuleRequests.map((item) => (
              <tr key={item.id}>
                <td>{item.id.slice(0, 8)}</td>
                <td>{item.changeReason}</td>
                <td>{item.standardDailyHours}</td>
                <td>{item.requestedBy.slice(0, 8)}</td>
                <td>{item.status}</td>
                <td>
                  <input
                    value={wageRuleReviewCommentById[item.id] || ''}
                    onChange={(e) =>
                      setWageRuleReviewCommentById((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="却下時のみ必須"
                  />
                </td>
                <td>
                  <button
                    disabled={!tokenReady || loading || item.status !== 'pending'}
                    type="button"
                    onClick={() => void approveWageRuleRequest(item.id)}
                  >
                    承認
                  </button>
                  <button
                    style={{ marginLeft: 8 }}
                    disabled={!tokenReady || loading || item.status !== 'pending'}
                    type="button"
                    onClick={() => void rejectWageRuleRequest(item.id)}
                  >
                    却下
                  </button>
                </td>
              </tr>
            ))}
            {wageRuleRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="small">申請データ未取得</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <form onSubmit={saveWageRules} style={{ marginTop: 12 }}>
          <button disabled={!tokenReady || loading} type="submit">管理者が直接保存（互換）</button>
        </form>
        <form onSubmit={calculateMonthlyWages}>
          <h3 style={{ margin: '0 0 8px' }}>月次賃金計算</h3>
          <div className="grid-2">
            <label className="field">
              <span>年</span>
              <input
                type="number"
                value={wageYear}
                onChange={(e) => setWageYear(Number(e.target.value))}
                min={2020}
                max={2100}
              />
            </label>
            <label className="field">
              <span>月</span>
              <input
                type="number"
                value={wageMonth}
                onChange={(e) => setWageMonth(Number(e.target.value))}
                min={1}
                max={12}
              />
            </label>
          </div>
          <button disabled={!tokenReady || loading} type="submit">月次賃金を計算</button>
        </form>
        <form onSubmit={approveWageCalculation} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>賃金承認</h3>
          <label className="field">
            <span>賃金計算ID</span>
            <input
              value={approveWageId}
              onChange={(e) => setApproveWageId(e.target.value)}
              placeholder="UUIDを入力（下表から選択可）"
            />
          </label>
          <button disabled={!tokenReady || loading || !approveWageId.trim()} type="submit">賃金を承認</button>
        </form>
        <form onSubmit={loadWageSlipJson} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>賃金明細</h3>
          <label className="field">
            <span>対象賃金ID</span>
            <input
              value={slipWageId}
              onChange={(e) => setSlipWageId(e.target.value)}
              placeholder="UUIDを入力（下表から選択可）"
            />
          </label>
          <div className="actions">
            <button disabled={!tokenReady || loading || !slipWageId.trim()} type="submit">明細(JSON)取得</button>
            <button
              disabled={!tokenReady || loading || !slipWageId.trim()}
              type="button"
              onClick={() => downloadWageSlip('csv')}
            >
              明細CSV
            </button>
            <button
              disabled={!tokenReady || loading || !slipWageId.trim()}
              type="button"
              onClick={() => downloadWageSlip('pdf')}
            >
              明細PDF
            </button>
          </div>
        </form>
        <form onSubmit={loadWageTemplates} style={{ marginTop: 12 }}>
          <button disabled={!tokenReady || loading} type="submit">テンプレートを取得</button>
        </form>
        {wageTemplates ? (
          <>
            <p>現在: {wageTemplates.current.label} ({wageTemplates.current.code})</p>
            <p className="small">注記: {wageTemplates.current.note}</p>
            <ul>
              {wageTemplates.available.map((item) => (
                <li key={item.code}>
                  {item.label} ({item.code})<br />
                  <span className="small">{item.note}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="small">データ未取得</p>
        )}
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>計算ID</th>
              <th>対象</th>
              <th>時間</th>
              <th>支給額</th>
              <th>区分反映内訳</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {wageCalculations.map((item) => (
              <tr key={item.id}>
                <td>
                  <button type="button" className="link-button" onClick={() => { setApproveWageId(item.id); setSlipWageId(item.id); }}>
                    {item.id.slice(0, 8)}
                  </button>
                </td>
                <td>{item.year}-{String(item.month).padStart(2, '0')} / {item.serviceUserId.slice(0, 8)}</td>
                <td>{item.totalHours}h</td>
                <td>{item.netAmount.toLocaleString('ja-JP')}円</td>
                <td className="small">
                  {item.dayStatusSummary ? (
                    <>
                      実績{item.dayStatusSummary.actualWorkedHours}h → 反映{item.dayStatusSummary.adjustedHours}h
                      <br />
                      Δ{item.dayStatusSummary.deltaHours >= 0 ? '+' : ''}
                      {item.dayStatusSummary.deltaHours}h
                      <br />
                      欠勤:{item.dayStatusSummary.counts.absent} / 有給:{item.dayStatusSummary.counts.paid_leave} / 休日:
                      {item.dayStatusSummary.counts.scheduled_holiday}
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{item.status}</td>
              </tr>
            ))}
            {wageCalculations.length === 0 ? (
              <tr>
                <td colSpan={6} className="small">計算データ未作成</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {wageSlip ? (
          <table className="table" style={{ marginTop: 12 }}>
            <tbody>
              <tr><th>利用者</th><td>{wageSlip.serviceUserName}</td></tr>
              <tr><th>対象月</th><td>{wageSlip.month}</td></tr>
              <tr><th>総時間</th><td>{wageSlip.totalHours}h</td></tr>
              <tr><th>時給</th><td>{wageSlip.hourlyRate.toLocaleString('ja-JP')}円</td></tr>
              <tr><th>支給額</th><td>{wageSlip.netAmount.toLocaleString('ja-JP')}円</td></tr>
              <tr><th>実績時間</th><td>{wageSlip.dayStatusSummary.actualWorkedHours}h</td></tr>
              <tr><th>反映時間</th><td>{wageSlip.dayStatusSummary.adjustedHours}h</td></tr>
              <tr><th>時間差分</th><td>{wageSlip.dayStatusSummary.deltaHours >= 0 ? '+' : ''}{wageSlip.dayStatusSummary.deltaHours}h</td></tr>
              <tr>
                <th>区分件数</th>
                <td>
                  欠勤:{wageSlip.dayStatusSummary.counts.absent} /
                  有給:{wageSlip.dayStatusSummary.counts.paid_leave} /
                  所定休日:{wageSlip.dayStatusSummary.counts.scheduled_holiday} /
                  特休:{wageSlip.dayStatusSummary.counts.special_leave}
                </td>
              </tr>
              <tr><th>状態</th><td>{wageSlip.statusLabel}</td></tr>
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
