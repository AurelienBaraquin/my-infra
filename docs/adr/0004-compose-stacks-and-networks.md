# ADR-0004 — Stacks Compose séparées et réseaux segmentés

- **Status**: Accepted
- **Date**: 2026-10-24
- **Deciders**: Claude (carte blanche d'Aurélien)
- **Supersedes**: aucun

## Contexte

Enregistré rétroactivement le 2026-10-25. L'ancien `compose.yml` mettait tous les services dans
un fichier et un réseau unique ; Vikunja publiait son port sur l'hôte.

## Options envisagées

1. **Un seul fichier, un seul réseau** — simple ; tout conteneur compromis voit tous les autres.
2. **Projets Compose indépendants** — isolés ; réseaux externes à créer à la main, déploiement en
   plusieurs commandes.
3. **Un projet, des stacks incluses (`include`)** : `core`, `apps`, `tools`, `dashboard` ; un seul
   réseau partagé `proxy`, des réseaux privés par stack, un réseau dédié pour un service qui fait
   confiance aux en-têtes d'identité.

## Décision

Option 3 (`compose.yml` et les `compose.yml` de chaque dossier).

## Conséquences

- Positives : une commande pour tout ; bases de données sans accès sortant ; aucun port
  d'application publié.
- Compromis : les ressources des fichiers inclus partagent un espace de noms (piège du réseau
  `default`, voir `.assistant/lessons.md`).
