# MFA_RUNBOOK

管理画面 `/admin` でのMFA運用手順を標準化する。

## 対象

- 管理者・マネージャー・スタッフ（`staffUser`）のログイン運用
- API: `POST /auth/login` -> `POST /auth/mfa/verify`

## 前提

1. 端末時刻をNTP同期する（時刻ずれはOTP失敗の主因）
2. 認証アプリ（Google Authenticator / Microsoft Authenticator等）で対象シークレットを登録済み
3. `apps/api/.env` の `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` が設定済み

## OTP生成手順（標準）

1. 認証アプリで対象アカウントを開く
2. 6桁OTPを確認する（30秒ごとに更新）
3. `/admin` の「MFAコード」に入力し「MFA検証」を実行

## 開発時のOTP確認（CLI）

開発シークレットからOTPを直接確認したい場合のみ実行する。

```bash
npx otplib-cli --token --secret JBSWY3DPEHPK3PXP
```

## 期限切れ時の再ログイン手順（標準）

`/auth/login` で発行される `challengeToken` は **5分** で失効する。

`challenge_invalid_or_expired` が返った場合は以下を必ず実施する。

1. 既存OTP入力を破棄する
2. `/admin` で「ログイン（MFA開始）」を再実行して新しい `challengeToken` を取得
3. 認証アプリの最新6桁OTPを再入力して「MFA検証」を実行
4. 成功後、必要なら「トークン更新」を実行してセッションを継続

## エラーコード対応表

- `invalid_credentials`: メール/パスワード誤り。資格情報を確認
- `mfa_not_configured`: MFA未設定。管理者がシークレット設定を実施
- `invalid_otp`: OTP不一致。時刻同期と最新コードを確認
- `challenge_invalid_or_expired`: チャレンジ失効。再ログイン手順へ
- `invalid_challenge_type`: 不正トークン。再ログイン手順へ

## 運用ルール

1. OTPは口頭共有・チャット貼り付けを禁止
2. MFA失敗が連続する場合は時刻同期を最優先で確認
3. 期限切れ時は「MFA検証の再試行」ではなく「ログインから再開」を徹底
