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

type WageTemplatesResponse = {
  current: { code: string; label: string };
  available: Array<{ code: string; label: string }>;
};

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

export default function AdminConsole() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [wageTemplates, setWageTemplates] = useState<WageTemplatesResponse | null>(null);

  const tokenReady = useMemo(() => token.trim().length > 0, [token]);

  async function loadServiceUsers(e: FormEvent) {
    e.preventDefault();
    if (!tokenReady) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<ServiceUser[]>('/service-users?page=1&limit=20', token.trim());
      setServiceUsers(data);
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
      const data = await fetchJson<AttendanceLog[]>('/attendance?page=1&limit=20', token.trim());
      setAttendanceLogs(data);
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
      const data = await fetchJson<WageTemplatesResponse>('/wages/templates', token.trim());
      setWageTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '工賃テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>接続設定</h2>
        <p className="small">`/auth/mfa/verify` で取得した Access Token を貼り付けてください。</p>
        <label className="field">
          <span>Access Token</span>
          <textarea
            rows={4}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
        </label>
        <p className="small">API Base URL: {apiBaseUrl()}</p>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>利用者管理</h2>
        <form onSubmit={loadServiceUsers}>
          <button disabled={!tokenReady || loading} type="submit">利用者一覧を取得</button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>氏名</th>
              <th>ステータス</th>
              <th>組織</th>
            </tr>
          </thead>
          <tbody>
            {serviceUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.status}</td>
                <td>{user.organizationId}</td>
              </tr>
            ))}
            {serviceUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="small">データ未取得</td>
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
        <table className="table">
          <thead>
            <tr>
              <th>利用者ID</th>
              <th>方法</th>
              <th>出勤</th>
              <th>退勤</th>
            </tr>
          </thead>
          <tbody>
            {attendanceLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.serviceUserId}</td>
                <td>{log.method}</td>
                <td>{new Date(log.clockInAt).toLocaleString('ja-JP')}</td>
                <td>{log.clockOutAt ? new Date(log.clockOutAt).toLocaleString('ja-JP') : '-'}</td>
              </tr>
            ))}
            {attendanceLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="small">データ未取得</td>
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
