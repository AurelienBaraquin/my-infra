# ADR-0003 — Cloudflare devant, origine verrouillée par allowlist IP et certificat Origin CA

- **Status**: Accepted
- **Date**: 2026-10-24
- **Deciders**: Claude (carte blanche d'Aurélien)
- **Supersedes**: aucun

## Contexte

Enregistré rétroactivement le 2026-10-25. Le domaine était déjà chez Cloudflare (proxied, Origin
CA valable jusqu'en 2041, SSL « Full (strict) »). L'IP du VPS restait joignable directement.

## Options envisagées

1. **Cloudflare Tunnel** — aucun port ouvert ; un démon de plus et un tunnel à créer dans le
   compte Cloudflare (hors du dépôt).
2. **Let's Encrypt sur le VPS, Cloudflare en DNS seul** — indépendant de Cloudflare ; perd le
   masquage de l'IP et la protection.
3. **Garder le proxy Cloudflare + Origin CA, et n'accepter que les IP Cloudflare dans Traefik**
   (allowlist sur l'IP TCP, `trustedIPs` pour les en-têtes, `sniStrict`).

## Décision

Option 3 (`core/traefik/traefik.yml`, `core/traefik/dynamic/`), plages synchronisées par
`scripts/cloudflare-ips.sh`.

## Conséquences

- Positives : l'IP directe répond 403 ; vraie IP client fiable pour Authelia et la limite de débit.
- Compromis : plages IP codées en dur à resynchroniser ; un enregistrement « DNS only » cesse de
  fonctionner.
- Suite : réévaluer Cloudflare Tunnel si l'on veut fermer les ports 80/443.
