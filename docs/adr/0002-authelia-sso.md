# ADR-0002 — Authelia pour le SSO et la double authentification

- **Status**: Accepted
- **Date**: 2026-10-24
- **Deciders**: Claude (carte blanche d'Aurélien)
- **Supersedes**: aucun

## Contexte

Enregistré rétroactivement le 2026-10-25. Le futur dashboard doit être « accessible partout depuis
un navigateur et protégé ». L'ancienne infra n'avait qu'un `.htpasswd` inutilisé et un accès
Tailscale (non installé). VPS de 2 Go de RAM.

## Options envisagées

1. **Authentik** — très complet ; 700 Mo et plus avec PostgreSQL et Redis, trop lourd ici.
2. **Cloudflare Access** — rien à héberger ; dépendance forte à Cloudflare, configuration hors du dépôt.
3. **Pocket ID + oauth2-proxy** — passkeys seules ; deux composants pour le forward-auth.
4. **Authelia** — léger (~45 Mo), forward-auth natif pour Traefik, TOTP et passkeys, fournisseur
   OIDC pour plus tard.

## Décision

Authelia (`core/compose.yml`, `core/authelia/configuration.yml`), politique `two_factor` sur
`*.aurelienb.com`, refus par défaut, portail sur `auth.aurelienb.com`.

## Conséquences

- Positives : une seule connexion pour tous les outils privés ; aucun code d'authentification
  dans les applications.
- Compromis : pas de SMTP (codes dans un fichier) ; compte en fichier YAML.
- Suite : brancher en OIDC les applications qui le gèrent nativement.
