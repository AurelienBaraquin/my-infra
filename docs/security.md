# Sécurité

Modèle de sécurité du VPS : ce qui est exposé, comment l'accès est contrôlé, où sont les secrets.
À relire avant d'exposer un service.

## Exposition

- Ports ouverts (UFW) : 22 (SSH, fail2ban), 80 et 443 (Traefik). Aucune application ne publie de
  port sur l'hôte.
- **Seul Cloudflare peut parler à Traefik** : middleware `cloudflare-only` (allowlist des plages
  Cloudflare sur l'IP du pair TCP) sur toutes les routes HTTPS, et `sniStrict` (pas de réponse TLS
  sans nom d'hôte valide). Un accès direct à l'IP renvoie 403.
- Les en-têtes `X-Forwarded-*` ne sont crus que venant de Cloudflare (`forwardedHeaders.trustedIPs`
  dans `core/traefik/traefik.yml`) ; la limite de débit utilise `CF-Connecting-IP`.
- TLS : public chez Cloudflare ; Cloudflare → VPS en « Full (strict) » avec le certificat Origin
  CA (`*.aurelienb.com`, expire en 2041), TLS 1.2 minimum.

- Mail : `inbox@aurelienb.com` reçoit le courrier de n'importe qui (Cloudflare Email Routing,
  contrôles SPF/DKIM de Cloudflare) ; le Worker le dépose dans le dashboard avec un jeton limité à
  `ingest:email` (il ne peut appeler aucune autre route). Le contenu des mails n'est jamais exécuté.

## Contrôle d'accès

- Services privés (Portainer, tableau de bord Traefik, dashboard) : middleware `sso@file` =
  suppression des en-têtes `Remote-*` du client puis forward-auth Authelia, politique
  `two_factor` sur `*.aurelienb.com`, refus par défaut.
- Sessions : 2 h d'inactivité, 12 h maximum, 1 mois avec « se souvenir de moi ». Bannissement 1 h
  après 5 échecs en 10 min.
- Dashboard : accès machine par jeton `Bearer dsh_…` sur `/api/*` et `/mcp` uniquement, vérifié par
  l'app ; l'app n'est joignable que par Traefik (réseau `dashboard-edge`). Détails :
  `dashboard/app/docs/security.md`.
- Portainer a un accès complet au socket Docker : double barrière SSO + login Portainer.
- Traefik ne voit le socket Docker qu'à travers `socket-proxy` (lecture seule de `containers`,
  `events`, `version`, n'accepte que Traefik, réseau interne `socket`).

## Secrets

Générés par `scripts/bootstrap.sh` dans `secrets/` (mode 700, fichiers 600, hors git), montés en
secrets Compose. Liste : `docs/configuration.md`. Le certificat d'origine est dans `ssl/` (hors
git). Les sauvegardes contiennent une archive des secrets (`data/backups/`, mode 700).

## Données personnelles

L'infra elle-même ne traite que : le compte SSO (nom, e-mail, hash du mot de passe, appareils 2FA
dans `data/authelia/`) et les journaux (IP clientes dans les logs Traefik et Authelia, rotation
30 Mo par conteneur). Les données du dashboard : `dashboard/app/docs/security.md`.

## Limites connues

- Les sauvegardes sont sur le même disque que les données.
- Les plages IP Cloudflare sont codées en dur : à resynchroniser (`docs/operations.md`).
- Le dépôt est public : aucun secret ne doit jamais y entrer (l'ancien secret Vikunja publié a
  été retiré avec le service).
