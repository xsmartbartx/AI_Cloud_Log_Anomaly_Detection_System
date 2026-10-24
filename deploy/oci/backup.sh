#!/bin/sh
# Daily database backup; keeps the newest 14 files. Copy them off the VM as well (OCI Object Storage, another region, or your own machine).
# crontab:  30 3 * * *  /opt/linegist/deploy/oci/backup.sh >> /var/log/linegist-backup.log 2>&1
set -eu
cd "$(dirname "$0")"
DIR="${BACKUP_DIR:-/var/backups/linegist}"
KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$DIR"
FILE="$DIR/linegist-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T db pg_dump -U linegist -d linegist --no-owner | gzip > "$FILE"
if [ ! -s "$FILE" ]; then echo "backup is empty: $FILE" >&2; rm -- "$FILE"; exit 1; fi
# Count-based retention: a run of failed backups can never delete the good ones.
for old in $(ls -1t "$DIR"/linegist-*.sql.gz | tail -n +$((KEEP + 1))); do rm -- "$old"; done
echo "$(date -u +%FT%TZ) wrote $FILE ($(wc -c < "$FILE") bytes)"
