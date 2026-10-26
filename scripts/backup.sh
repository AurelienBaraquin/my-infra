#!/usr/bin/env bash
# Sauvegarde quotidienne (cron) : base du dashboard + état Authelia + secrets.
# Locale : data/backups/<date>/, rotation 14 jours.
# Hors site : archive chiffrée (AES-256, phrase secrets/backup_passphrase) envoyée sur Cloudflare R2
# si secrets/r2_backup.env existe ; le bucket expire les objets après 60 jours.
#   17 3 * * * /root/my-infra/scripts/backup.sh >> /root/my-infra/data/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

day=$(date +%F)
dest="data/backups/$day"
mkdir -p "$dest"
chmod 700 data/backups

docker compose exec -T db pg_dump -U dashboard -d dashboard --format=custom > "$dest/dashboard.dump"
docker compose exec -T authelia sh -c 'cat /data/db.sqlite3' > "$dest/authelia.sqlite3"
tar -czf "$dest/secrets.tar.gz" secrets
chmod -R go-rwx "$dest"

find data/backups -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "$(date -Is) sauvegarde locale OK → $dest ($(du -sh "$dest" | cut -f1))"

if [[ -s secrets/r2_backup.env && -s secrets/backup_passphrase ]]; then
  # shellcheck disable=SC1091
  source secrets/r2_backup.env
  archive=$(mktemp)
  trap 'rm -f "$archive"' EXIT
  tar -C data/backups -cz "$day" |
    openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass file:secrets/backup_passphrase > "$archive"
  curl -fsS --retry 3 -o /dev/null --aws-sigv4 "aws:amz:auto:s3" --user "$R2_KEY_ID:$R2_SECRET" \
    -T "$archive" "https://$R2_ACCOUNT.r2.cloudflarestorage.com/$R2_BUCKET/$(hostname -s)/$day.tar.gz.enc"
  echo "$(date -Is) copie hors site OK → r2://$R2_BUCKET/$(hostname -s)/$day.tar.gz.enc ($(du -h "$archive" | cut -f1))"
fi
