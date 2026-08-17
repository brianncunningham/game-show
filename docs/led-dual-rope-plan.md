# LED Dual Rope (Front/Back) — Future Idea

> **Status: not scheduled.** This is a design note captured for later, not active work.

## Motivation

The crate has 20 buzzer ports. When all (or most) are in use, the port harness faces
players, and the current LED rope — wired around that same face — makes sense as-is.

When only 2-3 buzzers are in use, it's cleaner to turn the port harness to the side
*away* from players (hiding the cable clutter). But the LED light show should still
face players either way, which the current single rope can't do since it's physically
mounted to only one face of the crate.

## Plan

Add a second, fully independent LED rope mounted to the opposite face of the crate.

- Both ropes are **permanently wired** (not swapped in/out per event).
- Only one rope is **active** at a time.
- Active rope is selected either by game-mode default, or via a manual toggle in host
  settings — chosen for reliability over physically swapping a connector before a show
  (nothing to forget to plug in correctly under time pressure).

## Electrical

The RP2040 has 8 PIO state machines total (2 PIO blocks × 4 state machines each).
Today's firmware uses exactly 1: `StateMachine(0, ws2812, ...)` bound to `GP20`
(`LED_PIN = 20` in `pico/buzz_pico/main.py`).

The second rope needs its own GPIO pin and its own state machine
(e.g. `StateMachine(1, ws2812, ...)`) — plenty of headroom, no hardware bottleneck.

## Firmware changes (when this gets built)

In `pico/buzz_pico/main.py`:

- Generalize the current single hardcoded globals (`_sm`, `_ar`, `NUM_LEDS`, `SEGMENTS`)
  into a per-rope struct — one instance per rope, each with its own state machine, pixel
  buffer, LED count, and segment map.
- Each rope's `SEGMENTS` map must be measured independently after physical install —
  mounting/gluing differs between the two faces, so front and back segment boundaries
  won't line up with each other.
- Add a new control message so the Pi can select the active rope, e.g.:
  ```json
  {"event": "SET_ACTIVE_ROPE", "rope": "front"}
  ```
  Sent once at game/session setup, based on whichever port orientation the host picks
  for that event. All existing effect functions (`_tick_solid`, `_tick_pulse`, etc.)
  simply target whichever rope struct is currently active.

## Prerequisite cleanup (unrelated to this feature, but should happen regardless)

`NUM_LEDS = 320` in `pico/buzz_pico/main.py` is already stale: the strip was physically
clipped down since that value was set (it used to be over-provisioned with ~108 spare
LEDs routed "under the crate" and never visible). The `SEGMENTS` comment describing
"212–319 are under the crate" no longer reflects reality either. This should be
corrected to the actual current LED count before or alongside the dual-rope work.

## Related but separate: `pico/led_pico/`

There's a second firmware tree at `pico/led_pico/main.py` implementing an older design
where a *second physical Pico* received state over UART from the buzz Pico and drove
the LEDs itself. This doesn't match the current build — the buzz Pico now drives the
WS2812 strip directly (`GP20`) — so `led_pico/` appears to be leftover from an earlier
hardware iteration. It's unrelated to the dual-rope idea above (that's about two
*independent LED strips* on one Pico, not a second Pico) and hasn't been touched here.
