# INTERNAL_TRIAL_CHECKLIST

あなたのPCを暫定テスト機として、社内メンバーに `/admin` を触ってもらうための手順。

## 目的

- 少人数で実運用に近い操作を試す
- 打刻、修正申請、月次賃金計算の詰まりを早期に拾う
- UI上の迷い、運用ルール不足、エラー導線不足を把握する

## 前提

1. あなたのPCと利用者のPCが同じ社内LANに接続されている
2. PostgreSQL があなたのPCで起動している
3. `apps/api/.env` が設定済み
4. 管理者アカウントとMFAシークレットを把握している

## 起動手順

1. 依存とDB状態を確認する

```bash
npm install
npm run prisma:push -w apps/api
```

2. API と Web をLAN公開モードで起動する

```bash
npm run dev:lan
```

3. あなたのPCのIPアドレスを確認する

```bash
ipconfig getifaddr en0
```

Wi-Fi でない場合は `en1` などを確認する。

4. 参加者へ共有するURL

- 管理画面: `http://<あなたのIP>:3000/admin`
- API疎通確認: `http://<あなたのIP>:3001/api-docs`

## 参加者へ渡すもの

1. 管理画面URL
2. テスト用メールアドレス
3. MFA運用手順: [docs/MFA_RUNBOOK.md](/Users/tashiroryouichi/Documents/New%20project/docs/MFA_RUNBOOK.md)
4. フィードバック記録: [docs/INTERNAL_TRIAL_FEEDBACK_TEMPLATE.md](/Users/tashiroryouichi/Documents/New%20project/docs/INTERNAL_TRIAL_FEEDBACK_TEMPLATE.md)

## トライアル開始前チェック

1. 自分のPCから `http://localhost:3000/admin` が開ける
2. 別端末から `http://<あなたのIP>:3000/admin` が開ける
3. ログインからMFA完了まで到達できる
4. 利用者一覧が取得できる
5. 直近1件の出勤/退勤が打てる
6. 修正申請が作成できる

## 実施範囲（初回）

初回トライアルでは以下だけに絞る。

1. ログイン
2. 利用者登録
3. 行内ステータス更新
4. 行内出勤/退勤
5. 修正申請
6. 月次賃金計算と明細確認

## 当日の運営ルール

1. 参加者は1人ずつ操作する
2. 詰まった箇所はその場で口頭解決せず、一度メモしてもらう
3. 重大障害以外は最後まで操作してもらう
4. 「使い方が分からなかった」も不具合候補として記録する

## 終了後に回収する観点

1. 最初に迷った場所
2. 打刻で無駄だと感じた操作
3. ステータス更新や修正申請の意味が分かりにくい箇所
4. 実運用では不足しそうな情報
5. 毎日使うなら嫌だと感じる点
