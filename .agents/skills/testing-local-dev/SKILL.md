---
name: testing-local-dev
description: Test the game-show app end-to-end locally. Use when verifying UI changes, server refactors, or WebSocket functionality.
---

# Testing the Game Show App Locally

## Prerequisites

- Node.js installed
- No external services required for basic testing (Spotify is optional, hardware buzzer is optional)

## Starting the Dev Environment

**Backend** (port 3001):
```bash
cd server && npm run dev
```

**Frontend** (port 4174, proxies to backend):
```bash
npm run dev
```

The Vite dev server proxies `/api/*` and `/ws/*` to `localhost:3001`.

## Key Pages to Test

| Route | Purpose | Key imports |
|-------|---------|-------------|
| `/show` | Audience-facing game board | WebSocket state, all display components |
| `/gameadmin` | Admin panel (team setup, content, saves) | Most components, API functions |
| `/host` | Host controls during game | 40+ API functions, shared view |
| `/buzzer-diagnostics` | Hardware buzzer testing | Buzzer API, game state hook |

## Verifying WebSocket Connectivity

The `/show` page connects to `ws://localhost:3001/ws/game-show` (proxied through Vite). To verify:
1. Open `/show` in the browser
2. Trigger a state change via API: `curl -X POST http://localhost:3001/api/game-show/scores/reset`
3. The score should update on `/show` in real-time without refresh

## Key API Endpoints

```
GET  /api/game-show/state          — Current game state
POST /api/game-show/start          — Start the game
POST /api/game-show/scores/reset   — Reset all scores to 0
POST /api/game-show/buzz/:teamId   — Buzz for a team
POST /api/game-show/answer/correct — Mark answer correct
GET  /api/game-show/saves          — List saved games
```

## State Persistence

- Game state persists to `game-state.json` at project root
- Game saves live in `game-data/name-that-tune/`
- Known players list at `known-players.json` at project root

To verify persistence: check state, restart server, check state again.

## Build Validation

```bash
npm run build          # Frontend: tsc + vite build
npm run build:server   # Server: tsc (from server/ dir)
```

Both must pass with 0 errors before creating a PR.

## Architecture Notes (Post Phase 1)

Server code is organized as:
- `server/src/modes/nameThatTune/` — Game-specific store, routes, types
- `server/src/shared/buzzer/` — Buzzer hardware/simulation, judge controller
- `server/src/shared/services/` — WebSocket manager, game socket, save service, known players

Client code is organized as:
- `src/modes/nameThatTune/` — All Name That Tune components, API, types, hooks
- `src/features/buzzer/` — Shared buzzer UI components
- `src/features/spotify/` — Spotify integration (optional)

## Devin Secrets Needed

None required for basic local testing. Spotify features require a Spotify Developer app configured, but this is optional.
