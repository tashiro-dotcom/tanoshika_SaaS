# A型事業所向け支援管理アプリ（MVP）

本リポジトリは、以下MVPを実装したモノレポです。

- `apps/api`: NestJS REST API（Prisma + PostgreSQL）
- `apps/web`: Next.js Web UI

## 対応済みMVP範囲

- 利用者管理
- 勤怠/シフト管理
- 工賃計算（時間ベース）
- スタッフ権限管理
- 支援計画/支援記録
- 利用者ポータル（閲覧）

## セットアップ

1. `docker compose up -d`
2. `npm install`
3. `cp apps/api/.env.example apps/api/.env`
4. `npm run prisma:generate -w apps/api`
5. `npm run prisma:push -w apps/api`
6. `npm run prisma:seed -w apps/api`
7. `npm run dev`

## 認証（開発初期データ）

`apps/api/prisma/seed.ts` を実行すると、以下が作成されます。

- admin: `admin@example.com` / `Admin123!`
- TOTP secret: `JBSWY3DPEHPK3PXP`

## 自治体テンプレート（明細出力）

- `apps/api/.env` の `MUNICIPALITY_TEMPLATE` で切替
- 現在の実装値: `fukuoka`
- 将来は `apps/api/src/wages/wage-slip-template.ts` に自治体テンプレートを追加して拡張

## E2Eテスト

前提: PostgreSQLが起動済みで `apps/api/.env` の `DATABASE_URL` が有効。

- `npm run test:e2e -w apps/api`

主要業務フロー（打刻→修正承認→月次工賃→明細）を検証します。

## 継続開発の基準（ぶれ防止）

- 固定方針: `docs/PROJECT_GUARDRAILS.md`
- 重要判断ログ: `docs/DECISIONS_LOG.md`
- 次の優先実装: `docs/NEXT_ACTIONS.md`
- GitHub必須チェック設定: `docs/GITHUB_BRANCH_PROTECTION.md`
