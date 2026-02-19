# State Workflow

## 目的
セッション切断やコンテキスト圧縮後でも、作業状態を素早く復元する。

## 使い方
1. 重要な区切りで `npm run state:snapshot`
2. 再開時に `npm run state:restore`
3. 必要に応じて `STATE/_active_task.md` を更新

## ポリシー
- `STATE/MEMORY.md` は手動更新のみ
- 自動提案は `STATE/memory_suggestions.md` に出力
