#!/usr/bin/env bash
# Déploiement : aligne le VPS sur origin/main puis applique la stack.
# Lancé par .github/workflows/deploy.yml (SSH) ou à la main : ./scripts/deploy.sh
# Les sous-modules sont épinglés au commit enregistré dans ce repo (déploiement reproductible) :
# pour publier une nouvelle version d'une app, bumper son sous-module ici.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=${DEPLOY_BRANCH:-main}
before=$(git rev-parse HEAD)
git fetch --prune origin
git checkout -q "$branch"
git reset -q --hard "origin/$branch"
git submodule sync -q
git submodule update --init --recursive

./scripts/bootstrap.sh
docker compose config --quiet
docker compose up -d --build --remove-orphans --wait --wait-timeout 180

# Les configs sont montées en bind depuis le repo ; git remplace un fichier modifié (nouvel
# inode), le conteneur garderait donc l'ancienne version sans le savoir. On recrée les services
# de chaque stack dont un fichier a changé depuis le dernier déploiement.
for stack in $(git diff --name-only "$before" HEAD -- core apps tools dashboard | cut -d/ -f1 | sort -u); do
  services=$(docker compose -f "$stack/compose.yml" --project-directory . config --services)
  echo "• $stack modifiée → recréation : $(echo $services)"
  docker compose up -d --force-recreate --no-deps --wait --wait-timeout 180 $services
done

docker image prune -f >/dev/null
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
