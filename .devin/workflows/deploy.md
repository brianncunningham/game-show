---
description: Deploy latest code to VPS
---

1. Commit and push local changes to GitHub:
```
git add -A && git commit -m "your message" && git push
```

2. SSH into the VPS and pull, build both client and server, restart:
```
ssh brian@100.115.11.8 "cd ~/.openclaw/workspace/projects/game-show && git pull && npm install && npm run build && cd server && npm install && npm run build && cd .. && ~/.npm-global/bin/pm2 restart game-show-server --update-env"
```

3. Verify both processes are healthy:
```
ssh brian@100.115.11.8 "~/.npm-global/bin/pm2 list"
```

URLs after deploy:
- Show screen: https://srv1461086.tail71c584.ts.net/show
- Host page:   https://srv1461086.tail71c584.ts.net/host
- Admin page:  https://srv1461086.tail71c584.ts.net/gameadmin

## Tailscale serve routing (IMPORTANT — shared VPS)

This VPS (srv1461086) also runs `openclaw` (port 18789) and `hermes` (port 9119)
dashboards. All three share one Tailscale Serve config on the same hostname:

```
https://srv1461086.tail71c584.ts.net (tailnet only)
|-- /         proxy http://localhost:3001    (game-show)
|-- /hermes   proxy http://127.0.0.1:9119    (hermes dashboard)
|-- /openclaw proxy http://127.0.0.1:18789   (openclaw dashboard)
```

**Do NOT run** `tailscale serve --bg http://127.0.0.1:18789` (or any bare
`tailscale serve --bg <target>` without `--set-path`) — it resets the `/`
route and silently breaks the game-show app for everyone. This has happened
before (agent sessions restarting the openclaw dashboard).

To restart/re-point a specific service without touching the others, always
use `--set-path`:
```
tailscale serve --bg --set-path /openclaw http://127.0.0.1:18789
tailscale serve --bg --set-path /hermes http://127.0.0.1:9119
tailscale serve --bg http://localhost:3001   # game-show owns "/", the default
```

Check current state any time with: `ssh brian@100.115.11.8 "tailscale serve status"`
