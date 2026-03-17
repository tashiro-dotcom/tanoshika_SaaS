# Staging Deploy Runbook

この手順は、単一VPS + Docker + Caddy で社内向け staging を立ち上げる前提の最小運用手順です。

## 1. VPS 初期セットアップ

前提:
- Ubuntu系LinuxのVPS
- staging用ドメインの A レコードが VPS を向いている
- 80/443 を開放できる

1. Docker Engine と Docker Compose plugin を入れる
2. リポジトリを配置する
3. env ファイルを作る
```bash
cp deploy/staging/.env.example deploy/staging/.env
```
4. `deploy/staging/.env` を更新する
- `APP_DOMAIN=staging.example.com`
- `NEXT_PUBLIC_API_BASE_URL=https://staging.example.com`
- `PORT=3001` のまま維持する（Caddy upstream を `api:3001` に固定しているため）
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` を十分長い乱数へ変更
- `BASIC_AUTH_PASSWORD` を決める
- `BASIC_AUTH_PASSWORD_HASH` を `BASIC_AUTH_PASSWORD` から生成して更新
```bash
docker run --rm caddy:2 caddy hash-password --plaintext 'replace-me'
```
上の `replace-me` は `.env` の `BASIC_AUTH_PASSWORD` と同じ値にする。
生成した hash は `.env` に貼る前に、各 `$` を `$$` へ置き換える（docker compose の変数展開回避）。
5. staging を起動する
```bash
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env up --build -d
```
6. 初回セットアップを実行する
```bash
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env exec api npm run prisma:push -w apps/api
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env exec api npm run prisma:seed -w apps/api
```
7. 動作確認する
- `https://staging.example.com/admin`
- Basic認証通過
- `admin@example.com` / `Admin123!` / MFA でログイン

## 2. アプリ更新手順

```bash
git pull
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env up --build -d
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env exec api npm run prisma:push -w apps/api
```

確認:
- `docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env ps`
- `/admin` が開く
- `利用者一覧取得` と `ログアウト` が通る

## 3. DB バックアップ / リストア

バックアップ:
```bash
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > staging-backup.sql
```

リストア:
```bash
cat staging-backup.sql | docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

注意:
- リストア前に既存データを上書きしてよいか確認する
- schema変更を含む更新時は、`prisma:push` の前後関係を別途確認する
