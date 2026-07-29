#!/bin/bash
# Pre-registers a Wi-Fi network as a saved NetworkManager connection,
# WITHOUT requiring the Pi to currently be in range of it.
#
# This lets you add a venue's network to the "accepted list" ahead of time,
# so wifi-provision.sh picks it up at boot instead of falling back to AP mode.
#
# Usage:
#   sudo bash add-network.sh "SSID" ["PASSWORD"]
#
# Examples:
#   sudo bash add-network.sh "Delta_CONF"              # open network, no password
#   sudo bash add-network.sh "MyHotel" "hotelpassword"  # WPA/WPA2 network

set -euo pipefail

SSID="${1:-}"
PASSWORD="${2:-}"
AP_IFACE="wlan0"

if [[ -z "$SSID" ]]; then
  echo "Usage: sudo bash add-network.sh \"SSID\" [\"PASSWORD\"]" >&2
  exit 1
fi

if nmcli -t -f NAME connection show | grep -Fxq "$SSID"; then
  echo "A connection named \"$SSID\" already exists. Delete it first with:"
  echo "  nmcli connection delete \"$SSID\""
  exit 1
fi

if [[ -n "$PASSWORD" ]]; then
  nmcli connection add type wifi con-name "$SSID" ifname "$AP_IFACE" ssid "$SSID" \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PASSWORD"
else
  nmcli connection add type wifi con-name "$SSID" ifname "$AP_IFACE" ssid "$SSID"
fi

echo "Added \"$SSID\" to saved networks. It will be tried automatically on next boot."
