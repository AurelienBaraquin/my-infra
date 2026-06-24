# my-infra

> Infrastructure-as-code repository for [aurelienb.com](https://aurelienb.com) — a self-hosted VPS running Docker, Nginx, and several web applications.

## Overview

This monorepo manages all services deployed on the VPS via Docker Compose. It uses **git submodules** for individual applications and a single **Nginx reverse proxy** to route traffic across subdomains.

**VPS details:** Ubuntu 24.04, hosted in France, connected to a private [Tailscale](https://tailscale.com/) network.

### Live services

| Service | URL | Description |
|---|---|---|
| **Portfolio** | [aurelienb.com](https://aurelienb.com) | Personal portfolio — Next.js 16 + React 19 + Tailwind CSS |
| **PixelQuest** | [aurelienb.com/pixel-quest](https://aurelienb.com/pixel-quest) | AI-powered interactive narrative console — Vite + React + Gemini API |
| **Miku** | [miku.aurelienb.com](https://miku.aurelienb.com) | 3D Miku/Teto showcase — Next.js + Three.js + GSAP |
| **Manifeste** | [manifeste.aurelienb.com](https://manifeste.aurelienb.com) | Markdown knowledge navigator — Astro SSR + Fuse.js search |
| **Vikunja** | [vikunja.aurelienb.com](https://vikunja.aurelienb.com) | Task/project manager — Vikunja (self-hosted) |
| **ntfy** | `http://100.75.137.33:8080` (Tailscale only) | Self-hosted push notifications via HTTP |
| **Portainer** | [portainer.aurelienb.com](https://portainer.aurelienb.com) | Docker management UI |
| **Hermes** | *Discord bot* | AI assistant (not in this compose stack — runs separately) |

---

## Repository structure

```
my-infra/
├── compose.yml              # Main Docker Compose file (all services)
├── nginx.conf               # Nginx reverse proxy config
├── deploy.sh                # Manual deployment script
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD — auto-deploy on push to main
│
├── portfolio/               # [submodule] Personal portfolio (Next.js)
├── pixel_quest/             # [submodule] AI narrative console (Vite + Express)
├── miku/                    # [submodule] 3D showcase (Next.js + Three.js)
├── manifeste/               # [submodule] Markdown navigator (Astro)
│
├── docker/
│   ├── ntfy/                # ntfy push notification server
│   │   ├── docker-compose.yml
│   │   ├── server.yml
│   │   └── cache/           # Persistent cache volume
│   └── vikunja/             # Vikunja task manager data
│       ├── .gitignore
│       ├── db/              # SQLite database
│       └── files/           # Uploaded files
│
├── hermes/                  # Hermes AI agent config (sanitized)
│   ├── config.yaml
│   └── README.md
│
└── secrets/                 # Environment variables (gitignored)
    ├── pixel_quest.env      # GEMINI_API_KEY, TURSO_DATABASE_URL/TOKEN
    └── portfolio.env        # (empty, reserved)
```
---

## Architecture

```
                         ┌──────────────────────────────────┐
                         │           Internet               │
                         └──────────┬───────────────────────┘
                                    │
                         ┌──────────▼───────────────────────┐
                         │    Nginx (web-gateway) :80       │
                         │    Reverse proxy                 │
                         └──┬─────┬──────┬─────┬──────┬────┘
                            │     │      │     │      │
               ┌────────────┘     │      │     │      └────────────┐
               ▼                  ▼      ▼     ▼                   ▼
          ┌─────────┐   ┌──────────┐ ┌──────┐ ┌────────┐  ┌───────────┐
          │Portfolio │   │PixelQuest│ │ Miku │ │Manifeste│  │  Vikunja  │
          │ :3000   │   │  :3000   │ │:3000 │ │ :3000  │  │   :3456   │
          └─────────┘   └──────────┘ └──────┘ └────────┘  └───────────┘

  ┌───────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Portainer    │     │  ntfy        │     │  Hermes      │
  │  :9000        │     │  :8080       │     │  (separate)  │
  │  (subdomain)  │     │  (Tailscale) │     │              │
  └───────────────┘     └──────────────┘     └──────────────┘
```

### Nginx routing

Nginx listens on port 80 and routes by `server_name`:

| `server_name` | Backend | Notes |
|---|---|---|
| `aurelienb.com`, `www.aurelienb.com` | Portfolio `:3000` | Main site |
| `aurelienb.com/pixel-quest` | PixelQuest `:3000` | WebSocket upgrade support |
| `portainer.aurelienb.com` | Portainer `:9000` | WebSocket upgrade support |
| `manifeste.aurelienb.com` | Manifeste `:3000` | — |
| `miku.aurelienb.com` | Miku `:3000` | — |
| `vikunja.aurelienb.com` | Vikunja `:3456` | WebSocket upgrade support |
| `onlyfans.aurelienb.com` | — | Easter egg → 301 redirect to main site |

> **Note:** There is no HTTPS termination at the Nginx level. SSL/TLS may be handled upstream (e.g., Cloudflare proxy) or not at all for local/Tailscale access.

---

## Services in detail

### Portfolio (`aurelienb.com`)

Personal portfolio website with project showcases, animations, and a contact modal.

- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Radix UI · Lenis smooth scroll
- **Build:** Multi-stage Docker build (Node 20 Alpine) → standalone Next.js server on `:3000`
- **Config:** `output: 'standalone'`, unoptimized images (no image optimization CDN)
- **Projects:** 5 portfolio pieces (PixelQuest, NES emulator in Rust, NESCARGOT NES engine, CrabInk E-Ink console, and the portfolio itself)

**Key files:**
- `portfolio/components/home/Hero.tsx` — Landing hero section
- `portfolio/components/home/About.tsx` — About section
- `portfolio/components/about/TechStack.tsx` — Tech stack display
- `portfolio/components/layout/ContactModal.tsx` — Contact form/modal
- `portfolio/data/projects.ts` — Project definitions (add new projects here)

---

### PixelQuest (`aurelienb.com/pixel-quest`)

AI-powered interactive narrative console integrating Google Gemini for dynamic storytelling with persistent state via Turso/SQLite.

- **Stack:** Vite · React 19 · TypeScript · Tailwind CSS (frontend) + Express 5 · Google Gemini API · Turso DB · SQLite (backend)
- **Build:** Multi-stage Docker build — Vite frontend compiled separately, served as static files by Express
- **Runtime:** `tsx server.ts` on `:3000`
- **Security:** Helmet, CORS, express-rate-limit, environment-based secrets
- **Env vars** (in `secrets/pixel_quest.env`): `API_KEY`, `TURSO_DATABASE_URL`, `TURSO_DATABASE_TOKEN`

**Key files:**
- `pixel_quest/server/server.ts` — Express backend entry point
- `pixel_quest/server/package.json` — Backend dependencies

---

### Miku (`miku.aurelienb.com`)

3D interactive showcase featuring Hatsune Miku and Kasane Teto models with custom cursor, parallax effects, and theme toggling.

- **Stack:** Next.js 16 · React 19 · TypeScript · Three.js (R3F) · Drei · GSAP · Framer Motion · Lenis
- **Build:** Multi-stage Docker build (Node 22 Alpine) → standalone server on `:3000`
- **3D assets:** `.glb` models (`miku.glb`, `teto.glb`) + GIF animations in `/public/gifs/`
- **Features:** Custom cursor, parallax background, ink bleed effects, smooth scrolling, theme toggle

**Key files:**
- `miku/components/MikuScene/MikuScene.tsx` — Three.js 3D scene
- `miku/components/Cursor/CustomCursor.tsx` — Custom cursor component
- `miku/components/ThemeToggle/ThemeToggle.tsx` — Dark/light mode
- `miku/contexts/ThemeContext.tsx` — Theme state management

---

### Manifeste (`manifeste.aurelienb.com`)

A file-system-style navigator for browsing and searching a directory of Markdown documents with a favorites system.

- **Stack:** Astro 6 · Node.js SSR · Fuse.js (fuzzy search) · GSAP · Marked (Markdown)
- **Build:** Multi-stage Docker build (Node 22 Alpine) → Astro SSR server (`node ./dist/server/entry.mjs`)
- **Runtime:** Reads `Manifeste/` Markdown directory at runtime (copied into the image)
- **Features:** Directory grid, search modal, favorites drawer, slug-based routing

**Key files:**
- `manifeste/src/pages/index.astro` — Main page
- `manifeste/src/pages/[...slug].astro` — Dynamic slug routing for Markdown files
- `manifeste/src/pages/api/tree.ts` — API endpoint for directory listing
- `manifeste/src/components/SearchModal.astro` — Search UI (Fuse.js)
- `manifeste/src/components/DirectoryGrid.astro` — File browser grid
- `manifeste/src/components/FavoritesDrawer.astro` — Bookmarks/favorites

---

### Vikunja (`vikunja.aurelienb.com`)

Self-hosted task and project management tool (alternative to Trello/Asana).

- **Stack:** Official `vikunja/vikunja` Docker image
- **Database:** SQLite at `docker/vikunja/db/vikunja.db`
- **Files:** Uploaded attachments at `docker/vikunja/files/`
- **Config:** Public URL set to `https://vikunja.aurelienb.com/`
- **Port:** `:3456` (both container and host)

---

### ntfy (Tailscale-only)

Self-hosted push notification server — accessible only via Tailscale network.

- **Stack:** `binwiederhier/ntfy` Docker image
- **Port:** `:8080` → `:80` (container)
- **Config:** Fully open auth (`read-write`) — safe because it's Tailscale-only
- **Limits:** 50MB per attachment, 500MB total, 12h cache, 24h attachment expiry

**Usage:**
```bash
# Send notification
curl -d "Hello from Hermes!" ntfy://100.75.137.33:8080/hermes

# Subscribe (CLI)
ntfy subscribe 100.75.137.33:8080/hermes
```

**Phone access:** Add `http://100.75.137.33:8080` in the ntfy Android/iOS app, subscribe to topic `hermes`.

---

### Portainer

Docker management web UI.

- **Stack:** `portainer/portainer-ce:latest`
- **Port:** `:9000` (container, proxied via subdomain)
- **Volumes:** Docker socket mounted + persistent `portainer_data`
- **Security:** `no-new-privileges:true` enabled

---

## Deployment

### Automatic (CI/CD)

Pushing to `main` triggers GitHub Actions → SSH into VPS → pull + rebuild:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
steps:
  - SSH into VPS
  - git pull + git submodule update --remote --merge
  - docker compose up -d --build
  - docker image prune -f
```

**Required GitHub secrets:** `HOST`, `USERNAME`, `SSH_PRIVATE_KEY`

### Manual

Run the deploy script on the VPS:

```bash
cd ~/my-infra
./deploy.sh
```

This performs:
1. `git fetch --all` + `git reset --hard origin/main`
2. `git submodule update --init --recursive --remote`
3. `docker compose pull`
4. `docker compose up -d --build --remove-orphans`
5. `docker image prune -f`

### Updating Nginx

After modifying `nginx.conf`, reload Nginx inside the container:

```bash
docker exec web-gateway nginx -s reload
```

---

## Development

### Prerequisites

- Docker & Docker Compose v2
- Git with submodule support
- SSH access to the VPS

### Cloning with submodules

```bash
git clone --recurse-submodules git@github.com:AurelienBaraquin/my-infra.git

# Or if already cloned:
git submodule update --init --recursive
```

### Local development (per service)

Each submodule is a standalone project. To develop locally:

```bash
# Portfolio
cd portfolio && npm install && npm run dev    # http://localhost:3000

# Miku
cd miku && npm install && npm run dev         # http://localhost:3000

# Manifeste
cd manifeste && npm install && npm run dev    # http://localhost:3000

# PixelQuest
cd pixel_quest && npm install && npm run dev  # Vite dev server
cd pixel_quest/server && npm install && npm run dev  # Express backend
```

### Adding a new service

1. Add the submodule: `git submodule add <repo-url> <path>`
2. Create a `Dockerfile` in the submodule directory
3. Add the service to `compose.yml`
4. Add an Nginx `server` block in `nginx.conf`
5. Run `./deploy.sh` or push to `main`

---

## Git submodules

| Submodule | Path | Repository |
|---|---|---|
| Portfolio | `portfolio/` | [AurelienBaraquin/portfolio](https://github.com/AurelienBaraquin/portfolio) |
| PixelQuest | `pixel_quest/` | [AurelienBaraquin/pixel_quest](https://github.com/AurelienBaraquin/pixel_quest) |
| Miku | `miku/` | [AurelienBaraquin/miku-teto-ui](https://github.com/AurelienBaraquin/miku-teto-ui) |
| Manifeste | `manifeste/` | [AurelienBaraquin/Manifeste](https://github.com/AurelienBaraquin/Manifeste) |

### Updating submodules

```bash
# Update all submodules to latest remote commit
git submodule update --remote --merge

# Update a specific submodule
cd portfolio && git pull origin main && cd ..
git add portfolio
git commit -m "chore: update portfolio submodule"
```

---

## Security considerations

- **Secrets** are stored in `secrets/` (gitignored) — never commit API keys or tokens
- **Vikunja secret** is currently hardcoded in `compose.yml` — consider moving to a `.env` file
- **ntfy** has no authentication — safe only because it's Tailscale-only (not exposed to public internet)
- **Portainer** binds to subdomain only — no public port exposure
- **No HTTPS at Nginx** — TLS must be handled upstream (Cloudflare, etc.) or added via certbot/Let's Encrypt

---

## Hermes AI Agent

This VPS also runs [Hermes Agent](https://hermes-agent.nousresearch.com) — an AI assistant connected to Discord. The `hermes/` directory contains a sanitized copy of its configuration (API keys redacted).

**Key config highlights:**
- **Model:** mimo-v2.5 (default) / mimo-v2.5-pro (coding/delegation)
- **Discord:** 9 channels including code, chat, news, kanban, phone integration
- **Kanban:** Task orchestration system with profiles (coder, ops, researcher, reviewer, writer)
- **Phone:** Samsung S23 Ultra via Tailscale SSH (`100.112.201.87`)
- **ntfy:** Push notifications to phone via self-hosted ntfy

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs <service_name>

# Check if port is in use
docker compose ps
lsof -i :80
```

### Nginx not routing

```bash
# Test config syntax
docker exec web-gateway nginx -t

# Reload after config change
docker exec web-gateway nginx -s reload
```

### Submodule out of sync

```bash
git submodule update --init --recursive --remote
git submodule foreach 'git fetch origin && git checkout main'
```

### Disk space issues

```bash
# Clean up Docker
docker system prune -af
docker volume prune -f

# Check ntfy cache
du -sh docker/ntfy/cache/
```

### Full rebuild

```bash
docker compose down
docker compose up -d --build --remove-orphans
docker image prune -f
```

---

## License

Private repository — not licensed for public use.
