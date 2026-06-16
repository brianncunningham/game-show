# Game Show — Multi-Mode Architecture Refactor Plan

## Background & Context

The current app is a single-purpose "Name That Tune" game show. All game logic, state, UI, and question data is hardcoded for that one game type. The goal of this refactor is to make the architecture **pluggable** — supporting multiple game modes (e.g. Name That Tune, Family Feud, Trivia) without duplicating infrastructure, and without changing the URLs used during a show.

This document is the authoritative implementation plan. It includes decisions made, things explicitly ruled out, and open questions resolved during planning.

---

## Core Architecture Decisions

### URLs stay the same across all game modes
- `/show` — always renders the show display for whatever mode is active
- `/host` — always renders the host controls for whatever mode is active
- `/gameadmin` — always renders the admin/content manager for whatever mode is active
- No mode-specific URLs. The active mode is stored server-side; all pages are dumb consumers that render based on it.

### Mode selection lives on `/gameadmin` only
- The host page (`/host`) never shows mode selection — preserving full screen real estate for gameplay info
- Mode is a persistent server setting. On boot, the server restores the last active mode.
- Changing mode on `/gameadmin` triggers a confirmation dialog ("This will reset the current game. Continue?") and then switches mode. No ability to return to the previous game state after switching.
- Last-used mode is persisted per browser session on `/gameadmin`.

### When mode changes, the intro screen is shown first on `/show`
- After a mode switch is confirmed, `/show` immediately transitions to the new mode's intro screen
- This gives the audience a themed "reveal" moment before gameplay begins
- The host triggers progression from the intro screen via `/host` as normal

### Socket events are namespaced by mode
- All socket events are prefixed with the mode ID: `ntt:state_update`, `feud:state_update`, etc.
- Clients subscribe to the namespace matching the active mode
- When mode switches, clients re-subscribe to the new namespace
- Prevents stale events from a previous mode bleeding through and makes adding new modes collision-safe

### Phone clients removed from scope
- The phone-as-buzzer feature is not being carried forward
- Simplifies socket surface and eliminates the locked-screen UX problem
- Physical buzzers (Pico hardware) remain the only input method

---

## What Is NOT Changing

The following are already game-agnostic and require no modification:

- **Pico firmware** — sends button presses, receives LED commands. Zero game logic. No changes needed.
- **Pi role** — just runs the Node.js server. Not "baked in" to any game type.
- **`JudgeController`** (`server/src/buzzer/judgeController.ts`) — manages buzz windows, eligibility, early buzz penalties. Already fully generic.
- **Buzzer hardware stack** — `buzzerSocket.ts`, `buzzerRoutes.ts`, `inputs/` — unchanged.
- **WebSocket manager** (`webSocketManager.ts`) — unchanged.
- **Wand test screen** — hardware diagnostic, fully shared across all modes.
- **Known players service** — shared infrastructure.
- **Spotify integration** — shared, mode-agnostic.
- **LED system (Pi serial)** — shared. Per-mode LED event maps are layered on top (see Phase 4).

---

## What Each Game Mode Owns

Each mode is a self-contained module that provides:

- **Server:** store (state machine), routes, types
- **Client:** `HostComponent`, `ShowComponent`, admin section
- **Config:** LED event→effect map, scoring config
- **Data:** question/content schema, save files in mode-specific folder
- **Screens:** intro, rules, victory, elimination (all themed per mode)
- **Practice mode:** each mode has its own practice mode flag/behavior

Shared across all modes:
- Team setup shell (with pluggable sorter — see below)
- Save manager shell (filters saves by current mode)
- Wand test
- Known players
- Socket infrastructure

---

## Implementation Phases

### Phase 1 — Reorganize into Mode Structure

**Goal:** Pure reorganization — no logic changes. Establish the folder structure.

**Server:**
```
server/src/
  modes/
    nameThatTune/
      store.ts        ← current gameShowStore.ts (renamed, no changes)
      routes.ts       ← current gameShowRoutes.ts (renamed, no changes)
      types.ts        ← current types/gameShow.ts (renamed, no changes)
  shared/
    buzzer/           ← current buzzer/ (unchanged)
    services/
      webSocketManager.ts
      gameShowSocket.ts
      gameSaveService.ts
      knownPlayersService.ts
    index.ts          ← current server entry point (minimal changes)
```

**Client:**
```
src/
  modes/
    nameThatTune/
      ← all current src/features/gameShow/ components (renamed, no changes)
      api.ts, types.ts, useGameShowState.ts
  shared/
    ← team setup, save manager shell, wand test, known players
```

**Question/save data:**
```
game-data/
  name-that-tune/
    ← current game-saves/ contents, renamed with ntt- prefix
  family-feud/        ← empty, ready for Phase 5
```

---

### Phase 2 — Define the Game Engine Interface

**Goal:** Create the TypeScript contract every mode must implement. Wire up the server and client shells to consume it.

**Game mode interface (server):**
```ts
interface GameModeServer {
  id: string                          // e.g. 'ntt', 'feud'
  displayName: string                 // e.g. 'Name That Tune'
  createStore(): GameModeStore
  mountRoutes(router: Router, store: GameModeStore, judge: JudgeController): void
  ledEventMap: LedEventMap            // mode-specific game event → LED effect mappings
  scoringConfig: ScoringConfig        // mode-specific scoring rules
}
```

**Game mode interface (client):**
```ts
interface GameModeClient {
  id: string
  displayName: string
  HostComponent: React.FC
  ShowComponent: React.FC
  AdminComponent: React.FC
  setupScreens: SetupFlow             // team setup, content load, etc.
}
```

**Server `index.ts`:**
- Maintains `activeMode: string` in server state (persisted to disk)
- Loops over registered modes, mounts their routes under `/api/game-show/[modeId]/`
- Exposes `/api/mode` GET (current mode) and POST (switch mode, with reset)

**Client routing:**
- `/show`, `/host`, `/gameadmin` each fetch active mode from server on mount
- Render the appropriate component from the registered mode's client definition
- Socket re-subscription happens automatically on mode change

---

### Phase 3 — Mode Selection & Admin Polish

**Goal:** Make mode switching work end-to-end through `/gameadmin`.

- Mode selector at the top of `/gameadmin` (dropdown or tab strip)
- Switching mode: confirmation dialog → server reset → server switches mode → `/show` auto-transitions to new mode's intro screen → `/gameadmin` re-renders with new mode's admin section
- Last-used mode persisted in localStorage on `/gameadmin`
- Save manager filters displayed saves by current active mode
- Save files are tagged with `modeId` in their JSON — save manager uses this to filter

**Named saves:** Already implemented in current app. Ensure mode tag is written on save and used as a filter. No other changes needed.

---

### Phase 4 — NTT-Specific Cleanup During Reorganization

**Goal:** While reorganizing, make the shared infrastructure genuinely pluggable rather than just copied.

- **Pluggable team sorter:** Shared default = current ball-draw randomizer. Each mode can optionally provide its own `TeamSorterComponent`. If not provided, falls back to shared default. (Family Feud may eventually want a "two families walk in" intro flow instead.)
- **Per-mode screens:** NTT keeps all its current intro, rules, victory, elimination screens. These move into `modes/nameThatTune/` as-is.
- **Per-mode LED event map:** NTT's current hardcoded LED mappings become an explicit `ledEventMap` config object on the NTT mode definition. Other modes declare their own.
- **Practice mode:** Scoped per mode. NTT keeps its current practice mode behavior.
- **Multiplier/scoring config:** NTT's current multiplier logic becomes an explicit `scoringConfig` on the NTT mode definition.

---

### Phase 5 — Family Feud Mode

**Prerequisite:** Phases 1–4 complete.

**Step 1 — Design game mechanics first (before any code):**
- Face-off rules (how the winning buzzer is determined)
- Strike system (3 strikes → pass/steal)
- Board reveal mechanic
- Scoring (points per answer revealed, bonus for sweep, etc.)
- Round structure
- Team constraints (exactly 2 teams for Feud)

**Step 2 — Implement:**
- `modes/familyFeud/` server store, routes, types
- `modes/familyFeud/` client components (host controls, show board, answer board reveal, strike display, family intro)
- LED event map for Feud-specific events (strike, board reveal, sweep, etc.)
- Admin/content manager for Feud questions
- Game-specific team sorter if desired

**Step 3 — Content import:**
- Define Google Sheet structure for Feud survey data (categories, answers, point values, round assignments)
- CSV import format mirrors the existing NTT Quick CSV Import pattern
- Implement Feud-specific CSV parser in admin

**Note:** Do not design the Feud content import format until Step 1 (game mechanics) is complete. The sheet structure depends on the game structure.

---

## Explicitly Out of Scope

- **Phone clients / mobile buzzer** — removed entirely
- **BUZZ_DOWN / BUZZ_UP events on Pico** — not needed; current tap-only input is sufficient
- **Clock mechanic changes** — current implementation stays as-is
- **Pre-game audience vote on mode** — nice-to-have, can be added as a special intro screen later if desired
- **Content import for Family Feud** — deferred until Feud game mechanics are fully designed (Phase 5 Step 1)

---

## Open Items / Future Considerations

- **Spectator/audience reveal moment:** If you ever want the audience to see game mode selection as a show moment (e.g. dramatic reveal of "Tonight we're playing..."), this is handled by the mode's intro screen being shown immediately on mode switch — no separate screen needed.
- **Google Sheets integration:** Currently NTT content is authored in Google Sheets and pasted as CSV. This pattern should be replicated per mode. The import plumbing (CSV paste → parse → save) can be shared infrastructure; only the field mapping differs per mode.
- **Trivia mode:** Not designed yet. Would follow the same Phase 5 pattern — design mechanics first, then implement.
- **Team sorter per mode:** Not a current requirement. The pluggable hook (Phase 4) makes it easy to add later without rearchitecting.

---

## File Reference (Current → New)

| Current | New Location |
|---|---|
| `server/src/services/gameShowStore.ts` | `server/src/modes/nameThatTune/store.ts` |
| `server/src/routes/gameShowRoutes.ts` | `server/src/modes/nameThatTune/routes.ts` |
| `server/src/types/gameShow.ts` | `server/src/modes/nameThatTune/types.ts` |
| `server/src/buzzer/` | `server/src/shared/buzzer/` (unchanged) |
| `src/features/gameShow/` | `src/modes/nameThatTune/` |
| `game-saves/` | `game-data/name-that-tune/` |
