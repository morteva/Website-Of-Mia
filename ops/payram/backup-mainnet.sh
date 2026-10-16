#!/bin/bash
set -euo pipefail
umask 077
root=/root/.morteva-payram-mainnet
backup=/root/.morteva-payram-backups
mkdir -p "$backup"
exec 9>"$backup/backup.lock"
flock -n 9 || { echo 'Backup already running' >&2; exit 1; }
stage=$(mktemp -d "$backup/stage.XXXXXX")
trap 'rm -rf -- "$stage"' EXIT
set -a
. "$root/container.env"
set +a
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" morteva-payram-mainnet \
 pg_dump -h localhost -U payram -d payram -Fc > "$stage/database.dump"
test -s "$stage/database.dump"
docker exec -i morteva-payram-mainnet pg_restore --list < "$stage/database.dump" >/dev/null
mkdir -p "$stage/.morteva-payram-mainnet" "$stage/.morteva-payram-backups"
cp "$root/container.env" "$root/public.conf" "$root/tunnel.env" "$stage/.morteva-payram-mainnet/"
mv "$stage/database.dump" "$stage/.morteva-payram-backups/"
tar -czf "$stage/latest.tar.gz" -C "$stage" .morteva-payram-mainnet .morteva-payram-backups
tar -tzf "$stage/latest.tar.gz" >/dev/null
mv "$stage/latest.tar.gz" "$backup/latest.tar.gz"
echo 'Consistent database and current configuration archive prepared.'
