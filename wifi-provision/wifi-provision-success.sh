#!/bin/bash
# Called by server.js after a successful connection from the portal.
# Updates status file so the main script can detect success and shut down AP.

STATE_DIR="/var/lib/wifi-provision"
STATUS_FILE="$STATE_DIR/status.json"

IP=$(hostname -I | awk '{print $1}')
SSID=$(nmcli -t -f GENERAL.CONNECTION device show wlan0 2>/dev/null | cut -d: -f2 || echo "unknown")

echo "{\"state\":\"connected\",\"ssid\":\"$SSID\",\"ip\":\"$IP\"}" > "$STATUS_FILE"
