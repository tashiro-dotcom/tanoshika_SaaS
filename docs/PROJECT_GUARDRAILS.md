# PROJECT_GUARDRAILS

このファイルは、本プロジェクトの「ぶれない基準」を固定する。
将来の変更は、ここに反しないこと。

## 1. 固定スコープ（MVP）
- 対象: A型事業所 1拠点（50名以下）
- 機能: 利用者管理、勤怠/シフト、工賃計算（時間ベース）、スタッフ権限、支援計画/記録
- 利用者向け画面: 閲覧のみ

## 2. 固定技術方針
- Frontend: Next.js (TypeScript)
- Backend: NestJS (TypeScript)
- DB: PostgreSQL + Prisma
- Auth: JWT (access/refresh) + TOTP MFA + refresh失効管理
- 監査: 主要操作は `audit_logs` に記録

## 3. 変更禁止（合意なく実施しない）
- 工賃ロジックを時間ベース以外へ拡張
- マルチテナント本実装への切替
- 行政帳票自動生成のMVP取り込み
- AI機能のMVP取り込み

## 4. 変更時の必須条件
- API破壊変更時: `docs/api-contract.md` を同時更新
- セキュリティ関連変更時: `docs/nonfunctional.md` を同時更新
- 方針変更時: `docs/DECISIONS_LOG.md` に記録

## 5. 完了の最低条件
- `npm run test:e2e -w apps/api` が通ること
- 主要業務フロー（打刻→修正承認→月次工賃→明細）が壊れていないこと
