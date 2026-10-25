# Architecture

Comment l'infrastructure est organisée et comment ses parties s'emboîtent. Le *pourquoi* de chaque
choix est dans [`adr/`](adr/) ; cette page décrit **ce qui existe maintenant**. Chaque chemin cité
doit exister (vérifié par `scripts/check-docs.mjs`).

## 1. Vue d'ensemble

```
 Navigateur ──HTTPS──▶ Cloudflare (DNS proxied, TLS public, WAF)
                            │  TLS « Full (strict) » — certificat Cloudflare Origin CA
                            ▼
                 ┌──────────────────────┐   réseau interne `socket`
 VPS :80/:443 ──▶│  Traefik v3 (edge)   │◀──────────────▶ socket-proxy ──▶ docker.sock (lecture)
                 │  • n'accepte QUE les │
                 │    IP Cloudflare     │   forward-auth
                 │  • rate-limit/headers│◀──────────────▶ Authelia (SSO + 2FA / passkeys)
                 └───┬──────────────┬───┘
       réseau `proxy`│              │réseau `dashboard-edge` (dédié)
   ┌─────────┬───────┼─────────┐    ▼
   ▼         ▼       ▼         ▼   dashboard app ──(réseau `dashboard-internal`)──▶ PostgreSQL
portfolio pixelquest demo-sites chinese-notebook, portainer (SSO)
```

## 2. Arborescence

```
compose.yml               point d'entrée : `include` des stacks ci-dessous (projet `my-infra`)
.env.example              DOMAIN, TZ, DOCKER_GID → copier en .env
core/                     bordure et transverse : traefik, socket-proxy, authelia
  traefik/traefik.yml     config statique (entrypoints, providers, IP Cloudflare de confiance)
  traefik/dynamic/        TLS, middlewares partagés, redirections (rechargés à chaud)
  authelia/               configuration Authelia
apps/                     sites publics (+ demo-sites/Caddyfile)
tools/                    outils d'admin (Portainer)
dashboard/                OS personnel : compose.yml + sous-module app/ (AurelienBaraquin/dashboard)
scripts/                  bootstrap, déploiement, sauvegarde, IP Cloudflare, réception des mails, vérification de la doc
cloudflare/email-worker/  Email Worker « dashboard-inbox » : inbox@aurelienb.com → dashboard
hermes/                   config de référence (nettoyée) de l'agent Hermes, qui tourne sur l'hôte
portfolio/ pixel_quest/ chinese_notebook/ miku/ manifeste/   sous-modules des applications
docs/ .assistant/         documentation, journal de décisions, leçons
.github/ .githooks/ .claude/   CI/CD et Dependabot, hooks git, skills et hook Claude Code
```

Hors git (`.gitignore`) : `secrets/` (secrets générés), `data/` (données persistantes et
sauvegardes), `ssl/` (certificat d'origine), `portfolio-sites/` (builds des sites démo).

Hors VPS, chez Cloudflare (décrit et déployé depuis ce dépôt par `scripts/cloudflare-email.sh`) :
Email Routing de la zone, règle `inbox@aurelienb.com` → Worker `dashboard-inbox` → `POST
https://dash.aurelienb.com/api/ingest/email` (jeton du dashboard limité à `ingest:email`).

## 3. Conventions en place

- **Une stack = un dossier** avec son `compose.yml`, assemblé par `include` dans `compose.yml`.
  Les chemins relatifs d'un fichier inclus partent de son dossier (`../secrets/…`).
- **Routage par labels** : un service est exposé seulement avec `traefik.enable: "true"` et
  `traefik.http.routers.<nom>.rule`. Le port interne se déclare avec
  `traefik.http.services.<nom>.loadbalancer.server.port`.
- **Privé = `sso@file`** : `traefik.http.routers.<nom>.middlewares: sso@file` impose la session
  Authelia (2FA). Ce middleware supprime d'abord les en-têtes `Remote-*` du client.
- **Middlewares globaux** sur l'entrypoint `websecure` : `cloudflare-only`, `rate-limit`,
  `security-headers` (`core/traefik/dynamic/middlewares.yml`).
- **Réseaux** : `proxy` est le seul réseau partagé ; tout le reste (bases, workers) reste sur un
  réseau privé de sa stack. Un service qui fait confiance aux en-têtes d'identité a son propre
  réseau avec Traefik (`dashboard-edge`). Ne jamais nommer `default` un réseau d'une stack incluse.
- **Durcissement** : `restart: unless-stopped`, `no-new-privileges`, `mem_limit`, et quand l'image
  le permet `read_only`, `cap_drop: [ALL]`, `tmpfs`. Les images Caddy ont besoin de
  `cap_add: [NET_BIND_SERVICE]`.
- **Versions épinglées** : images à version exacte, sous-modules à commit exact.
- **Secrets** : fichiers dans `secrets/` montés en secrets Compose ; jamais dans un `compose.yml`.

Ajouter un service :

```yaml
# apps/compose.yml (public) ou tools/compose.yml (privé)
  mon-service:
    image: ghcr.io/moi/mon-service:1.2.3
    restart: unless-stopped
    security_opt: [no-new-privileges:true]
    mem_limit: 128m
    networks: [proxy]
    labels:
      traefik.enable: "true"
      traefik.http.routers.mon-service.rule: Host(`mon-service.${DOMAIN}`)
      traefik.http.routers.mon-service.middlewares: sso@file   # ← pour le rendre privé
      traefik.http.services.mon-service.loadbalancer.server.port: "8080"
```

Puis un enregistrement DNS proxied dans Cloudflare (`docs/operations.md`) et la documentation.

## 4. Décisions

Voir [`adr/`](adr/) et [`../.assistant/decisions-log.md`](../.assistant/decisions-log.md).
