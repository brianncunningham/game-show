# Buzzer Implementation Plan

## Goal

Build buzzer system without hardware first, then extend to real inputs.

## Phases

### Phase 1 - Protocol ✓
Define message structure and state machine.

### Phase 2 - Judge-controller ✓
- Implement ARM/RESET state machine
- Accept simulated buzz input
- Emit events over WebSocket

### Phase 3 - App Integration ✓
- Send ARM / RESET
- Receive events
- Log outputs

### Phase 4 - Diagnostics Page ✓
- Show state
- Show event log
- Provide simulation buttons
- Show controller assignments

### Phase 5 - Testing ✓
- Validate lockout
- Validate state transitions

### Phase 6 - Window-based Protocol ✓
- Evolve to `BuzzerWindow` model
- Add `OPEN_WINDOW`, `ARM_WINDOW`, `CLOSE_WINDOW`, `RESET`
- Add `eligibleControllers` per window
- Add `earlyBuzzPenalty` for steal countdown detection
- Expand rejection reasons: `NOT_ARMED`, `LOCKED`, `INELIGIBLE`, `DISABLED`, `UNKNOWN_CONTROLLER`
- Add `BUZZ_EARLY` event for pre-arm penalty buzzes
- Add `windowId` to all events
- Keep legacy `/arm` endpoint working during migration

### Phase 7 - App Song-Round Integration ✓
- On song select: call `POST /open-window` (all controllers eligible) + immediately `POST /arm-window`
- On BUZZ_ACCEPTED: judge resolves `controllerId` → teamId via `POST /api/game-show/buzz/controller/:id`; Spotify pauses
- On wrong answer: call `POST /close-window`, open steal window with reduced eligibility and `earlyBuzzPenalty: true`
- On steal resume (Spotify Resume button): `POST /arm-window` for the active steal window
- On steal fail (more stealers remain): open next steal window; on no stealers: `POST /reset`
- On correct / steal success: `POST /reset` (judge returns to idle)
- Manual mode: unchanged — no judge calls made

### Phase 8 - Hardware (later)
- Add GPIO input source
- Reuse same `receiveBuzz()` entry point — no judge changes needed

### Phase 9 - Phone clients (later)
- Phone claims controller assignment
- Sends buzz via WebSocket or HTTP
- Same `receiveBuzz()` entry point

## Responsibilities

### Judge
- Window state machine (WAITING / ARMED / LOCKED)
- Eligibility enforcement
- Early-buzz detection
- Timing (elapsedMs)
- Lockout

### App
- Window lifecycle (open / arm / close / reset)
- Eligibility list construction (exclude wrong teams)
- Controller → player → team resolution
- Scoring and UI
- Penalty application for BUZZ_EARLY

## Acceptance Criteria

- Judge runs locally ✓
- App connects ✓
- Simulated buzz works ✓
- First buzz wins ✓
- Lockout works ✓
- Window-based protocol implemented ✓
- Steal windows with eligibility filtering ✓
- Early-buzz penalty detection (judge emits BUZZ_EARLY; app penalty UI pending Phase 10)