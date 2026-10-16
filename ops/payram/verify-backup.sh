#!/bin/bash
set -euo pipefail
umask 077
archive=${1:?Archive required}
case "$archive" in /root/.morteva-payram-backups/*.tar.gz) ;; *) echo 'Unexpected verification path' >&2; exit 1;; esac
base=/root/.morteva-payram-backups
stage=$(mktemp -d "$base/restore.XXXXXX")
name="morteva-backup-verify-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf -- "$stage"; rm -f -- "$base/verify-roundtrip.tar.gz"; }
trap cleanup EXIT
# Extract only known members; never execute archived configuration.
tar -xzf "$archive" -C "$stage" .morteva-payram-backups/database.dump .morteva-payram-mainnet/container.env .morteva-payram-mainnet/public.conf .morteva-payram-mainnet/tunnel.env
for file in "$stage/.morteva-payram-mainnet/"* "$stage/.morteva-payram-backups/database.dump"; do test -s "$file"; done
image=$(docker inspect morteva-payram-mainnet --format '{{.Image}}')
# No ports, network, production volumes or PayRam application. Only an ephemeral PostgreSQL cluster.
docker run -d --name "$name" --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,size=768m --entrypoint /bin/bash "$image" -c 'sleep 300' >/dev/null
docker exec -i "$name" sh -c 'cat > /tmp/backup.dump; chmod 644 /tmp/backup.dump' < "$stage/.morteva-payram-backups/database.dump"
docker exec -u postgres "$name" /bin/bash -c '
set -euo pipefail
export PATH=/usr/lib/postgresql/17/bin:$PATH
initdb -D /tmp/restore-pg -A trust --no-locale >/dev/null
pg_ctl -D /tmp/restore-pg -o "-k /tmp -h 127.0.0.1 -p 55432" -w start >/dev/null
createuser -h /tmp -p 55432 payram
createdb -h /tmp -p 55432 -O payram payram_restore
pg_restore --exit-on-error --no-owner --no-privileges -h /tmp -p 55432 -d payram_restore /tmp/backup.dump
count=$(psql -h /tmp -p 55432 -d payram_restore -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()")
test "$count" -gt 0
echo "Isolated full PostgreSQL restore passed; public tables=$count"
pg_ctl -D /tmp/restore-pg -m fast -w stop >/dev/null
'
