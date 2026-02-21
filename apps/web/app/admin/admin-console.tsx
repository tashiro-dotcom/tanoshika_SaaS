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
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [wageTemplates, setWageTemplates] = useState<WageTemplatesResponse | null>(null);

  const tokenReady = useMemo(() => accessToken.trim().length > 0, [accessToken]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSessionInfo('');
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
    try {
      await postJson<{ success: boolean }>('/auth/logout', {
        refreshToken: refreshToken.trim(),
      });
      setAccessToken('');
      setRefreshToken('');
      setChallengeToken('');
      setOtp('');
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
      const data = await fetchJson<ServiceUser[]>('/service-users?page=1&limit=20', accessToken.trim());
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
      const data = await fetchJson<AttendanceLog[]>('/attendance?page=1&limit=20', accessToken.trim());
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
      const data = await fetchJson<WageTemplatesResponse>('/wages/templates', accessToken.trim());
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
