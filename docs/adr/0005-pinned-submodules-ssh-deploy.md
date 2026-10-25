# ADR-0005 — Déploiement par SSH, sous-modules et images épinglés

- **Status**: Accepted
- **Date**: 2026-10-24
- **Deciders**: Claude (carte blanche d'Aurélien)
- **Supersedes**: aucun

## Contexte

Enregistré rétroactivement le 2026-10-25. L'ancien workflow faisait `git pull` puis
`git submodule update --remote --merge` : chaque déploiement prenait la dernière version de
chaque application, sans trace ni retour arrière possible. Images en `:latest` (dont Watchtower,
archivé).

## Options envisagées

1. **Garder `--remote`** — aucune étape pour publier une app ; déploiements non reproductibles.
2. **Registre d'images + pull** — propre ; demande une CI de build par application.
3. **Sous-modules épinglés au commit enregistré, images à version exacte, Dependabot pour les
   mises à jour, script `scripts/deploy.sh` lancé en SSH par GitHub Actions.**

## Décision

Option 3 (`scripts/deploy.sh`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`).

## Conséquences

- Positives : chaque état du VPS correspond à un commit ; retour arrière par `git revert`.
- Compromis : publier une app demande un commit de bump ici ; images construites sur le VPS (CPU).
- Suite : registre d'images si les builds deviennent trop lourds pour le VPS.
