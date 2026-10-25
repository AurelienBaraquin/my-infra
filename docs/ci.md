# CI/CD

Pipelines GitHub Actions et automatisations du dépôt.

## `.github/workflows/deploy.yml`

- **Déclencheurs** : push sur `main`, pull request, lancement manuel.
- **Job `validate`** : copie `.env.example`, crée des secrets vides, `docker compose config --quiet`.
- **Job `deploy`** (pas sur les PR, après `validate`, environnement GitHub `production`) : SSH vers
  le VPS (`appleboy/ssh-action`), exécute `~/my-infra/scripts/deploy.sh` (`docs/deployment.md`).
  Concurrence : un seul déploiement à la fois.
- **Secrets GitHub** : `HOST`, `USERNAME`, `SSH_PRIVATE_KEY`.
- **Durée** : 1 à 5 min selon les images à reconstruire.
- **Reproduire** : `docker compose config --quiet` puis `./scripts/deploy.sh` sur le VPS.

## `.github/workflows/docs-check.yml`

Sur les PR et les push sur `main` qui touchent la documentation : `node scripts/check-docs.mjs`.

## Dependabot (`.github/dependabot.yml`)

PR hebdomadaires groupées pour les images des fichiers Compose (`core`, `apps`, `tools`,
`dashboard`) et mensuelles pour les actions GitHub.

## Hooks locaux

`.githooks/pre-commit` (vérification de la doc), `.githooks/commit-msg` (Conventional Commits).
