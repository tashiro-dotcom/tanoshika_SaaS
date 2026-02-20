# NEXT_ACTIONS

次の開発で優先する実作業。

## 優先度 High
1. API入力バリデーション導入の適用漏れ点検（新規画面/API追加時）
2. 認可の厳格化の適用漏れ点検（新規参照API追加時）
3. 工賃明細テンプレートの他自治体対応（テンプレート差分の厳密化: 項目名/順序/注記）

## 優先度 Medium
1. CIで `guardrails-check` と `e2e` を必須ステータスに設定
2. OpenAPI DTOのdescription補完（現場向け文言最適化）
3. OpenAPIでCSV/PDFバイナリレスポンス定義をさらに厳密化

## 優先度 Low
1. Next.js 14.2.30 の脆弱性対応アップデート
2. 依存ライブラリのdeprecated対応（otplib v13系への移行）

## 実施時の約束
- 新規開発は `PROJECT_GUARDRAILS.md` に反しない
- 方針変更は `DECISIONS_LOG.md` を同時更新
