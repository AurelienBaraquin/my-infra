# Exploitation

Santé, logs, sauvegardes, comptes et pannes connues. Pour qui surveille ou dépanne le VPS.
Commandes à lancer dans `~/my-infra`.

## Santé et logs

- `docker compose ps` : tous les services avec healthcheck doivent être `healthy` (Portainer et
  socket-proxy n'en ont pas).
- `docker compose logs -f <service>` ; rotation 3 × 10 Mo par conteneur.
- Traefik : journal d'accès JSON limité aux erreurs (4xx/5xx) et aux requêtes de plus de 2 s ;
  tableau de bord sur `https://traefik.aurelienb.com` (SSO).
- Mémoire : `docker stats --no-stream` (VPS de 2 Go, swap de 3 Go).
- **Suivi dans le dashboard** (`https://dash.aurelienb.com/system`) : processeur, mémoire, swap,
  disque, mémoire et processeur de chaque conteneur, base, coût de l'IA, sur 30 jours. Les
  conteneurs viennent de `scripts/host-stats.sh` (`docker stats`, écrit dans `kv.system.host`), à
  lancer toutes les 5 minutes par le cron root :
  `*/5 * * * * /root/my-infra/scripts/host-stats.sh >/dev/null 2>&1`. L'app n'a pas accès au socket
  Docker (ADR-0017 du dashboard). Sans cette ligne, la santé signale « Relevé des conteneurs ».

## Sauvegardes

`scripts/backup.sh`, cron root `17 3 * * *`, journal `data/backups/backup.log`. Chaque jour,
`data/backups/<AAAA-MM-JJ>/` contient :

| Fichier | Contenu |
|---|---|
| `dashboard.dump` | `pg_dump --format=custom` de la base du dashboard |
| `authelia.sqlite3` | base Authelia (2FA enregistrés, réglages) |
| `secrets.tar.gz` | le dossier `secrets/` |

À la fin (ou en cas d'échec), le script écrit son état dans la base du dashboard
(`kv.system.backup` : date, réussite, taille, copie hors site), affiché dans Réglages → Santé et
surveillé chaque heure.

Rétention locale 14 jours. **Copie hors site** : le même dossier, archivé puis chiffré
(`openssl enc -aes-256-cbc -pbkdf2 -iter 600000`, phrase `secrets/backup_passphrase`), est envoyé
dans le bucket Cloudflare R2 `my-infra-backups` (`<hôte>/<AAAA-MM-JJ>.tar.gz.enc`, signature S3
par `curl --aws-sigv4`, identifiants dans `secrets/r2_backup.env`). Le bucket supprime les objets
de plus de 60 jours (règle de cycle de vie `expire-60d`).

**La phrase de chiffrement doit aussi exister hors du VPS** (gestionnaire de mots de passe) : sans
elle, la copie R2 est inutilisable si le serveur est perdu.

Restaurer depuis R2 :

```bash
source secrets/r2_backup.env
curl -fsS --aws-sigv4 "aws:amz:auto:s3" --user "$R2_KEY_ID:$R2_SECRET" \
  "https://$R2_ACCOUNT.r2.cloudflarestorage.com/$R2_BUCKET/<hôte>/<date>.tar.gz.enc" |
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass file:backup_passphrase | tar -xz
```

Restauration du dashboard : `dashboard/app/docs/operations.md`. Authelia : arrêter le service,
remplacer `data/authelia/db.sqlite3`, redémarrer.

## Compte SSO (Authelia)

- Compte unique dans `secrets/authelia_users.yml` ; mot de passe initial dans
  `secrets/authelia_initial_password` (à changer, puis supprimer ce fichier).
- Changer le mot de passe :
  `docker run --rm authelia/authelia:4.39.28 authelia crypto hash generate argon2`, remplacer le
  hash dans le fichier (rechargé automatiquement).
- Pas de SMTP : les codes de vérification (enrôlement TOTP / passkey) sont écrits dans
  `data/authelia/notification.txt`.
- 5 échecs en 10 min bannissent l'IP pendant 1 h.

## DNS (Cloudflare)

Zone `aurelienb.com`, enregistrements **proxied** ; MX et SPF de l'apex gérés par Cloudflare Email
Routing (ne pas les modifier à la main). Sous-domaines en place : apex, `www`, `auth`,
`traefik`, `dash`, `portainer`, `chinesenote`, `miku`, `manifeste`, `onlyfans` (redirection). Un
jeton API (droits DNS) est dans `secrets/cloudflare_api_token` :

```bash
T=$(cat secrets/cloudflare_api_token); Z=be780c5fd5a9b862f77c62d5090cde0c
curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  https://api.cloudflare.com/client/v4/zones/$Z/dns_records \
  -d '{"type":"CNAME","name":"nouveau","content":"aurelienb.com","proxied":true}'
```

## Réception des mails (`inbox@aurelienb.com`)

Les comptes Outlook (écoles, perso) transfèrent leurs mails vers `inbox@aurelienb.com` : Cloudflare
Email Routing → Worker `dashboard-inbox` (`cloudflare/email-worker/worker.js`) → dashboard.

- (Ré)installer, renouveler le jeton ou redéployer le Worker : `./scripts/cloudflare-email.sh`
  (idempotent). `FALLBACK=<adresse vérifiée> ./scripts/cloudflare-email.sh` fait suivre les mails
  vers cette adresse quand le dashboard est injoignable (adresse à vérifier d'abord dans Cloudflare
  → Email → Destination addresses) ; sans elle, le mail est refusé et l'expéditeur reçoit un
  rapport de non-remise.
- Diagnostic : Cloudflare → Email → Email Routing → Activity log ; logs du Worker (Workers →
  `dashboard-inbox` → Logs) ; côté dashboard `docker compose logs app | grep "mail importé"`.

## Tâches périodiques

| Quand | Quoi |
|---|---|
| Toutes les 5 minutes | Relevé des conteneurs pour le dashboard (cron, `scripts/host-stats.sh`) |
| Chaque nuit | Sauvegarde (cron) |
| Chaque semaine | Revoir les PR Dependabot (images épinglées) |
| De temps en temps | `./scripts/cloudflare-ips.sh && docker compose restart traefik` (plages IP Cloudflare) |

## Pannes connues

| Symptôme | Cause | Remède |
|---|---|---|
| Un service ignore une modification de sa config, ou devient `unhealthy` après un déploiement | Fichier ou dossier monté en bind remplacé par git | `docker compose up -d --force-recreate <service>` (fait automatiquement par `scripts/deploy.sh` pour les stacks modifiées) |
| 403 sur tous les sites | Plages IP Cloudflare changées, ou enregistrement DNS passé en « DNS only » | `./scripts/cloudflare-ips.sh && docker compose restart traefik` ; vérifier le nuage orange |
| Le dashboard redémarre en boucle (`EACCES /run/secrets/…`) | Secrets non lisibles par l'uid 1000 | `./scripts/bootstrap.sh` puis `docker compose up -d app` |
| `exec /usr/bin/caddy: operation not permitted` | `cap_drop: [ALL]` sans `NET_BIND_SERVICE` | Ajouter `cap_add: [NET_BIND_SERVICE]` |
| Les mails transférés n'arrivent plus | Jeton du Worker révoqué, dashboard injoignable, ou transfert bloqué côté école | Activity log Cloudflare ; `./scripts/cloudflare-email.sh` ; rapport de non-remise dans la boîte d'origine |
