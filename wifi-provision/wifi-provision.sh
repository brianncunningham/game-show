#!/bin/bash
# Wi-Fi Provisioning Orchestration Script
# Runs at boot via systemd. Tries saved networks, falls back to AP mode.

set -euo pipefail

STATE_DIR="/var/lib/wifi-provision"
FORCE_AP_FLAG="$STATE_DIR/force-ap"
STATUS_FILE="$STATE_DIR/status.json"
PORTAL_DIR="/opt/wifi-provision"
AP_IFACE="wlan0"
AP_IP="192.168.4.1"
AP_SSID="GameShow-Setup"
HOME_NETWORK_TIMEOUT=30
SAVED_NETWORK_TIMEOUT=15

mkdir -p "$STATE_DIR"
echo '{"state":"starting"}' > "$STATUS_FILE"

log() { echo "[wifi-provision] $*" | tee -a /var/log/wifi-provision.log; }

cleanup_ap() {
  log "Stopping AP mode..."
  systemctl stop hostapd 2>/dev/null || true
  systemctl stop dnsmasq 2>/dev/null || true
  pkill -f "node $PORTAL_DIR/server.js" 2>/dev/null || true
  ip addr del "$AP_IP/24" dev "$AP_IFACE" 2>/dev/null || true
  nmcli device set "$AP_IFACE" managed yes 2>/dev/null || true
  log "AP mode stopped."
}

start_portal() {
  log "Starting provisioning portal..."
  node "$PORTAL_DIR/server.js" &
  PORTAL_PID=$!
  log "Portal PID: $PORTAL_PID"
}

start_ap() {
  log "Entering AP mode (SSID: $AP_SSID)..."

  nmcli device set "$AP_IFACE" managed no

  ip addr flush dev "$AP_IFACE"
  ip addr add "$AP_IP/24" dev "$AP_IFACE"
  ip link set "$AP_IFACE" up

  systemctl start hostapd
  systemctl start dnsmasq

  log "AP up. Portal reachable at http://$AP_IP:8080 or http://gameshow.local:8080"
}

try_connect() {
  local conn_name="$1"
  local timeout="$2"
  log "Trying connection: $conn_name (timeout: ${timeout}s)..."

  nmcli connection up "$conn_name" 2>/dev/null &
  local pid=$!

  for ((i=0; i<timeout; i++)); do
    sleep 1
    if nmcli -t -f GENERAL.STATE device show "$AP_IFACE" 2>/dev/null | grep -q "100 (connected)"; then
      kill "$pid" 2>/dev/null || true
      log "Connected via: $conn_name"
      return 0
    fi
  done

  kill "$pid" 2>/dev/null || true
  nmcli connection down "$conn_name" 2>/dev/null || true
  log "Failed to connect via: $conn_name"
  return 1
}

get_home_network() {
  nmcli -t -f NAME,TYPE connection show --order name \
    | grep ':802-11-wireless' \
    | head -1 \
    | cut -d: -f1
}

get_all_wifi_connections() {
  nmcli -t -f NAME,TYPE,TIMESTAMP connection show --order timestamp \
    | grep ':802-11-wireless:' \
    | cut -d: -f1
}

on_success() {
  local ip
  ip=$(hostname -I | awk '{print $1}')
  log "Network connected. IP: $ip"
  echo "{\"state\":\"connected\",\"ip\":\"$ip\"}" > "$STATUS_FILE"
  rm -f "$FORCE_AP_FLAG"
  log "Starting game-show-server via pm2..."
  PORTAL_USER=$(stat -c '%U' /opt/wifi-provision)
  PM2_BIN=$(find /home/$PORTAL_USER/.npm-global/bin /usr/local/bin -name pm2 2>/dev/null | head -1 || true)
  [[ -n "$PM2_BIN" ]] && sudo -u "$PORTAL_USER" "$PM2_BIN" start game-show-server 2>/dev/null || true
}

main() {
  log "=== Wi-Fi Provision starting ==="

  if [[ -f "$FORCE_AP_FLAG" ]]; then
    log "Force-AP flag detected. Skipping network attempts."
    start_ap
    start_portal
    wait
    return
  fi

  HOME_NET=$(get_home_network || true)

  if [[ -n "$HOME_NET" ]]; then
    if try_connect "$HOME_NET" "$HOME_NETWORK_TIMEOUT"; then
      on_success
      return
    fi
  else
    log "No saved Wi-Fi connections found."
  fi

  log "Trying other saved networks..."
  while IFS= read -r conn; do
    [[ "$conn" == "$HOME_NET" ]] && continue
    if try_connect "$conn" "$SAVED_NETWORK_TIMEOUT"; then
      on_success
      return
    fi
  done < <(get_all_wifi_connections)

  log "All network attempts failed. Entering AP mode."
  echo '{"state":"ap_mode"}' > "$STATUS_FILE"

  start_ap
  start_portal

  log "Waiting for provisioning to complete..."
  while true; do
    sleep 3
    if [[ -f "$STATUS_FILE" ]]; then
      state=$(python3 -c "import json,sys; print(json.load(open('$STATUS_FILE')).get('state',''))" 2>/dev/null || echo "")
      if [[ "$state" == "connected" ]]; then
        log "Provisioning succeeded. Shutting down AP in 5 seconds..."
        sleep 5
        cleanup_ap
        on_success
        return
      fi
    fi
  done
}

trap cleanup_ap EXIT ERR

main
