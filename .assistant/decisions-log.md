# Journal de décisions

Choix trop petits pour un ADR mais à retenir. Entrées les plus récentes en bas. Format :
`AAAA-MM-JJ — ce qui a été décidé — pourquoi (le compromis)`. Ne jamais réécrire l'historique.

- 2026-10-24 — Projet legacy (stack `kanban-prod`) supprimé du VPS avec ses volumes et sauvegardes — demande explicite d'Aurélien.
- 2026-10-24 — Traefik v3 remplace nginx — voir ADR-0001.
- 2026-10-24 — Authelia pour le SSO 2FA — voir ADR-0002.
- 2026-10-24 — Cloudflare proxied + allowlist IP + Origin CA — voir ADR-0003.
- 2026-10-24 — Stacks Compose incluses et réseaux segmentés — voir ADR-0004.
- 2026-10-24 — Sous-modules et images épinglés, déploiement SSH — voir ADR-0005.
- 2026-10-24 — Vikunja et ntfy retirés — demande d'Aurélien ; données Vikunja archivées dans `/root/archive/` sur le VPS.
- 2026-10-24 — Miku et Manifeste passés dans le profil `archived` — ils n'étaient plus routés par nginx et consommaient de la RAM.
- 2026-10-24 — Portainer conservé derrière le SSO plutôt que remplacé — données existantes, coût mémoire faible.
- 2026-10-24 — Sites démo servis par Caddy dans un conteneur dédié, `portfolio-sites/` hors git — builds locaux d'Aurélien, mis en ligne tels quels.
- 2026-10-24 — Travail en cours du sous-module portfolio mis de côté en `git stash` — Aurélien ne voulait pas le déployer ; récupérable avec `git -C portfolio stash pop`.
- 2026-10-24 — DNS : `auth`, `traefik`, `dash` créés en CNAME proxied vers l'apex ; `legacy`, `monitoring`, `vikunja` supprimés — services disparus.
- 2026-10-24 — Sauvegardes locales quotidiennes, 14 jours — premier niveau en attendant une copie hors du VPS (question ouverte).
- 2026-10-25 — Documentation selon le claude-project-kit, en français, sans entretien — autonomie donnée par Aurélien ; attribution IA conservée dans les commits.
- 2026-10-25 — Sauvegardes gardées en local pour l'instant ; copie hors-site suivie dans l'issue #4 — choix d'Aurélien.
- 2026-10-25 — Utilisateur `gha-runner` et `/home/gha-runner` supprimés — runner GitHub jamais configuré, reste du projet legacy ; accord d'Aurélien.
- 2026-10-25 — Sous-modules exclus du contrôle de couverture de la doc — documentés dans leurs dépôts ; chaque bump déclenchait un faux « document périmé ».
- 2026-10-25 — Email Routing Cloudflare activé sur aurelienb.com (MX/SPF), Worker `dashboard-inbox` et règle `inbox@`, le tout décrit par `scripts/cloudflare-email.sh` — réception des comptes Outlook (ADR-0010 du dashboard).
- 2026-10-25 — `docs/` et `.assistant/` exclus du contrôle de couverture — c'est la documentation elle-même ; les couvrir rendait l'index « périmé » à chaque modification de doc.
- 2026-10-26 — Copie hors site des sauvegardes sur Cloudflare R2 (bucket `my-infra-backups`, expiration 60 jours), archive chiffrée par openssl avant envoi, signature S3 par `curl --aws-sigv4` sans outil supplémentaire — R2 gratuit à ce volume et déjà dans le compte ; clôt l'issue #4.
