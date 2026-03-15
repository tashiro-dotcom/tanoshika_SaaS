'use client';

import ErrorMessage from '../../_components/ErrorMessage';
import InfoMessage from '../../_components/InfoMessage';
import { apiBaseUrl } from '../../_lib/api-client';
import type { UseAuthResult } from './useAuth';

export default function AuthSection({ auth }: { auth: UseAuthResult }) {
  return (
    <section className="card">
      <h2>1. 認証</h2>
      <p className="small">メール/パスワード -&gt; MFAコード入力でセッションを開始します。</p>
      <ul className="small" style={{ marginTop: 6, paddingLeft: 18 }}>
        <li>OTPは認証アプリの最新6桁を入力（30秒更新）</li>
        <li>MFAチャレンジは5分で失効。期限切れ時は「ログイン（MFA開始）」から再実行</li>
        <li>運用手順詳細: <code>docs/MFA_RUNBOOK.md</code></li>
      </ul>
      <form onSubmit={auth.login}>
        <label className="field">
          <span>メールアドレス</span>
          <input value={auth.email} onChange={(event) => auth.setEmail(event.target.value)} placeholder="admin@example.com" />
        </label>
        <label className="field">
          <span>パスワード</span>
          <input type="password" value={auth.password} onChange={(event) => auth.setPassword(event.target.value)} placeholder="********" />
        </label>
        <button disabled={auth.loading} type="submit">ログイン（MFA開始）</button>
      </form>
      <form onSubmit={auth.verifyMfa} style={{ marginTop: 12 }}>
        <label className="field">
          <span>MFAコード（6桁）</span>
          <input value={auth.otp} onChange={(event) => auth.setOtp(event.target.value)} placeholder="123456" />
        </label>
        <button disabled={auth.loading || !auth.challengeToken.trim()} type="submit">MFA検証</button>
      </form>
      <div className="actions" style={{ marginTop: 12 }}>
        <button disabled={auth.loading || !auth.refreshToken.trim()} type="button" onClick={() => void auth.refreshSession()}>
          トークン更新
        </button>
        <button disabled={auth.loading || !auth.refreshToken.trim()} type="button" onClick={() => void auth.logout()}>
          ログアウト
        </button>
      </div>
      <p className="small" style={{ marginTop: 10 }}>
        認証状態: {auth.tokenReady ? <span className="ok">ログイン中</span> : '未ログイン'}
      </p>
      <InfoMessage message={auth.sessionInfo} />
      <InfoMessage message={auth.opsInfo} />
      <p className="small">API Base URL: {apiBaseUrl()}</p>
      <ErrorMessage message={auth.error} />
    </section>
  );
}
