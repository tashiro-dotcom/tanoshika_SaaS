#!/usr/bin/env bash
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$COMPOSE_DIR"

echo "=== 1. .env の存在確認 ==="
if [ ! -f .env ]; then
  echo "ERROR: .env が見つかりません。.env.example をコピーして値を埋めてください。"
  echo "  cp .env.example .env"
  exit 1
fi

echo "=== 1.5. .env の必須値確認 ==="
AUTH_USER="$(grep '^BASIC_AUTH_USER=' .env | cut -d '=' -f2-)"
AUTH_PASS="$(grep '^BASIC_AUTH_PASSWORD=' .env | cut -d '=' -f2-)"
AUTH_HASH="$(grep '^BASIC_AUTH_PASSWORD_HASH=' .env | cut -d '=' -f2-)"

if [ -z "$AUTH_USER" ] || [ -z "$AUTH_PASS" ] || [ -z "$AUTH_HASH" ]; then
  echo "ERROR: BASIC_AUTH_USER / BASIC_AUTH_PASSWORD / BASIC_AUTH_PASSWORD_HASH を .env に設定してください。"
  exit 1
fi

if [ "$AUTH_HASH" = "REPLACE_WITH_CADDY_HASH" ]; then
  echo "ERROR: BASIC_AUTH_PASSWORD_HASH がプレースホルダのままです。"
  echo "以下で hash を生成し、.env の BASIC_AUTH_PASSWORD_HASH を置き換えてください。"
  echo "  docker run --rm caddy:2 caddy hash-password --plaintext '$AUTH_PASS'"
  exit 1
fi

if printf '%s' "$AUTH_HASH" | grep -q '^\$2'; then
  echo "ERROR: BASIC_AUTH_PASSWORD_HASH に bcrypt hash をそのまま入れています。"
  echo "docker compose の変数展開を避けるため、.env では各 \"$\" を \"$$\" に置き換えてください。"
  echo "例: \$2a\$14\$... -> \$\$2a\$\$14\$\$..."
  exit 1
fi

echo "=== 2. compose 構文検証 ==="
docker compose config --quiet
echo "OK"

echo "=== 3. イメージビルド ==="
docker compose build
echo "OK"

echo "=== 4. Postgres 起動 + healthcheck 待機 ==="
docker compose up -d postgres
echo "Postgres の healthy 待ち（最大 30 秒）..."
for i in $(seq 1 30); do
  STATUS="$(docker compose ps postgres --format '{{.Health}}' 2>/dev/null || echo "unknown")"
  if [ "$STATUS" = "healthy" ]; then
    echo "Postgres healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Postgres が 30 秒以内に healthy になりませんでした"
    docker compose logs postgres
    exit 1
  fi
  sleep 1
done

echo "=== 5. 全コンテナ起動 ==="
docker compose up -d
sleep 5

echo "=== 6. コンテナ状態確認 ==="
docker compose ps
RUNNING="$(docker compose ps --format '{{.State}}' | grep -c 'running' || true)"
EXPECTED=4
if [ "$RUNNING" -lt "$EXPECTED" ]; then
  echo "WARNING: 起動中のコンテナが ${EXPECTED} 未満です（${RUNNING} 個）"
  docker compose logs
  exit 1
fi

echo "=== 7. Basic 認証テスト ==="
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost 2>/dev/null || echo '000')"
if [ "$HTTP_CODE" = "401" ]; then
  echo "OK: Basic 認証が有効（401 返却）"
else
  echo "WARNING: 期待 401、実際 ${HTTP_CODE}。Caddy の Basic 認証設定を確認してください"
fi

echo "=== 8. 認証付きアクセス ==="
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' -u "${AUTH_USER}:${AUTH_PASS}" http://localhost/admin 2>/dev/null || echo '000')"
if [ "$HTTP_CODE" = "200" ]; then
  echo "OK: /admin アクセス成功（200）"
else
  echo "WARNING: 期待 200、実際 ${HTTP_CODE}"
fi

echo ""
echo "=== 検証完了 ==="
echo "問題がなければ以下を実行:"
echo "  docker compose down"
echo "  cd ../../ && git add -A && git status --short"
