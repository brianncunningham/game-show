# Buzzer System Architecture

## Purpose

This project adds a buzzer subsystem to the game show app.

The buzzer subsystem must support:
- app-driven arming and reset
- a local judge-controller that determines first valid buzz
- hardware-independent integration at first
- simulated inputs before real hardware inputs
- future Raspberry Pi GPIO support
- an in-app buzzer diagnostics page

## High-Level Architecture

The system is split into:

1. App
2. Judge-controller
3. Input sources

### App
- Sends control signals (ARM, RESET)
- Receives buzzer events
- Owns player/team mapping
- Owns UI and scoring

### Judge-controller
- Receives buzz inputs
- Determines winner
- Applies lockout rules
- Emits events to app
- Starts with simulation-only input

### Input Sources
- Simulation (first)
- GPIO buttons (later)
- Phone buzzers (optional later)

## Design Principles

- Protocol-first design
- Hardware-independent judge
- App owns mapping (controller → player → team)
- Judge owns timing and lockout
- App owns presentation

## State Machine

States:
- IDLE
- ARMED
- LOCKED

Transitions:
- IDLE → ARMED (on ARM)
- ARMED → LOCKED (on first buzz)
- LOCKED → IDLE (on RESET)

## Data Flow

Input → Judge → App

## Development Sequence

1. Define protocol
2. Build judge-controller (with simulation)
3. Connect app
4. Build diagnostics page
5. Add hardware later