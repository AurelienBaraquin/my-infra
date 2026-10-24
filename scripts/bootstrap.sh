#!/usr/bin/env bash
# Prépare un VPS neuf (ou vérifie l'existant) : .env, dossiers data/, secrets générés.
# Idempotent : ne régénère jamais un secret déjà présent.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { cp .env.example .env; echo "• .env créé depuis .env.example — à relire"; }

mkdir -p secrets data/authelia
chmod 700 secrets

gen() {  # gen <fichier> <octets>
  local f="secrets/$1"
  [[ -s $f ]] && return
  openssl rand -hex "$2" > "$f"
  chmod 600 "$f"
  echo "• secret généré : $f"
}
gen authelia_jwt_secret 64
gen authelia_session_secret 64
gen authelia_storage_encryption_key 64
touch secrets/pixel_quest.env

if [[ ! -s secrets/authelia_users.yml ]]; then
  user=${AUTHELIA_USER:-aurelien}
  pass=$(openssl rand -base64 24)
  hash=$(docker run --rm authelia/authelia:4.39.28 \
    authelia crypto hash generate argon2 --password "$pass" | sed -n 's/^Digest: //p')
  cat > secrets/authelia_users.yml <<YAML
users:
  ${user}:
    displayname: "${AUTHELIA_DISPLAYNAME:-Aurélien}"
    password: "${hash}"
    email: "${AUTHELIA_EMAIL:-admin@localhost}"
    groups: [admins]
YAML
  printf '%s\n' "$pass" > secrets/authelia_initial_password
  chmod 600 secrets/authelia_users.yml secrets/authelia_initial_password
  echo "• utilisateur Authelia '${user}' créé — mot de passe initial dans secrets/authelia_initial_password"
fi

[[ -f ssl/cloudflare/origin-cert.pem && -f ssl/cloudflare/origin-key.pem ]] \
  || echo "⚠ ssl/cloudflare/origin-{cert,key}.pem manquants (Cloudflare → SSL/TLS → Origin Server)"
