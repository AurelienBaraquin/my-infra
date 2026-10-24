#!/usr/bin/env bash
# Déploiement : aligne le VPS sur origin/main puis applique la stack.
# Lancé par .github/workflows/deploy.yml (SSH) ou à la main : ./scripts/deploy.sh
# Les sous-modules sont épinglés au commit enregistré dans ce repo (déploiement reproductible) :
# pour publier une nouvelle version d'une app, bumper son sous-module ici.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=${DEPLOY_BRANCH:-main}
git fetch --prune origin
git checkout -q "$branch"
git reset -q --hard "origin/$branch"
git submodule sync -q
git submodule update --init --recursive

./scripts/bootstrap.sh
docker compose config --quiet
docker compose up -d --build --remove-orphans --wait --wait-timeout 180
docker image prune -f >/dev/null
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
