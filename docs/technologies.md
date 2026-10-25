# Technologies

Rôle, configuration et pièges de chaque brique de l'infra. Raisons détaillées : ADR liés.

## Docker 29 + Compose v2 (`include`)

Un projet `my-infra` assemblé par `include` (`compose.yml`). Piège : un réseau nommé `default`
dans un fichier inclus remplace le réseau par défaut du projet. Docker 29 exige une API récente
côté clients (Traefik ≥ 3.6). ADR : [0004](adr/0004-compose-stacks-and-networks.md).

## Cloudflare

DNS proxied, TLS public, WAF. Certificat Origin CA pour le tronçon vers le VPS (« Full (strict) »).
Plages IP synchronisées par `scripts/cloudflare-ips.sh`. ADR :
[0003](adr/0003-cloudflare-front-origin-lockdown.md).

## Traefik v3.7

Proxy d'entrée (`core/compose.yml`, `core/traefik/`). Fournisseurs : Docker (labels, via
`socket-proxy`, `exposedByDefault: false`) et fichiers (`dynamic/`, rechargés à chaud). Piège :
l'ordre des middlewares compte (globaux de l'entrypoint d'abord, puis ceux du routeur). ADR :
[0001](adr/0001-traefik-replaces-nginx.md).

## Authelia 4.39

SSO, 2FA (TOTP, passkeys WebAuthn), forward-auth pour Traefik ; utilisateurs en fichier, stockage
SQLite (`data/authelia/`), notifications dans un fichier (pas de SMTP). Configuration rendue par
le filtre `template` (`X_AUTHELIA_CONFIG_FILTERS`). ADR : [0002](adr/0002-authelia-sso.md).

## wollomatic/socket-proxy

Filtre l'API Docker pour Traefik : uniquement `GET` sur `version`, `containers`, `events` et
`_ping`, uniquement depuis `traefik`. Utilisateur `65534:<DOCKER_GID>`.

## Caddy 2.11

Sert les sites démo (`apps/demo-sites/Caddyfile`) ; l'image de Chinese Notebook l'embarque aussi.
Piège : avec `cap_drop: [ALL]`, il faut `cap_add: [NET_BIND_SERVICE]` (capacité de fichier du
binaire).

## Portainer CE 2.45

Administration Docker (`tools/compose.yml`), volume `my-infra_portainer_data`, derrière le SSO.

## PostgreSQL 17

Base du dashboard (`dashboard/compose.yml`), réseau interne sans accès sortant,
`shared_buffers=64MB`, données dans `data/dashboard/postgres/`.

## GitHub Actions + Dependabot

Déploiement par SSH, validation Compose, vérification de la doc, mises à jour d'images
(`docs/ci.md`). ADR : [0005](adr/0005-pinned-submodules-ssh-deploy.md).
