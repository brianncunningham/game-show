"""
Buzz Pico — main.py
Raspberry Pi Pico 2 WH

Responsibilities:
  - Watch 20 GPIO pins (GP0–GP19), one per buzzer button
  - On button press: send controller ID over USB serial to Pi (judge)
  - Receive state events from Pi over USB serial
  - Drive WS2812B LED strip on GP20 based on game state

Pin mapping:
  GP0–GP19  : buzzer buttons (controllers 1–20), active LOW with internal pull-up
  GP20      : WS2812B LED strip data out
  GND       : shared ground with buttons and LED strip

Wiring per button:
  One leg to GP pin, other leg to GND.
  Internal pull-up enabled — no external resistor needed.

USB serial protocol (Buzz Pico → Pi):
  {"controllerId":"1"}\n

USB serial protocol (Pi → Buzz Pico):
  {"event":"WINDOW_STATE","windowState":"ARMED"}\n
  {"event":"BUZZ_ACCEPTED","controllerId":"3","teamColor":[r,g,b]}\n
  {"event":"CORRECT","teamColor":[r,g,b]}\n
  {"event":"WRONG"}\n
  {"event":"STEAL","teamColor":[r,g,b]}\n
  {"event":"RESET"}\n
  {"event":"CLOCK_START","durationMs":30000}\n
  {"event":"CLOCK_STOP"}\n

LED segment map (update after physical install):
  Placeholder — all effects use full strip until segments are measured.
  SEGMENTS dict maps face name to (start_index, end_index) inclusive.
"""

import array
import json
import sys
import select
import rp2
from machine import Pin
from utime import ticks_ms, ticks_diff, sleep_ms

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEBOUNCE_MS = 50        # ms between registering presses on same button

# GP pin → controller ID (1-based)
BUTTON_MAP = {
    0:  "1",  1:  "2",  2:  "3",  3:  "4",
    4:  "5",  5:  "6",  6:  "7",  7:  "8",
    8:  "9",  9:  "10", 10: "11", 11: "12",
    12: "13", 13: "14", 14: "15", 15: "16",
    16: "17", 17: "18", 18: "19", 19: "20",
}

# ---------------------------------------------------------------------------
# LED configuration
# ---------------------------------------------------------------------------

LED_PIN    = 20
NUM_LEDS   = 320
BRIGHTNESS = 0.4   # 0.0–1.0

# Segment map — update these after physical install
# Format: (first_led_index, last_led_index) inclusive
# Placeholder: everything is "full strip" until measured
SEGMENTS = {
    "right":  (0,   79),   # bottom-right up to top-right  (~quarter)
    "top":    (80,  159),  # top-right across to top-left  (~quarter)
    "left":   (160, 239),  # top-left down to bottom-left  (~quarter)
    "bottom": (240, 319),  # bottom-left across to start   (~quarter)
}

# ---------------------------------------------------------------------------
# PIO WS2812B driver
# ---------------------------------------------------------------------------

@rp2.asm_pio(sideset_init=rp2.PIO.OUT_LOW, out_shiftdir=rp2.PIO.SHIFT_LEFT,
             autopull=True, pull_thresh=24)
def ws2812():
    T1 = 2
    T2 = 5
    T3 = 3
    wrap_target()
    label("bitloop")
    out(x, 1)               .side(0) [T3 - 1]
    jmp(not_x, "do_zero")   .side(1) [T1 - 1]
    jmp("bitloop")           .side(1) [T2 - 1]
    label("do_zero")
    nop()                    .side(0) [T2 - 1]
    wrap()

_sm = rp2.StateMachine(0, ws2812, freq=8_000_000, sideset_base=Pin(LED_PIN))
_sm.active(1)
_ar = array.array("I", [0] * NUM_LEDS)

def _show():
    dimmer = array.array("I", [0] * NUM_LEDS)
    for i, c in enumerate(_ar):
        r = int(((c >> 8)  & 0xFF) * BRIGHTNESS)
        g = int(((c >> 16) & 0xFF) * BRIGHTNESS)
        b = int(( c        & 0xFF) * BRIGHTNESS)
        dimmer[i] = (g << 16) | (r << 8) | b
    _sm.put(dimmer, 8)

def _set(i, rgb):
    _ar[i] = (rgb[1] << 16) | (rgb[0] << 8) | rgb[2]

def _fill(rgb, start=0, end=None):
    if end is None:
        end = NUM_LEDS - 1
    for i in range(start, end + 1):
        _set(i, rgb)

def _clear():
    _fill((0, 0, 0))
    _show()

# ---------------------------------------------------------------------------
# LED effects
# ---------------------------------------------------------------------------

OFF    = (0, 0, 0)
WHITE  = (255, 255, 255)
GREEN  = (0, 220, 60)
RED    = (220, 30, 0)
BLUE   = (0, 80, 255)
ORANGE = (255, 80, 0)
ARMED_COLOR = (0, 60, 180)  # dim blue when armed

def effect_idle():
    """All off."""
    _clear()

def effect_armed():
    """Dim blue pulse — judge is armed, waiting for buzz."""
    _fill(ARMED_COLOR)
    _show()

def effect_buzz(team_color):
    """Flash team color across full strip — someone buzzed in."""
    for _ in range(3):
        _fill(team_color)
        _show()
        sleep_ms(80)
        _clear()
        sleep_ms(60)
    _fill(team_color)
    _show()

def effect_correct(team_color):
    """Green wipe then hold team color."""
    for i in range(NUM_LEDS):
        _set(i, GREEN)
        if i % 8 == 0:
            _show()
    _show()
    sleep_ms(600)
    _fill(team_color)
    _show()
    sleep_ms(800)
    _clear()

def effect_wrong():
    """Red flash."""
    for _ in range(4):
        _fill(RED)
        _show()
        sleep_ms(120)
        _clear()
        sleep_ms(80)

def effect_steal(team_color):
    """Orange chase then team color."""
    for i in range(NUM_LEDS):
        _set(i, ORANGE)
        if i > 0:
            _set(i - 1, OFF)
        if i % 4 == 0:
            _show()
    _show()
    sleep_ms(300)
    _fill(team_color)
    _show()

def effect_reset():
    """White flash then off."""
    _fill(WHITE)
    _show()
    sleep_ms(300)
    _clear()

# ---------------------------------------------------------------------------
# LED test pattern state
# ---------------------------------------------------------------------------

_led_test_active  = False
_led_test_offset  = 0
_led_test_last_ms = 0
_LED_TEST_BULB    = 4   # LEDs per bulb
_LED_TEST_GAP     = 4   # LEDs between bulbs
_LED_TEST_STEP_MS = 30  # ms per frame
_LED_TEST_COLORS  = [(255,255,255), (255,200,0), (0,180,255), (0,255,100)]
_led_test_color_idx = 0
_led_test_color_ms  = 0
_LED_TEST_COLOR_INTERVAL = 2000  # ms per color cycle

def led_test_start():
    global _led_test_active, _led_test_offset, _led_test_last_ms, _led_test_color_idx, _led_test_color_ms
    _led_test_active    = True
    _led_test_offset    = 0
    _led_test_last_ms   = ticks_ms()
    _led_test_color_idx = 0
    _led_test_color_ms  = ticks_ms()

def led_test_stop():
    global _led_test_active
    _led_test_active = False
    _clear()

def led_test_tick():
    global _led_test_offset, _led_test_last_ms, _led_test_color_idx, _led_test_color_ms
    if not _led_test_active:
        return
    now = ticks_ms()

    # Advance color on interval
    if ticks_diff(now, _led_test_color_ms) >= _LED_TEST_COLOR_INTERVAL:
        _led_test_color_idx = (_led_test_color_idx + 1) % len(_LED_TEST_COLORS)
        _led_test_color_ms  = now

    # Advance frame on step interval
    if ticks_diff(now, _led_test_last_ms) < _LED_TEST_STEP_MS:
        return
    _led_test_last_ms = now

    color   = _LED_TEST_COLORS[_led_test_color_idx]
    period  = _LED_TEST_BULB + _LED_TEST_GAP
    for i in range(NUM_LEDS):
        pos = (i + _led_test_offset) % period
        _set(i, color if pos < _LED_TEST_BULB else OFF)
    _show()
    _led_test_offset = (_led_test_offset + 1) % period

# ---------------------------------------------------------------------------
# Clock countdown state
# ---------------------------------------------------------------------------

_clock_active    = False
_clock_start_ms  = 0
_clock_duration  = 30000  # ms, overridden by event
_clock_top_start = SEGMENTS["top"][0]
_clock_top_count = SEGMENTS["top"][1] - SEGMENTS["top"][0] + 1

def clock_start(duration_ms):
    global _clock_active, _clock_start_ms, _clock_duration
    _clock_active   = True
    _clock_start_ms = ticks_ms()
    _clock_duration = duration_ms

def clock_stop():
    global _clock_active
    _clock_active = False
    # Clear top segment
    _fill(OFF, SEGMENTS["top"][0], SEGMENTS["top"][1])
    _show()

def clock_tick():
    """Call each loop iteration — updates top segment clock bar."""
    if not _clock_active:
        return
    elapsed = ticks_diff(ticks_ms(), _clock_start_ms)
    remaining = max(0, _clock_duration - elapsed)
    frac = remaining / _clock_duration  # 1.0 → 0.0

    # Color shifts green → yellow → red as time runs out
    if frac > 0.5:
        r = int((1.0 - frac) * 2 * 255)
        g = 255
    else:
        r = 255
        g = int(frac * 2 * 255)
    color = (r, g, 0)

    # Fill top segment proportionally from outside-in
    lit = int(frac * _clock_top_count)
    pad = (_clock_top_count - lit) // 2
    for i in range(_clock_top_count):
        idx = _clock_top_start + i
        if i >= pad and i < _clock_top_count - pad:
            _set(idx, color)
        else:
            _set(idx, OFF)
    _show()

    if remaining == 0:
        clock_stop()

# ---------------------------------------------------------------------------
# USB serial helpers
# ---------------------------------------------------------------------------

def usb_send(obj):
    print(json.dumps(obj))

def usb_readline():
    if select.select([sys.stdin], [], [], 0)[0]:
        return sys.stdin.readline().strip()
    return None

# ---------------------------------------------------------------------------
# Event handler
# ---------------------------------------------------------------------------

def handle_event(obj):
    event = obj.get("event", "")
    raw_color = obj.get("teamColor")
    team_color = tuple(raw_color) if raw_color else WHITE

    if event == "WINDOW_STATE":
        state = obj.get("windowState", "")
        if state == "ARMED":
            effect_armed()
        elif state in ("IDLE", "LOCKED"):
            effect_idle()

    elif event == "BUZZ_ACCEPTED":
        effect_buzz(team_color)

    elif event == "CORRECT":
        effect_correct(team_color)

    elif event == "WRONG":
        effect_wrong()

    elif event == "STEAL":
        effect_steal(team_color)

    elif event == "RESET":
        effect_reset()
        effect_idle()

    elif event == "CLOCK_START":
        clock_start(obj.get("durationMs", 30000))

    elif event == "CLOCK_STOP":
        clock_stop()

    elif event == "LED_TEST":
        if obj.get("active"):
            led_test_start()
        else:
            led_test_stop()

# ---------------------------------------------------------------------------
# Button setup
# ---------------------------------------------------------------------------

buttons = {}
last_press_ms = {}

for gp, cid in BUTTON_MAP.items():
    pin = Pin(gp, Pin.IN, Pin.PULL_UP)
    buttons[gp] = (pin, cid)
    last_press_ms[gp] = 0

# ---------------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------------

sleep_ms(2000)
effect_reset()  # white flash on boot to confirm LED strip is alive
print("Buzz Pico ready -- GP0-GP19 buttons, GP20 LED strip ({} LEDs)".format(NUM_LEDS))

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

while True:
    now = ticks_ms()

    # --- Check buttons ---
    for gp, (pin, cid) in buttons.items():
        if pin.value() == 0:  # active LOW
            elapsed = ticks_diff(now, last_press_ms[gp])
            if elapsed > DEBOUNCE_MS:
                last_press_ms[gp] = now
                usb_send({"controllerId": cid})

    # --- Check for incoming state from Pi ---
    for _ in range(16):
        line = usb_readline()
        if not line:
            break
        try:
            obj = json.loads(line)
            handle_event(obj)
        except Exception:
            pass

    # --- Clock tick ---
    clock_tick()

    # --- LED test tick ---
    led_test_tick()

    sleep_ms(10)  # 10ms loop — fast enough for buttons, smooth for clock
