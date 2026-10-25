# my-infra

> Infrastructure-as-code du VPS [aurelienb.com](https://aurelienb.com) — Docker Compose,
> Traefik v3, SSO Authelia, derrière Cloudflare.

## Services

| Service | URL | Accès | Stack |
|---|---|---|---|
| Portfolio (Next.js) | [aurelienb.com](https://aurelienb.com) | public | `apps` |
| PixelQuest (Vite + Express + Gemini) | [aurelienb.com/pixel-quest](https://aurelienb.com/pixel-quest/) | public | `apps` |
| Sites démo (Caddy, statique) | `aurelienb.com/{restaurant,bijoux,agence,immobilier,medical}/` | public | `apps` |
| Chinese Notebook (SPA, Caddy) | [chinesenote.aurelienb.com](https://chinesenote.aurelienb.com) | public | `apps` |
| Dashboard — OS personnel ([repo](https://github.com/AurelienBaraquin/dashboard)) | [dash.aurelienb.com](https://dash.aurelienb.com) | SSO, ou jeton API/MCP | `dashboard` |
| Authelia (portail SSO) | [auth.aurelienb.com](https://auth.aurelienb.com) | — | `core` |
| Dashboard Traefik | [traefik.aurelienb.com](https://traefik.aurelienb.com) | SSO | `core` |
| Portainer | [portainer.aurelienb.com](https://portainer.aurelienb.com) | SSO + login | `tools` |
| Miku, Manifeste | — | archivés (`--profile archived`) | `apps` |

Hors Compose : l'agent **Hermes** tourne directement sur l'hôte (config de référence dans
`hermes/`).

## Démarrer

Prérequis : un VPS avec Docker 29+ et Compose v2.20+, accès SSH au compte GitHub (sous-modules
privés), le certificat Cloudflare Origin CA dans `ssl/cloudflare/`.

```bash
git clone --recurse-submodules git@github.com:AurelienBaraquin/my-infra.git && cd my-infra
git config core.hooksPath .githooks   # hooks : format des commits + vérification de la doc
./scripts/bootstrap.sh                # .env, dossiers, secrets, compte SSO (idempotent)
docker compose up -d --build --wait   # tout démarrer
docker compose ps                     # état et healthchecks
```

Ensuite, chaque push sur `main` redéploie (`docs/deployment.md`).

## Documentation

Index : [`docs/README.md`](docs/README.md). À lire d'abord : [`docs/brief.md`](docs/brief.md) et
[`docs/architecture.md`](docs/architecture.md). Règles de travail des agents : [`CLAUDE.md`](CLAUDE.md).

## Licence

Voir [LICENSE](LICENSE).
