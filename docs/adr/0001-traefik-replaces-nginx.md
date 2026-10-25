# ADR-0001 — Traefik v3 remplace la passerelle nginx

- **Status**: Accepted
- **Date**: 2026-10-24
- **Deciders**: Aurélien (demande de technos plus modernes, carte blanche), Claude (choix)
- **Supersedes**: aucun

## Contexte

Enregistré rétroactivement le 2026-10-25. L'ancienne infra reposait sur un `nginx.conf` unique
écrit à la main (un bloc par site), modifié directement sur le VPS. Aurélien a demandé une refonte
« plus moderne et plus adaptée », en vue d'un dashboard qui fera venir beaucoup de services.

## Options envisagées

1. **Garder nginx** — connu, performant ; chaque service impose d'éditer la config centrale.
2. **Caddy** — config courte, HTTPS automatique ; routage centralisé aussi (ou plugin tiers pour
   les labels).
3. **Traefik v3** — découverte par labels Docker (chaque service déclare sa route), middlewares
   (forward-auth, en-têtes, limite de débit, allowlist), tableau de bord.

## Décision

Traefik v3 (`core/compose.yml`, `core/traefik/`), derrière un socket-proxy en lecture seule.

## Conséquences

- Positives : ajouter un service = des labels ; SSO par un middleware.
- Compromis : plus d'abstraction que nginx ; Traefik doit lire l'API Docker (atténué par le
  socket-proxy).
- Suite : ADR-0002 (SSO), ADR-0004 (stacks et réseaux).
