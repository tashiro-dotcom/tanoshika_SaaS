# GitHub Branch Protection 設定手順

この手順で、PRマージ前に以下チェックを必須化します。

- `ci / e2e`
- `guardrails-check / require-doc-updates`

## 対象ブランチ
- 通常は `main`

## 手順（GitHub UI）
1. リポジトリを開く
2. `Settings` -> `Branches`
3. `Branch protection rules` で `Add rule`
4. `Branch name pattern` に `main` を入力
5. `Require a pull request before merging` を ON
6. `Require status checks to pass before merging` を ON
7. `Search for status checks` に以下を追加
   - `ci / e2e`
   - `guardrails-check / require-doc-updates`
8. 必要なら `Require branches to be up to date before merging` を ON
9. `Create` または `Save changes`

## 動作確認
1. 軽微なPRを作成
2. Checks タブで `ci` と `guardrails-check` が実行されることを確認
3. どちらか失敗時にマージできないことを確認

## 補足
- ワークフロー名やジョブ名を変更した場合、必須チェック名も合わせて更新してください。
- 将来、必須チェックを増やす場合はこのファイルに追記してください。
