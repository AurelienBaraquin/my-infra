# my-infra

> Infrastructure-as-code du VPS [aurelienb.com](https://aurelienb.com) — Docker Compose,
> Traefik v3, SSO Authelia, derrière Cloudflare.

## Architecture

```
 Navigateur ──HTTPS──▶ Cloudflare (DNS proxied, TLS public, WAF)
                            │  TLS "Full (strict)" — certificat Cloudflare Origin CA
                            ▼
                 ┌──────────────────────┐   réseau interne `socket`
 VPS :80/:443 ──▶│  Traefik v3 (edge)   │◀──────────────▶ socket-proxy ──▶ docker.sock (RO)
                 │  • n'accepte QUE les │
                 │    IP Cloudflare     │   forward-auth
                 │  • rate-limit/headers│◀──────────────▶ Authelia (SSO + 2FA / passkeys)
                 └──────────┬───────────┘
                            │ réseau `proxy` (seul réseau partagé)
      ┌──────────┬──────────┼────────────┬──────────────────┐
      ▼          ▼          ▼            ▼                  ▼
  portfolio  pixelquest  demo-sites  chinese-notebook   portainer (SSO)
```

**Principes**

- **Routage déclaratif** : chaque service se déclare avec ses labels Docker
  (`traefik.http.routers.<nom>.rule`). Ajouter un service = l'ajouter dans une stack, rien à
  toucher côté proxy.
- **Privé par défaut pour les outils** : `traefik.http.routers.<nom>.middlewares: sso@file`
  place n'importe quel service derrière Authelia (2FA obligatoire).
- **Défense en profondeur** : accès direct à l'IP du VPS refusé (allowlist Cloudflare, SNI
  strict), socket Docker jamais exposé à Traefik (socket-proxy filtrant en lecture seule),
  conteneurs `no-new-privileges`, `read_only`/`cap_drop` quand possible, limites mémoire.
- **Rien de sensible dans git** : secrets générés dans `secrets/` (Docker secrets),
  données dans `data/`, certificats dans `ssl/`.
- **Versions épinglées** : images à version exacte, sous-modules à commit exact.

## Services

| Service | URL | Accès | Stack |
|---|---|---|---|
| Portfolio (Next.js) | [aurelienb.com](https://aurelienb.com) | public | `apps` |
| PixelQuest (Vite + Express + Gemini) | [aurelienb.com/pixel-quest](https://aurelienb.com/pixel-quest/) | public | `apps` |
| Sites démo (Caddy, statique) | `aurelienb.com/{restaurant,bijoux,agence,immobilier,medical}/` | public | `apps` |
| Chinese Notebook (SPA, Caddy) | [chinesenote.aurelienb.com](https://chinesenote.aurelienb.com) | public | `apps` |
| Dashboard personnel (provisoire) | [dash.aurelienb.com](https://dash.aurelienb.com) | SSO | `dashboard` |
| Authelia (portail SSO) | [auth.aurelienb.com](https://auth.aurelienb.com) | — | `core` |
| Dashboard Traefik | [traefik.aurelienb.com](https://traefik.aurelienb.com) | SSO | `core` |
| Portainer | [portainer.aurelienb.com](https://portainer.aurelienb.com) | SSO + login | `tools` |
| Miku, Manifeste | — | archivés (`--profile archived`) | `apps` |

Hors compose : l'agent **Hermes** tourne directement sur l'hôte (config de référence dans
`hermes/`).

## Arborescence

```
my-infra/
├── compose.yml              # point d'entrée : `include` des stacks ci-dessous
├── .env.example             # DOMAIN, TZ, DOCKER_GID → copier en .env
├── core/                    # edge + transverse
│   ├── compose.yml          #   traefik, socket-proxy, authelia
│   ├── traefik/traefik.yml  #   config statique (entrypoints, providers, IP Cloudflare)
│   ├── traefik/dynamic/     #   TLS, middlewares partagés, redirections (rechargés à chaud)
│   └── authelia/configuration.yml
├── apps/                    # sites publics
│   ├── compose.yml
│   └── demo-sites/Caddyfile
├── tools/compose.yml        # outils perso/admin (portainer…)
├── dashboard/               # dashboard perso (dash.*, SSO) — page provisoire pour l'instant
├── scripts/
│   ├── bootstrap.sh         # .env, dossiers, secrets, compte Authelia (idempotent)
│   ├── deploy.sh            # aligne sur origin/main + `compose up --build --wait`
│   └── cloudflare-ips.sh    # resynchronise les plages IP Cloudflare
├── .github/                 # CI/CD (deploy.yml) + dependabot.yml
├── portfolio/ pixel_quest/ chinese_notebook/ miku/ manifeste/   # sous-modules
├── portfolio-sites/         # (hors git) builds des sites démo
├── secrets/ data/ ssl/      # (hors git)
└── hermes/                  # config Hermes nettoyée (référence)
```

## Utilisation

```bash
./scripts/bootstrap.sh              # 1re fois (ou après un clone) : secrets + compte SSO
docker compose up -d --build        # tout démarrer
docker compose ps                   # état + healthchecks
docker compose logs -f traefik      # logs (accès en JSON, erreurs/lentes seulement)
./scripts/deploy.sh                 # déploiement complet depuis origin/main
```

Le push sur `main` déclenche `.github/workflows/deploy.yml` : validation de la config
Compose, puis `scripts/deploy.sh` sur le VPS via SSH (les PR ne font que la validation).
Dependabot ouvre chaque semaine une PR groupée quand une image épinglée a une nouvelle version.

### Ajouter un service

```yaml
# dans apps/compose.yml (public) ou tools/compose.yml (privé)
  mon-service:
    image: ghcr.io/moi/mon-service:1.2.3
    restart: unless-stopped
    networks: [proxy]
    labels:
      traefik.enable: "true"
      traefik.http.routers.mon-service.rule: Host(`mon-service.${DOMAIN}`)
      traefik.http.routers.mon-service.middlewares: sso@file   # ← pour le rendre privé
      traefik.http.services.mon-service.loadbalancer.server.port: "8080"
```

Une base de données ou un worker d'un service reste sur le réseau `default` de sa stack
(pas sur `proxy`).

### SSO (Authelia)

- Compte unique dans `secrets/authelia_users.yml` (mot de passe initial :
  `secrets/authelia_initial_password`, à changer).
- Changer le mot de passe :
  `docker run --rm authelia/authelia:4.39.28 authelia crypto hash generate argon2` puis
  remplacer le hash (rechargé automatiquement).
- Enrôlement 2FA : pas de SMTP, les codes de vérification sont écrits dans
  `data/authelia/notification.txt`.

## Cloudflare

- DNS : enregistrements **proxied** (nuage orange) pointant vers le VPS.
- SSL/TLS : mode **Full (strict)** ; certificat d'origine dans `ssl/cloudflare/`
  (`*.aurelienb.com`, expire en 2041).
- Les plages IP Cloudflare sont codées dans Traefik : les resynchroniser de temps en temps
  avec `./scripts/cloudflare-ips.sh && docker compose restart traefik`.

## Licence

Voir [LICENSE](LICENSE).
