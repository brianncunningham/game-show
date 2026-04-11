# Buzzer Protocol

## Purpose

This document defines the message contract between the main app and the judge-controller.

Initial goal:
- simple
- explicit
- easy to debug
- transport-agnostic if possible

This protocol may eventually be used over WebSocket, HTTP, or local network transport.

## Design Rules

- Messages should be small and explicit.
- The judge-controller should emit `controllerId`, not resolved player/team data.
- The app is responsible for controller/player/team mapping.
- Every message should include a `type`.
- Messages should be easy to log in raw form and human-readable form.

## Suggested Message Envelope

All messages should follow a shape similar to:

```json
{
  "type": "MESSAGE_TYPE",
  "timestamp": "2026-04-11T12:00:00.000Z",
  "payload": {}
}