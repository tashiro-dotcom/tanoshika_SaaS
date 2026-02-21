# DECISIONS_LOG

重要な設計判断を時系列で残す。

## 2026-02-13
- MVPを単一事業所モデルで開始（`organization_id` は将来拡張用に保持）
- 工賃計算は時間ベースのみ
- 認証はメール/パスワード + TOTP MFA
- refresh tokenはDB保存し、refresh時に旧トークン失効
- 主要操作の監査ログをDB保存
- E2Eで主要業務フローを自動検証
- API入力は `class-validator + DTO + ValidationPipe` でバリデーションを必須化
- 認可を強化し、更新/承認/明細APIで `organization_id` 境界を403で拒否
- E2Eに「他組織アクセス拒否」「staffの権限拒否」を追加
- 工賃明細のCSV/PDFダウンロードAPI（`/wages/:id/slip.csv`, `/wages/:id/slip.pdf`）を追加
- 作成系APIでも `serviceUserId` の組織所属を必須検証し、越境指定を403で拒否
- `:id` パラメータを共通DTOで UUID バリデーション必須化（DB到達前に400）
- 一覧系APIに `page/limit` バリデーション + `skip/take` を導入（大量件数の安全化）
- 勤怠一覧に `from/to` 日付範囲バリデーションを導入
- 工賃明細CSVを日本語ヘッダー+BOM付きに改善（Excel互換性を優先）
- 工賃明細PDFの出力レイアウトを明細形式へ改善（内訳・発行日時を追加）
- E2Eに一覧APIの組織分離検証（他組織データ非表示）と勤怠期間クエリ検証を追加
- 工賃明細(JSON/CSV/PDF)に「利用者名」「事業所名」を追加表示
- 工賃明細(JSON/CSV/PDF)に「締日」「備考」「承認者ID」「印影欄（PDF）」を追加
- 自治体出力はテンプレート層で管理し、既定値を `fukuoka` に設定（将来の他自治体拡張前提）
- CIでPostgreSQLサービス付きE2E（Prisma generate/push/seed/test:e2e）を自動実行
- OpenAPI自動生成を導入（`/api-docs`, `/api-docs-json`）
- 工賃明細テンプレートをレジストリ化し、福岡を既定のまま他自治体追加余地を実装（`GET /wages/templates` で利用可能テンプレート確認）
- Global Exception Filter を導入し、HTTP/Prisma例外を統一レスポンス形式で返却（`statusCode/message/error/code/timestamp/path`）
- OpenAPI運用を強化し、主要Controllerへ `@ApiTags`/`@ApiBearerAuth`/`@ApiOperation` を付与（Swaggerの可読性向上）
- OpenAPIに共通エラーレスポンススキーマを導入し、主要Controllerに一括適用（エラー契約の見える化）
- OpenAPI主要正常系レスポンスをDTO化し `@ApiOkResponse` を追加（Auth/Wages/User Portal）
- OpenAPI主要正常系にExampleレスポンスを追加（Auth/Wages/User Portal、Swaggerデモ容易化）
- OpenAPI正常系レスポンス明示を残り主要エンドポイントへ展開（Staff/Service/Shift/Support/Attendance）
- OpenAPIリクエスト例を主要DTOへ追加（Body/Query の入力サンプルをSwaggerで即参照可能に）
- CSV/PDF出力APIにOpenAPIの `produces`/ヘッダー仕様説明を追加（運用時の誤解防止）
- OpenAPI DTOへ現場向けdescriptionを追加し、入力項目の意味をSwagger上で明確化
- CSV/PDF出力APIをOpenAPI上で `format: binary` として明示し、SDK/連携時の機械判定を安定化
- OpenAPI各Operationに `x-roles` を付与し、認可ロール要件を仕様上で参照可能に統一
- 管理画面の土台として `/admin` を追加し、MVP主要API（利用者一覧/勤怠一覧/工賃テンプレート）への接続確認UIを実装
- `/admin` にログイン導線（`/auth/login` -> `/auth/mfa/verify`）とトークン更新/ログアウト（`/auth/refresh` `/auth/logout`）を実装し、トークン手入力を不要化
- `/admin` に利用者の新規登録フォーム（`POST /service-users`）とステータス更新フォーム（`PATCH /service-users/:id/status`）を実装
- `/admin` の勤怠管理に修正申請フォーム（`POST /attendance-corrections`）と承認フォーム（`POST /attendance-corrections/:id/approve`）を追加
- `/admin` の工賃管理に月次計算（`POST /wages/calculate-monthly`）・承認（`POST /wages/:id/approve`）・明細取得（`GET /wages/:id/slip(.json/.csv/.pdf)`）UIを追加
- `/admin` のAPIエラー表示をコードベースで標準化し、連続操作時に状態が崩れやすい勤怠再取得処理を共通化

## 記録ルール
- 1行目に日付（YYYY-MM-DD）
- 「何を」「なぜ」「影響範囲」を短く残す
- 運用に影響する変更は必ずここに追記
