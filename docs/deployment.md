# Déploiement

Comment une modification arrive sur le VPS, et comment revenir en arrière. Pour qui livre un
changement d'infra ou une nouvelle version d'application.

## Environnement

Un seul : la production, le VPS `racknerd-2303d07` (IP 192.3.233.103), derrière Cloudflare. Le
dépôt est cloné dans `~/my-infra` (utilisateur `root`). Projet Compose : `my-infra`
(`compose.yml`, qui inclut `core/compose.yml`, `apps/compose.yml`, `tools/compose.yml`,
`dashboard/compose.yml`).

## Déploiement continu

Tout push sur `main` lance `.github/workflows/deploy.yml` (`docs/ci.md`), qui se connecte en SSH au
VPS et exécute `scripts/deploy.sh` :

1. `git fetch`, `git checkout main`, `git reset --hard origin/main` — **les modifications locales
   non commitées des fichiers suivis sont perdues** (les fichiers ignorés : `secrets/`, `data/`,
   `ssl/`, `portfolio-sites/` restent) ;
2. `git submodule update --init --recursive` — chaque application au commit enregistré ici ;
3. `scripts/bootstrap.sh` — crée ce qui manque (secrets, dossiers), ne régénère rien ;
4. `docker compose config --quiet`, puis `docker compose up -d --build --remove-orphans --wait` ;
5. pour chaque stack dont un fichier a changé depuis le déploiement précédent : recréation forcée
   de ses services (les configs montées en bind deviennent sinon périmées, voir
   `.assistant/lessons.md`) ;
6. `docker image prune -f`.

## Publier une nouvelle version d'une application

Les sous-modules sont épinglés : pousser dans le dépôt de l'application ne suffit pas.

```bash
git -C <sous-module> pull origin main
git add <sous-module>
git commit -m "chore(<app>): bump to <sha court>"
git push                                     # déclenche le déploiement
```

## Déployer à la main

```bash
cd ~/my-infra && ./scripts/deploy.sh          # comme la CI
docker compose up -d --build --wait <service> # un seul service, depuis l'arbre local
```

## Revenir en arrière

`git revert <commit>` puis push (redéploie l'état précédent). Pour une application : remettre son
sous-module sur le commit précédent et pousser. Les données (`data/`) ne sont pas versionnées :
voir la restauration dans `docs/operations.md`.

## Nouveau VPS

Voir « Démarrer » dans `README.md`, puis : copier `ssl/cloudflare/`, restaurer `secrets/` et
`data/` depuis une sauvegarde, pointer les DNS Cloudflare vers la nouvelle IP, mettre à jour le
secret GitHub `HOST`.
