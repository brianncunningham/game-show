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

### Phase 7 - App Song-Round Integration (next)
- On song select: call `POST /open-window` with `windowId` and all controllers eligible
- On song resume (after wrong answer): call `POST /arm-window`
- On wrong answer: call `POST /close-window`, then `POST /open-window` for steal with restricted eligibility
- On steal countdown: open new window with `earlyBuzzPenalty: true`
- On BUZZ_EARLY: apply in-app penalty (e.g. controller excluded from steal, or score deduction)
- On BUZZ_ACCEPTED: resolve `controllerId` → player → team, apply score
- On host abort / song end: call `POST /reset`

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
- Steal windows with eligibility filtering — app integration pending (Phase 7)
- Early-buzz penalty detection — implemented in judge, app handling pending (Phase 7)