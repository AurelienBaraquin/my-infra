#!/usr/bin/env bash
# Installe / met à jour la réception des mails du dashboard sur Cloudflare (idempotent) :
#   1. Email Routing activé sur la zone (enregistrements MX/SPF créés par Cloudflare) ;
#   2. jeton dashboard « cloudflare-email-worker » (portée ingest:email) — renouvelé à chaque passage ;
#   3. Email Worker « dashboard-inbox » (cloudflare/email-worker/worker.js) ;
#   4. règle inbox@<DOMAIN> → Worker.
# Prérequis : secrets/cloudflare_api_token (Zone DNS + Email Routing + Workers Scripts), stack démarrée.
# Usage : ./scripts/cloudflare-email.sh   [FALLBACK=adresse.verifiee@gmail.com]
set -euo pipefail
cd "$(dirname "$0")/.."
source .env

CF=https://api.cloudflare.com/client/v4
T=$(tr -d '[:space:]' < secrets/cloudflare_api_token)
ADDRESS="inbox@${DOMAIN}"
WORKER=dashboard-inbox
cf() { curl -fsS -H "Authorization: Bearer $T" "$@"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

ZONE=$(cf "$CF/zones?name=$DOMAIN" | json 'd["result"][0]["id"]')
ACCOUNT=$(cf "$CF/zones/$ZONE" | json 'd["result"]["account"]["id"]')

# 1. Email Routing
if [[ $(cf "$CF/zones/$ZONE/email/routing" | json 'd["result"]["enabled"]') != "True" ]]; then
  cf -X POST "$CF/zones/$ZONE/email/routing/enable" -H 'content-type: application/json' -d '{}' >/dev/null
  echo "• Email Routing activé"
fi

# 2. Jeton de portée ingest:email (l'ancien est révoqué)
TOKEN="dsh_$(openssl rand -hex 24)"
HASH=$(printf %s "$TOKEN" | sha256sum | cut -d' ' -f1)
docker compose exec -T db psql -U dashboard -d dashboard -qc \
  "update api_tokens set revoked_at = now() where name = 'cloudflare-email-worker' and revoked_at is null;
   insert into api_tokens(name, prefix, hash, scopes) values ('cloudflare-email-worker', '${TOKEN:0:10}', '$HASH', '{ingest:email}')"
echo "• jeton ingest:email renouvelé"

# 3. Worker
META=$(python3 - "$DOMAIN" "$TOKEN" "${FALLBACK:-}" <<'PY'
import json, sys
domain, token, fallback = sys.argv[1:4]
b = [{"type": "plain_text", "name": "DASH_URL", "text": f"https://dash.{domain}/api/ingest/email"},
     {"type": "secret_text", "name": "DASH_TOKEN", "text": token}]
if fallback: b.append({"type": "plain_text", "name": "FALLBACK", "text": fallback})
print(json.dumps({"main_module": "worker.js", "compatibility_date": "2026-09-01", "bindings": b}))
PY
)
cf -X PUT "$CF/accounts/$ACCOUNT/workers/scripts/$WORKER" \
  -F "metadata=$META;type=application/json" \
  -F "worker.js=@cloudflare/email-worker/worker.js;type=application/javascript+module" >/dev/null
echo "• Worker $WORKER déployé"

# 4. Règle de routage
RULE=$(cf "$CF/zones/$ZONE/email/routing/rules?per_page=50" | python3 -c "
import sys, json
for r in json.load(sys.stdin)['result']:
    if any(m.get('value') == '$ADDRESS' for m in r.get('matchers', [])): print(r['id'])")
BODY=$(printf '{"name":"%s → dashboard","enabled":true,"matchers":[{"type":"literal","field":"to","value":"%s"}],"actions":[{"type":"worker","value":["%s"]}]}' "$ADDRESS" "$ADDRESS" "$WORKER")
if [[ -n $RULE ]]; then
  cf -X PUT "$CF/zones/$ZONE/email/routing/rules/$RULE" -H 'content-type: application/json' -d "$BODY" >/dev/null
else
  cf -X POST "$CF/zones/$ZONE/email/routing/rules" -H 'content-type: application/json' -d "$BODY" >/dev/null
fi
echo "• règle $ADDRESS → $WORKER en place"
cf "$CF/zones/$ZONE/email/routing" | json '"• statut Email Routing : " + str(d["result"]["status"])'
