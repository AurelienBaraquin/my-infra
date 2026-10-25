# Index de la documentation

Chaque surface de l'infra — tout ce qu'il faut savoir pour la construire, la déployer,
l'exploiter ou l'utiliser — a un document, listé ici et mis à jour dans le même changement que ce
qu'il couvre. Ce que chaque type de document doit contenir : skill `project-sync`
(`.claude/skills/project-sync/doc-surfaces.md`).

La colonne **Covers** (nom imposé par le script) liste, en code, les chemins qu'un document décrit.
`scripts/check-docs.mjs` s'en sert : un dossier de premier niveau, fichier Compose, pipeline CI ou
`.env.example` qu'aucun document ne couvre est une erreur ; un document dont les chemins couverts
changent sans lui est signalé comme peut-être périmé. Les applications en sous-module ont leur
propre documentation dans leur dépôt (celle du dashboard : `dashboard/app/docs/`).

| Document | Ce qu'il répond | Covers | Mettre à jour quand |
|---|---|---|---|
| [brief.md](brief.md) | Quoi et pourquoi : objectif, périmètre, priorités, critères de réussite | l'intention du dépôt | le périmètre ou les priorités changent |
| [architecture.md](architecture.md) | Organisation, réseaux, conventions, ajouter un service | `compose.yml` `apps/` `tools/` `dashboard/` `hermes/` `portfolio/` `pixel_quest/` `chinese_notebook/` `miku/` `manifeste/` `docs/` `.assistant/` | une stack, un service, un réseau ou une convention change |
| [security.md](security.md) | Exposition, contrôle d'accès, secrets, données personnelles | `core/` | une règle d'exposition, d'accès ou de secret change |
| [configuration.md](configuration.md) | Variables `.env`, secrets, fichiers de configuration | `.env.example` `scripts/bootstrap.sh` `core/traefik/` `core/authelia/` | une variable, un secret ou un fichier de config change |
| [deployment.md](deployment.md) | Déploiement continu, publier une app, revenir en arrière, nouveau VPS | `scripts/deploy.sh` `.gitmodules` | une étape de déploiement change |
| [operations.md](operations.md) | Santé, logs, sauvegardes, compte SSO, DNS, pannes connues | `scripts/backup.sh` `scripts/cloudflare-ips.sh` | une sonde, la sauvegarde, une procédure ou un runbook change |
| [ci.md](ci.md) | Pipelines, Dependabot, hooks locaux | `.github/` `.githooks/` | un workflow, un déclencheur ou un hook change |
| [technologies.md](technologies.md) | Rôle, configuration et pièges de chaque brique | `core/compose.yml` `apps/compose.yml` `tools/compose.yml` `dashboard/compose.yml` | une brique est ajoutée, remplacée ou reconfigurée |
| [../README.md](../README.md) | Services en ligne et démarrage | `README.md` | un service ou une étape de démarrage change |
| [adr/](adr/) | Pourquoi les choix structurants ont été faits | décisions | une décision structurante est prise ou inversée |
| [decisions-log.md](../.assistant/decisions-log.md) | Petits choix et leurs raisons | décisions | un petit choix est fait |
| [lessons.md](../.assistant/lessons.md) | Erreurs commises et ce qui les empêche | leçons | la CI, un déploiement ou le propriétaire détecte une erreur |
| [README.md](README.md) | Cet index et l'outillage de documentation | `scripts/check-docs.mjs` `.docs-check.json` | la vérification de la doc ou sa config change |
