# Configuration

Variables et secrets de l'infra : où ils sont définis et à quoi ils servent.

## `.env` (copie de `.env.example`, hors git)

Lu par `docker compose` à la racine, interpolé dans toutes les stacks.

| Variable | Rôle | Défaut (`.env.example`) | Obligatoire |
|---|---|---|---|
| `DOMAIN` | Domaine racine des routes Traefik, d'Authelia et des URL publiques | `aurelienb.com` | oui |
| `TZ` | Fuseau des conteneurs (logs, crons du dashboard) | `Europe/Paris` | oui |
| `DOCKER_GID` | GID du groupe `docker` de l'hôte, pour `socket-proxy` | `111` (corrigé par `scripts/bootstrap.sh` à la création) | oui |

Une variable manquante est remplacée par une chaîne vide : `docker compose config` le signale par
un avertissement.

## Secrets (`secrets/`, générés par `scripts/bootstrap.sh`)

| Fichier | Utilisé par | Généré |
|---|---|---|
| `authelia_jwt_secret`, `authelia_session_secret`, `authelia_storage_encryption_key` | Authelia (`*_FILE`) | 64 octets hex |
| `authelia_users.yml` | Authelia (comptes, hash argon2) | au premier lancement, avec `authelia_initial_password` |
| `dashboard_db_password` | PostgreSQL du dashboard | 32 octets hex |
| `dashboard_database_url` | app du dashboard (dérivée du mot de passe) | à chaque bootstrap si différente ; `chown 1000` |
| `dashboard_encryption_key` | app du dashboard (chiffrement des identifiants) | 32 octets hex ; `chown 1000` |
| `pixel_quest.env` | PixelQuest (`API_KEY`, `TURSO_DATABASE_URL`, `TURSO_DATABASE_TOKEN`) | à remplir à la main |
| `cloudflare_api_token` | opérations DNS, `scripts/cloudflare-email.sh` (droits : DNS, Email Routing, Workers Scripts) | à la main |

`scripts/bootstrap.sh` ne régénère jamais un secret existant. Variables de bootstrap facultatives :
`AUTHELIA_USER`, `AUTHELIA_DISPLAYNAME`, `AUTHELIA_EMAIL`.

## Fichiers de configuration

| Fichier | Contenu |
|---|---|
| `core/traefik/traefik.yml` | Config statique Traefik (redémarrage nécessaire) |
| `core/traefik/dynamic/` | TLS, middlewares, redirections (rechargés à chaud) |
| `core/authelia/configuration.yml` | Authelia (modèle avec `{{ env "DOMAIN" }}`) |
| `apps/demo-sites/Caddyfile` | Routes des sites démo |
