'use client';

import { FormEvent, useMemo, useState } from 'react';

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

type WageTemplatesResponse = {
  current: { code: string; label: string };
  available: Array<{ code: string; label: string }>;
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
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('POST', path, body, token);
}

async function patchJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return sendJson<T>('PATCH', path, body, token);
}

async function sendJson<T>(method: 'POST' | 'PATCH', path: string, body: unknown, token?: string): Promise<T> {
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
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

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
  const [wageTemplates, setWageTemplates] = useState<WageTemplatesResponse | null>(null);
  const [newFullName, setNewFullName] = useState('');
  const [newDisabilityCategory, setNewDisabilityCategory] = useState('');
  const [newContractDate, setNewContractDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newStatus, setNewStatus] = useState<(typeof serviceUserStatuses)[number]>('active');
  const [statusTargetUserId, setStatusTargetUserId] = useState('');
  const [statusValue, setStatusValue] = useState<(typeof serviceUserStatuses)[number]>('active');
  const [correctionTargetLogId, setCorrectionTargetLogId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionClockInAt, setCorrectionClockInAt] = useState('');
  const [correctionClockOutAt, setCorrectionClockOutAt] = useState('');
  const [approveCorrectionId, setApproveCorrectionId] = useState('');

  const tokenReady = useMemo(() => accessToken.trim().length > 0, [accessToken]);

  async function refreshServiceUsers(token: string) {
    const data = await fetchJson<ServiceUser[]>('/service-users?page=1&limit=20', token.trim());
    setServiceUsers(data);
    if (data.length > 0 && !statusTargetUserId) {
      setStatusTargetUserId(data[0].id);
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
      const data = await fetchJson<AttendanceLog[]>('/attendance?page=1&limit=20', accessToken.trim());
      setAttendanceLogs(data);
      if (data.length > 0 && !correctionTargetLogId) {
        setCorrectionTargetLogId(data[0].id);
      }
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
      setOpsInfo('工賃テンプレートを取得しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '工賃テンプレートの取得に失敗しました');
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
      await postJson<ServiceUser>(
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
      setNewFullName('');
      setNewDisabilityCategory('');
      setNewContractDate('');
      setNewPhone('');
      setNewEmergencyContact('');
      setNewStatus('active');
      setOpsInfo('利用者を登録しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '利用者登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function updateServiceUserStatus(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady || !statusTargetUserId) return;
    setLoading(true);
    setError('');
    setOpsInfo('');
    try {
      await patchJson<ServiceUser>(
        `/service-users/${statusTargetUserId}/status`,
        { status: statusValue },
        accessToken.trim(),
      );
      await refreshServiceUsers(accessToken.trim());
      setOpsInfo('利用者ステータスを更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
    } finally {
      setLoading(false);
    }
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
      await loadAttendance({ preventDefault: () => {} } as FormEvent);
      setOpsInfo('勤怠修正申請を承認しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '勤怠修正申請の承認に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>ログイン</h2>
        <p className="small">メール/パスワード -&gt; MFAコード入力でセッションを開始します。</p>
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
        <h2>利用者管理</h2>
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
        <form onSubmit={updateServiceUserStatus} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>ステータス更新</h3>
          <div className="grid-2">
            <label className="field">
              <span>対象利用者</span>
              <select
                value={statusTargetUserId}
                onChange={(e) => setStatusTargetUserId(e.target.value)}
                disabled={serviceUsers.length === 0}
              >
                {serviceUsers.length === 0 ? (
                  <option value="">一覧を先に取得</option>
                ) : (
                  serviceUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.id.slice(0, 8)})
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>変更先ステータス</span>
              <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as (typeof serviceUserStatuses)[number])}>
                {serviceUserStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button disabled={!tokenReady || loading || !statusTargetUserId} type="submit">ステータス更新</button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>氏名</th>
              <th>ステータス</th>
              <th>組織</th>
            </tr>
          </thead>
          <tbody>
            {serviceUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id.slice(0, 8)}</td>
                <td>{user.fullName}</td>
                <td>{user.status}</td>
                <td>{user.organizationId}</td>
              </tr>
            ))}
            {serviceUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="small">データ未取得</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>勤怠管理</h2>
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
        <h2>工賃テンプレート</h2>
        <form onSubmit={loadWageTemplates}>
          <button disabled={!tokenReady || loading} type="submit">テンプレートを取得</button>
        </form>
        {wageTemplates ? (
          <>
            <p>現在: {wageTemplates.current.label} ({wageTemplates.current.code})</p>
            <ul>
              {wageTemplates.available.map((item) => (
                <li key={item.code}>{item.label} ({item.code})</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="small">データ未取得</p>
        )}
      </section>
    </div>
  );
}
