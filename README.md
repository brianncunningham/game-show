# Name That Tune — Game Show

Music game show app with a host control panel, admin setup, and audience display board.

## Routes
- `/show` — audience-facing board (put on screen via HDMI / screenshare)
- `/host` — host controls for running each round (use on tablet)
- `/gameadmin` — pre-game setup: teams, players, questions, rules

## Game content

Songs, Spotify IDs, and game CSV files are managed in Google Sheets:

**[Game Show Playlist & CSV Builder](https://docs.google.com/spreadsheets/d/1vUIxbrNS7_EwZCXnMvVfVXywJq5vMZLRNQf1g9b7b70/edit?gid=1514371114#gid=1514371114)**

Use it to:
- Build playlists and look up Spotify track IDs
- Generate CSV rows to import via `/gameadmin` → Import CSV Text

## Local development

```bash
# Terminal 1 — backend (Express + WebSocket on :3001)
cd server && npm run dev

# Terminal 2 — frontend (Vite on :4174, proxies /api and /ws to :3001)
npm run dev
```

## VPS deployment (Tailscale)

All devices (laptop showing `/show`, tablet running `/host`) connect via Tailscale. No public internet exposure needed.

```bash
# On the VPS — one-time setup
npm install
cd server && npm install && cd ..

# Build frontend + server
npm run build:all

# Run (single process serves everything on port 3001)
npm start
```

Then on each device:
1. Install Tailscale and join your tailnet
2. Open `http://<your-vps-tailscale-hostname>:3001/show` on the laptop
3. Open `http://<your-vps-tailscale-hostname>:3001/host` on the tablet

To run persistently on the VPS, use `pm2`:
```bash
npm install -g pm2
pm2 start "npm start" --name game-show
pm2 save
```

## Buzzer wand LED colors

Each wand has an addressable LED (WS2812) that reflects the current game state:

| Color | State | Meaning |
|---|---|---|
| Dim white | Idle | Waiting for a round to start |
| Blue | Armed | Song is playing — ready to buzz |
| Green | Winner | Your buzz was accepted — you buzzed first |
| Orange | Not winner | Someone else buzzed first |
| Red | Penalty | You buzzed too early (early-buzz penalty active) |
| Purple | Team failed | Your team answered wrong |

LEDs reset to white (idle) at the start of each new round.
