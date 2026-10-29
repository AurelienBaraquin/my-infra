#!/usr/bin/env bash
# Relevé des conteneurs (processeur, mémoire) pour l'écran Suivi du dashboard (kv `system.host`).
# Hors de l'app pour ne pas lui donner accès au socket Docker.
#   */5 * * * * /root/my-infra/scripts/host-stats.sh >/dev/null 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

containers=$(docker stats --no-stream --format '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}"}' | jq -cs .)
json=$(jq -cn --arg at "$(date -Is)" --argjson c "$containers" '{at: $at, containers: $c}')

docker compose exec -T db psql -q -U dashboard -d dashboard -v ON_ERROR_STOP=1 -v v="$json" <<'SQL' >/dev/null
insert into kv (key, value, updated_at) values ('system.host', :'v'::jsonb, now())
on conflict (key) do update set value = excluded.value, updated_at = now();
SQL
