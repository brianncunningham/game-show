# Buzzer Protocol — v2 (Window-based)

## Purpose

This document defines the message contract between the main app and the judge-controller.

**Protocol v2** replaces the simple ARM/RESET model with a _window-based_ model that supports
multi-round buzzing, steal opportunities, eligibility filtering, and early-buzz penalties.

Design goals:
- Small, explicit messages
- Every message has a `type` and `timestamp`
- Judge emits `controllerId` only — the app resolves player/team
- Easy to log in raw form and debug

Transport: WebSocket (judge → app events) + HTTP POST (app → judge commands).

---

## Message Envelope

```json
{
  "type": "MESSAGE_TYPE",
  "timestamp": "2026-04-11T12:00:00.000Z",
  "payload": { ... }
}
```

---

## Core Concept: BuzzerWindow

A `BuzzerWindow` represents a single buzzing opportunity (one song, or one steal round).

```ts
interface BuzzerWindow {
  windowId: string;              // app-assigned stable ID, e.g. "song-42-initial" or "song-42-steal-1"
  eligibleControllers: string[]; // controllers allowed to buzz; [] = all eligible
  earlyBuzzPenalty: boolean;     // if true, pre-arm buzzes emit BUZZ_EARLY instead of silent reject
}
```

The judge holds **at most one active window** at a time.

### Window State Machine

```
  WAITING ──(ARM_WINDOW)──► ARMED ──(first accepted buzz)──► LOCKED
     │                        │                                  │
     └───(CLOSE_WINDOW / RESET)─────────────────────────────────┘
                              ▼
                        (no active window — IDLE)
```

- **WAITING**: window open, song not yet resumed. Pre-arm buzzes may earn a penalty.
- **ARMED**: song resumed. First eligible buzz wins.
- **LOCKED**: winner accepted. No further buzzes accepted until window is closed.

---

## App → Judge Commands (HTTP POST `/api/buzzer/*`)

### `POST /open-window`

Opens a new buzzing window in **WAITING** state. Any existing window is closed first.

```json
{
  "windowId": "song-42-initial",
  "eligibleControllers": ["1", "2", "3", "4", "5", "6", "7", "8"],
  "earlyBuzzPenalty": false
}
```

Use this when a song is selected, before the clip starts playing.

---

### `POST /arm-window`

Transitions the active window **WAITING → ARMED**. Song has resumed; valid buzzes are now accepted.

```json
{ "windowId": "song-42-initial" }
```

---

### `POST /close-window`

Closes the active window **without a winner**. Use when:
- A wrong answer is given and a steal window will follow
- A round ends with no valid buzz

```json
{ "windowId": "song-42-initial" }
```

After closing, open a new steal window with updated `eligibleControllers` (exclude the wrong team).

---

### `POST /reset`

Hard reset. Closes any active window and returns to clean idle. Use between songs or on host abort.

```json
{}
```

---

## Judge → App Events (WebSocket broadcast)

### `READY`
Judge is ready / connected.

---

### `WINDOW_STATE`
Emitted after every state transition. Used by diagnostics and app to track current window.
```json
{
  "windowId": "song-42-initial",
  "windowState": "ARMED"
}
```
`windowState` is one of: `WAITING` | `ARMED` | `LOCKED` | `IDLE` (when no window is open).

---

### `BUZZ_RECEIVED`
Raw event — emitted for **every** buzz input regardless of outcome.
```json
{
  "windowId": "song-42-initial",
  "controllerId": "7"
}
```
`windowId` is `null` if no window is active.

---

### `BUZZ_EARLY`
Buzz arrived before the window was armed, and `earlyBuzzPenalty` is `true`.
The app decides what penalty to apply (e.g. 5-second lockout before steal countdown).
```json
{
  "windowId": "song-42-steal-1",
  "controllerId": "3"
}
```

---

### `BUZZ_ACCEPTED`
First valid buzz in an ARMED window. Window transitions to LOCKED.
```json
{
  "windowId": "song-42-initial",
  "controllerId": "7",
  "elapsedMs": 412
}
```

---

### `BUZZ_REJECTED`
Buzz did not result in acceptance.
```json
{
  "windowId": "song-42-initial",
  "controllerId": "7",
  "reason": "INELIGIBLE"
}
```

**Rejection reasons:**

| Reason               | Meaning |
|----------------------|---------|
| `NOT_ARMED`          | Window is WAITING, no earlyBuzzPenalty set |
| `LOCKED`             | Window already has a winner |
| `INELIGIBLE`         | Controller not in `eligibleControllers` for this window |
| `DISABLED`           | No active window (judge is idle) |
| `UNKNOWN_CONTROLLER` | Reserved for future app-side validation |

---

### `WINDOW_CLOSED`
The active window was closed without a winner (via `CLOSE_WINDOW` or `RESET`).
```json
{ "windowId": "song-42-initial" }
```

---

## Steal Window Flow

A steal round is a new window with a restricted `eligibleControllers` list (excluding teams that
have already guessed wrong for this song).

```
App                                     Judge
 │                                        │
 ├─ POST /open-window ──────────────────► │  windowId="song-42-initial", eligible=all, penalty=false
 │                                        │  WINDOW_STATE { WAITING }
 ├─ POST /arm-window ───────────────────► │  [song resumes]
 │                                        │  WINDOW_STATE { ARMED }
 │                                        │ ◄── BUZZ_ACCEPTED { controllerId="3", elapsedMs=280 }
 │                                        │  WINDOW_STATE { LOCKED }
 │  [team B guesses wrong]                │
 ├─ POST /close-window ──────────────────► │
 │                                        │  WINDOW_CLOSED
 │                                        │  WINDOW_STATE { IDLE }
 ├─ POST /open-window ──────────────────► │  windowId="song-42-steal-1", eligible=[excl. team B], penalty=true
 │                                        │  WINDOW_STATE { WAITING }
 │  [steal countdown starts]              │
 │  [player buzzes early]                 │ ◄── BUZZ_RECEIVED
 │                                        │ ◄── BUZZ_EARLY { controllerId="7" }  ← app applies penalty
 ├─ POST /arm-window ───────────────────► │  [song resumes]
 │                                        │  WINDOW_STATE { ARMED }
 │                                        │ ◄── BUZZ_ACCEPTED { controllerId="12", elapsedMs=94 }
 │                                        │  WINDOW_STATE { LOCKED }
 ├─ POST /reset ─────────────────────────► │  [song scored, clean up]
```

---

## Legacy / Backward Compatibility

The `/arm` endpoint still works: it opens a catch-all `legacy-arm` window (all controllers
eligible, no early penalty) and immediately arms it — identical to the old behaviour.
It is **deprecated**; migrate to `/open-window` + `/arm-window`.
