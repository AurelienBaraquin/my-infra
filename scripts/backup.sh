#!/usr/bin/env bash
# Sauvegarde locale quotidienne (cron) : base du dashboard + état Authelia + secrets.
# Rotation : 14 jours. Copie hors-site à ajouter (rclone/restic) — les sauvegardes sont sur le
# même disque que les données.
#   17 3 * * * /root/my-infra/scripts/backup.sh >> /root/my-infra/data/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

dest="data/backups/$(date +%F)"
mkdir -p "$dest"
chmod 700 data/backups

docker compose exec -T db pg_dump -U dashboard -d dashboard --format=custom > "$dest/dashboard.dump"
docker compose exec -T authelia sh -c 'cat /data/db.sqlite3' > "$dest/authelia.sqlite3"
tar -czf "$dest/secrets.tar.gz" secrets
chmod -R go-rwx "$dest"

find data/backups -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "$(date -Is) sauvegarde OK → $dest ($(du -sh "$dest" | cut -f1))"
