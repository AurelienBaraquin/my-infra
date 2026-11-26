# Slasher (sous-module ../../slasher) — le dépôt du jeu n'a pas de Dockerfile : on le construit
# ici. Contexte de build = le sous-module ; Caddyfile pris dans le contexte nommé `conf`.

# ---- Build : Vite produit un site statique dans dist/ ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime : Caddy sert les fichiers ----
FROM caddy:2.11.7-alpine
COPY --from=conf Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
