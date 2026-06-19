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
