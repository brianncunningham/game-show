# Buzzer Implementation Plan

## Goal

Build buzzer system without hardware first.

## Phases

### Phase 1 - Protocol
Define message structure and state machine.

### Phase 2 - Judge-controller
- Implement state machine
- Accept simulated buzz input
- Emit events

### Phase 3 - App Integration
- Send ARM / RESET
- Receive events
- Log outputs

### Phase 4 - Diagnostics Page
- Show state
- Show event log
- Provide simulation buttons

### Phase 5 - Testing
- Validate lockout
- Validate state transitions

### Phase 6 - Hardware
- Add GPIO inputs
- Reuse same logic path

## Responsibilities

### Judge
- Buzz acceptance
- Lockout logic
- State transitions

### App
- Mapping
- UI
- Scorekeeping

## Acceptance Criteria

- Judge runs locally
- App connects
- Simulated buzz works
- First buzz wins
- Lockout works