# Buzzer System Architecture

## Purpose

This project adds a buzzer subsystem to the game show app.

The buzzer subsystem must support:
- app-driven window control (open, arm, close, reset)
- a local judge-controller that determines first valid buzz per window
- eligibility filtering per window (for steal rounds)
- early-buzz penalty detection (for steal countdown)
- hardware-independent integration at first
- simulated inputs before real hardware inputs
- future Raspberry Pi GPIO support
- an in-app buzzer diagnostics page

## High-Level Architecture

The system is split into three layers:

1. **App** — game logic, UI, scoring
2. **Judge-controller** — window policy, buzz acceptance
3. **Input sources** — simulation, GPIO, phone clients

### App
- Creates and manages buzzer windows (open / arm / close / reset)
- Assigns `eligibleControllers` per window (all teams initially; exclude wrong teams for steals)
- Sets `earlyBuzzPenalty` for steal windows
- Receives judge events and resolves `controllerId` → player → team
- Owns scoring and UI

### Judge-controller
- Holds at most one active `BuzzerWindow` at a time
- Applies the window state machine (WAITING → ARMED → LOCKED)
- Checks eligibility per window
- Emits `BUZZ_EARLY` for pre-arm buzzes when penalty is enabled
- Does **not** know game rules — the app decides eligibility

### Input Sources
- **Simulation** (implemented — `/api/buzzer/simulate/:controllerId`)
- **GPIO buttons** (future — same `receiveBuzz()` entry point)
- **Phone clients** (future — same `receiveBuzz()` entry point)

## Design Principles

- Protocol-first design
- Hardware-independent judge
- App owns mapping (controller → player → team)
- App owns eligibility decisions (which controllers may buzz)
- Judge owns timing, lockout, and window state
- App owns presentation and scoring

## Window State Machine

```
  WAITING ──(ARM_WINDOW)──► ARMED ──(first accepted buzz)──► LOCKED
     │                        │                                  │
     └───(CLOSE_WINDOW / RESET)─────────────────────────────────┘
                              ▼
                        (no active window — IDLE)
```

States per window:
- **WAITING** — window open, not yet armed (pre-song or pre-steal)
- **ARMED** — accepting buzzes; first eligible buzz wins
- **LOCKED** — winner decided; no further buzzes accepted

When there is no active window the judge is effectively **IDLE**.

## Data Flow

```
Input Source ──receiveBuzz()──► Judge ──events──► App (WebSocket)
App ──commands──► Judge (HTTP POST)
```

## Development Sequence

1. Define protocol ✓
2. Build judge-controller with simulation ✓
3. Connect app ✓
4. Build diagnostics page ✓
5. Evolve to window-based protocol ✓
6. App integration of open/arm/close per song round (next)
7. Add GPIO hardware input (later)
8. Add phone client input (later)