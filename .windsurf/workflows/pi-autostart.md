---
description: Set up systemd service on Pi for plug-and-play game server with HARDWARE_INPUT
---

## Prerequisites
- Pi has the latest code pulled: `cd ~/game-show && git pull && cd server && npm run build`
- Server runs manually: `HARDWARE_INPUT=1 node server/dist/index.js`

## 1. Create the service file on the Pi

```bash
sudo nano /etc/systemd/system/game-show.service
```

Paste:

```ini
[Unit]
Description=Game Show Server
After=network.target

[Service]
Type=simple
User=bcunningham2
WorkingDirectory=/home/bcunningham2/game-show
Environment=HARDWARE_INPUT=1
Environment=PORT=3001
ExecStart=/usr/bin/node server/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable game-show
sudo systemctl start game-show
```

## 3. Verify it's running

```bash
sudo systemctl status game-show
journalctl -u game-show -f
```

## 4. After code updates (git pull + rebuild)

```bash
cd ~/game-show && git pull
cd server && npm run build
sudo systemctl restart game-show
```

## 5. Install mpremote for flashing the Pico from the Pi

```bash
pip3 install mpremote --break-system-packages
```

Verify: `python3 -m mpremote --version`

## 6. Flash updated Pico firmware from the Pi

After any change to `pico/buzz_pico/main.py`:

```bash
cd ~/game-show && git pull
sudo systemctl stop game-show
python3 -m mpremote connect /dev/ttyACM0 fs cp pico/buzz_pico/main.py :main.py
python3 -m mpremote connect /dev/ttyACM0 reset
sudo systemctl start game-show
```

The server must be stopped before flashing — both compete for `/dev/ttyACM0`.

## Notes
- Buzz Pico must be plugged into the Pi's USB port before or after boot — the server will retry the serial port every 3s on disconnect
- If the Pico is on a different port than `/dev/ttyACM0`, set `PICO_PORT=/dev/ttyACM1` in the service Environment lines
- To check which port: `ls /dev/ttyACM*`
