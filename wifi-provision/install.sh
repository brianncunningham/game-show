#!/bin/bash
# Run this script on the Raspberry Pi as root (or with sudo).
# Usage: sudo bash install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Installing Wi-Fi Provisioning System ==="

# 1. Install system dependencies
echo "[1/7] Installing packages..."
apt-get update -q
apt-get install -y hostapd dnsmasq avahi-daemon

# Disable hostapd and dnsmasq as persistent services — the script controls them
systemctl disable hostapd 2>/dev/null || true
systemctl disable dnsmasq 2>/dev/null || true
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# 2. Copy portal app
echo "[2/7] Installing portal app..."
mkdir -p /opt/wifi-provision/public
cp "$SCRIPT_DIR/server.js" /opt/wifi-provision/
cp "$SCRIPT_DIR/package.json" /opt/wifi-provision/
cp "$SCRIPT_DIR/public/index.html" /opt/wifi-provision/public/
cd /opt/wifi-provision && npm install --omit=dev
cd "$SCRIPT_DIR"

# 3. Copy config files
echo "[3/7] Installing config files..."
cp "$SCRIPT_DIR/hostapd.conf" /etc/hostapd/hostapd.conf
cp "$SCRIPT_DIR/dnsmasq-ap.conf" /etc/dnsmasq.d/ap.conf

# 4. Install scripts
echo "[4/7] Installing scripts..."
cp "$SCRIPT_DIR/wifi-provision.sh" /usr/local/bin/wifi-provision.sh
cp "$SCRIPT_DIR/wifi-provision-success.sh" /usr/local/bin/wifi-provision-success.sh
chmod +x /usr/local/bin/wifi-provision.sh
chmod +x /usr/local/bin/wifi-provision-success.sh

# 5. Create state directory
echo "[5/7] Creating state directory..."
mkdir -p /var/lib/wifi-provision
REAL_USER=${SUDO_USER:-$(whoami)}
chown "$REAL_USER:$REAL_USER" /var/lib/wifi-provision

# 6. Install and enable systemd service
echo "[6/7] Installing systemd service..."
cp "$SCRIPT_DIR/wifi-provision.service" /etc/systemd/system/wifi-provision.service
systemctl daemon-reload
systemctl enable wifi-provision.service

# 7. Configure avahi for gameshow.local
echo "[7/7] Configuring mDNS hostname..."
CURRENT_HOSTNAME=$(hostname)
if [[ "$CURRENT_HOSTNAME" != "gameshow" ]]; then
  echo "Note: Pi hostname is '$CURRENT_HOSTNAME'. For 'gameshow.local' to work, set hostname to 'gameshow'."
  echo "      Run: sudo hostnamectl set-hostname gameshow"
  echo "      (Optional — gameshow.local works via avahi as long as avahi-daemon is running)"
fi
systemctl enable avahi-daemon
systemctl start avahi-daemon

echo ""
echo "=== Installation complete ==="
echo ""
echo "On next boot, the provisioning service will run automatically."
echo ""
echo "To test AP mode without rebooting:"
echo "  sudo touch /var/lib/wifi-provision/force-ap"
echo "  sudo systemctl restart wifi-provision"
echo ""
echo "To check status:"
echo "  journalctl -u wifi-provision -f"
echo ""
echo "Portal URL (AP mode): http://192.168.4.1:8080"
echo "Portal URL (home net): http://$(hostname -I | awk '{print $1}'):8080"
