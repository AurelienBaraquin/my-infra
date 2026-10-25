# Leçons

Erreurs commises (par une personne ou un agent IA) et ce qui les empêche désormais. Format :
`AAAA-MM-JJ — ce qui s'est mal passé — comment c'a été détecté — ce qui l'empêche désormais`.

- 2026-10-24 — Après le merge de la PR d'infra, `gh pr merge` a basculé le dépôt sur l'ancien
  `main` puis l'a mis à jour : les dossiers suivis ont été supprimés puis recréés, et tous les
  montages bind des conteneurs sont devenus périmés (healthcheck du dashboard en échec) — détecté
  par l'échec de `--wait` dans le déploiement CI — `scripts/deploy.sh` recrée les services de
  chaque stack modifiée ; runbook dans `docs/operations.md`.
- 2026-10-24 — Un réseau nommé `default` dans `dashboard/compose.yml` (inclus) a remplacé le réseau
  par défaut du projet — détecté au déploiement (conflit de labels) — convention dans
  `docs/architecture.md` ; le réseau privé s'appelle `internal`.
- 2026-10-24 — Le dashboard (uid 1000) ne lisait pas ses secrets (root, 600) — détecté au premier
  démarrage — `scripts/bootstrap.sh` fait le `chown` ; runbook dans `docs/operations.md`.
- 2026-10-24 — Le mot de passe Authelia initial a été filtré de la sortie et perdu — détecté
  aussitôt — `scripts/bootstrap.sh` l'écrit dans `secrets/authelia_initial_password` au lieu de
  l'afficher.
- 2026-10-24 — `cap_drop: [ALL]` empêchait Caddy de démarrer (capacité de fichier) — détecté par
  le redémarrage en boucle — convention `cap_add: [NET_BIND_SERVICE]` dans `docs/architecture.md`.
- 2026-10-24 — Le lockfile du front de pixel_quest est désynchronisé (Tailwind 3 contre 4) et
  casse `npm ci` — détecté au build — `npm install` dans son Dockerfile ; problème ouvert dans le
  dépôt pixel_quest (régénérer le lockfile).
