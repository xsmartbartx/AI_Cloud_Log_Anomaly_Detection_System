#!/bin/sh
# Daily database backup; keeps the newest 14 files. Copy them off the VM as well (OCI Object Storage, another region, or your own machine).
# crontab:  30 3 * * *  /opt/linegist/deploy/oci/backup.sh >> /var/log/linegist-backup.log 2>&1
#
# Safety properties: the dump is written to a plain file first so a failed pg_dump is noticed (piping into gzip would hide it);
# it must end with pg_dump's completion marker; files are private (umask 077); retention counts files, so a run of
# failed backups can never delete the good ones.
set -eu
umask 077
cd "$(dirname "$0")"
DIR="${BACKUP_DIR:-/var/backups/linegist}"
KEEP="${BACKUP_KEEP:-14}"
# --clean --if-exists makes a restore into a populated database work; DUMP_CMD is overridable for testing.
DUMP_CMD="${DUMP_CMD:-docker compose exec -T db pg_dump -U linegist -d linegist --no-owner --clean --if-exists}"

mkdir -p "$DIR"
chmod 700 "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$DIR/.linegist-$STAMP.sql.tmp"
FILE="$DIR/linegist-$STAMP.sql.gz"
trap 'rm -f -- "$TMP" "$TMP.gz"' EXIT

# shellcheck disable=SC2086  # DUMP_CMD is a command line on purpose
if ! $DUMP_CMD > "$TMP"; then echo "pg_dump failed; nothing kept, older backups untouched" >&2; exit 1; fi
if ! tail -n 5 "$TMP" | grep -q "PostgreSQL database dump complete"; then echo "dump is incomplete; nothing kept, older backups untouched" >&2; exit 1; fi
gzip -c "$TMP" > "$TMP.gz"
gzip -t "$TMP.gz"
mv -- "$TMP.gz" "$FILE"

for old in $(ls -1t "$DIR"/linegist-*.sql.gz | tail -n +$((KEEP + 1))); do rm -- "$old"; done
echo "$(date -u +%FT%TZ) wrote $FILE ($(wc -c < "$FILE") bytes)"
