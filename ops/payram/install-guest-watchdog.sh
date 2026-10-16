#!/bin/bash
set -euo pipefail
test "$(id -u)" = 0
# Dependency lists such as Conflicts cannot be cleared in a drop-in.
# Preserve the vendor service and remove only the clock-sync conflict.
fragment=$(systemctl show vboxadd-service -p FragmentPath --value)
stage=$(mktemp)
sed 's/ systemd-timesyncd.service//g' "$fragment" > "$stage"
install -m 644 "$stage" /etc/systemd/system/vboxadd-service.service
rm -f -- "$stage" /etc/systemd/system/vboxadd-service.service.d/payram-recovery.conf
cat > /usr/local/sbin/payram-guest-watchdog <<'SCRIPT'
#!/bin/bash
set -euo pipefail
if ! systemctl is-active --quiet vboxadd-service || ! pgrep -x VBoxService >/dev/null; then
 systemctl restart vboxadd-service
fi
SCRIPT
chmod 700 /usr/local/sbin/payram-guest-watchdog
cat > /etc/systemd/system/payram-guest-watchdog.service <<'UNIT'
[Unit]
Description=Recover PayRam VM guest management service
After=vboxadd.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/payram-guest-watchdog
UNIT
cat > /etc/systemd/system/payram-guest-watchdog.timer <<'UNIT'
[Unit]
Description=Check PayRam VM guest management every minute
[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
AccuracySec=5s
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable vboxadd-service >/dev/null
systemctl enable --now payram-guest-watchdog.timer >/dev/null
systemctl start payram-guest-watchdog.service
echo 'Guest watchdog installed; guest management and clock sync no longer conflict.'
