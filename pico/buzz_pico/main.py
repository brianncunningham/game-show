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
  {"event":"LED_EFFECT","effect":"marquee","color":[r,g,b],...}\n
  {"event":"LED_TEST","active":true}\n
  {"event":"LED_PIXEL","index":42}\n

LED segment map (update after physical install):
  SEGMENTS dict maps face name to (start_index, end_index) inclusive.
"""

import array
import json
import math
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

# Segment map — measured after physical install
# Format: (first_led_index, last_led_index) inclusive
# Visible LEDs: 0–211. 212–319 are under the crate (still lit, just not visible).
SEGMENTS = {
    "right":  (0,   35),   # bottom-right corner up to top-right corner
    "top":    (36,  106),  # top-right across to top-left
    "left":   (107, 142),  # top-left down to bottom-left corner
    "bottom": (143, 211),  # bottom-left across to bottom-right (visible)
    "all":    (0,   211),  # all visible LEDs
}

def _seg_range(segment="all"):
    if segment in SEGMENTS:
        return SEGMENTS[segment]
    return (0, NUM_LEDS - 1)

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

def _clear(start=0, end=None):
    _fill((0, 0, 0), start, end if end is not None else NUM_LEDS - 1)
    _show()

def _scale(rgb, factor):
    return (int(rgb[0]*factor), int(rgb[1]*factor), int(rgb[2]*factor))

def _hsv_to_rgb(h, s, v):
    """h: 0-360, s/v: 0.0-1.0 → (r,g,b) 0-255"""
    h = h % 360
    i = int(h / 60)
    f = (h / 60) - i
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    sectors = [(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]
    r, g, b = sectors[i % 6]
    return (int(r*255), int(g*255), int(b*255))

# ---------------------------------------------------------------------------
# Named colors
# ---------------------------------------------------------------------------

OFF    = (0, 0, 0)
WHITE  = (255, 255, 255)
GREEN  = (0, 220, 60)
RED    = (220, 30, 0)
BLUE   = (0, 80, 255)
ORANGE = (255, 80, 0)

# ---------------------------------------------------------------------------
# Active effect state — only one effect runs at a time
# ---------------------------------------------------------------------------

_effect_name   = "off"
_effect_params = {}
_effect_state  = {}

def _effect_stop():
    global _effect_name, _effect_params, _effect_state
    _effect_name   = "off"
    _effect_params = {}
    _effect_state  = {}

def _effect_start(name, params):
    global _effect_name, _effect_params, _effect_state
    _effect_name   = name
    _effect_params = params
    _effect_state  = {"started_ms": ticks_ms(), "last_ms": ticks_ms()}

# ---------------------------------------------------------------------------
# One-shot blocking effects (used for game events)
# ---------------------------------------------------------------------------

def effect_flash(color, count=3, on_ms=80, off_ms=60):
    for _ in range(count):
        _fill(color); _show(); sleep_ms(on_ms)
        _fill(OFF);   _show(); sleep_ms(off_ms)

def effect_wipe(color, speed_ms=2):
    for i in range(NUM_LEDS):
        _set(i, color)
        if i % 8 == 0:
            _show()
        sleep_ms(speed_ms)
    _show()

def effect_reset():
    _fill(WHITE); _show(); sleep_ms(300)
    _fill(OFF);   _show()

# ---------------------------------------------------------------------------
# Tick-based effect: solid
# params: color, segment
# ---------------------------------------------------------------------------

def _tick_solid(p, s):
    if s.get("done"):
        return
    start, end = _seg_range(p.get("segment", "all"))
    _fill(OFF)
    _fill(tuple(p.get("color", WHITE)), start, end)
    _show()
    s["done"] = True

# ---------------------------------------------------------------------------
# Tick-based effect: pulse (breathing)
# params: color, bpm, min_bright, max_bright, segment
# ---------------------------------------------------------------------------

def _tick_pulse(p, s):
    now    = ticks_ms()
    bpm    = p.get("bpm", 30)
    period = 60000 / bpm
    lo     = p.get("min_bright", 0.05)
    hi     = p.get("max_bright", 1.0)
    color  = tuple(p.get("color", WHITE))
    t      = ticks_diff(now, s["started_ms"]) % int(period)
    phase  = t / period  # 0.0→1.0
    bright = lo + (hi - lo) * (0.5 - 0.5 * math.cos(phase * 2 * math.pi))
    start, end = _seg_range(p.get("segment", "all"))
    _fill(OFF)
    _fill(_scale(color, bright), start, end)
    _show()

# ---------------------------------------------------------------------------
# Tick-based effect: marquee (chasing bulbs, 1 or 2 colors)
# params: color, color2, bulb_size, gap_size, speed_ms, direction, segment
# ---------------------------------------------------------------------------

def _tick_marquee(p, s):
    now      = ticks_ms()
    speed    = p.get("speed_ms", 30)
    if ticks_diff(now, s["last_ms"]) < speed:
        return
    s["last_ms"] = now
    bulb     = p.get("bulb_size", 4)
    gap      = p.get("gap_size",  4)
    period   = bulb + gap
    color1   = tuple(p.get("color",  WHITE))
    color2   = tuple(p.get("color2", OFF))
    seg      = p.get("segment", "all")
    start, end = _seg_range(seg)
    count    = end - start + 1
    offset   = s.get("offset", 0)
    rev      = p.get("direction", "fwd") == "rev"
    _fill(OFF)
    for i in range(count):
        pos = (i + offset) % period
        idx = (end - i) if rev else (start + i)
        if pos < bulb:
            group = (i // period) % 2 if color2 != OFF else 0
            _set(idx, color2 if group else color1)
        else:
            _set(idx, OFF)
    _show()
    s["offset"] = (offset + 1) % period

# ---------------------------------------------------------------------------
# Tick-based effect: sparkle
# params: color, density, speed_ms, segment
# ---------------------------------------------------------------------------

def _tick_sparkle(p, s):
    import urandom
    now   = ticks_ms()
    speed = p.get("speed_ms", 50)
    if ticks_diff(now, s["last_ms"]) < speed:
        return
    s["last_ms"] = now
    color   = tuple(p.get("color", WHITE))
    density = p.get("density", 0.05)
    start, end = _seg_range(p.get("segment", "all"))
    _fill(OFF, start, end)
    count = end - start + 1
    for i in range(count):
        if urandom.random() < density:
            _set(start + i, color)
    _show()

# ---------------------------------------------------------------------------
# Tick-based effect: rainbow
# params: speed_ms, brightness, segment
# ---------------------------------------------------------------------------

def _tick_rainbow(p, s):
    now   = ticks_ms()
    speed = p.get("speed_ms", 20)
    if ticks_diff(now, s["last_ms"]) < speed:
        return
    s["last_ms"] = now
    bright  = p.get("brightness", 1.0)
    start, end = _seg_range(p.get("segment", "all"))
    count   = end - start + 1
    offset  = s.get("offset", 0)
    _fill(OFF)
    for i in range(count):
        hue = (i * 360 / count + offset) % 360
        _set(start + i, _scale(_hsv_to_rgb(hue, 1.0, bright), 1.0))
    _show()
    s["offset"] = (offset + 2) % 360

# ---------------------------------------------------------------------------
# Tick-based effect: clock_bar (outside-in shrink with color shift)
# params: duration_ms, segment, mode ("smooth"|"inward"|"chunked"), chunks
# ---------------------------------------------------------------------------

def _tick_clock(p, s):
    now       = ticks_ms()
    duration  = p.get("duration_ms", 30000)
    seg       = p.get("segment", "top")
    mode      = p.get("mode", "inward")
    chunks    = p.get("chunks", 10)
    start, end = _seg_range(seg)
    count     = end - start + 1
    elapsed   = ticks_diff(now, s["started_ms"])
    remaining = max(0, duration - elapsed)
    frac      = remaining / duration  # 1.0 → 0.0

    # Color: green → yellow → red
    if frac > 0.5:
        color = (int((1.0 - frac) * 2 * 255), 255, 0)
    else:
        color = (255, int(frac * 2 * 255), 0)

    _fill(OFF, start, end)

    if mode == "smooth":
        lit = int(frac * count)
        pad = (count - lit) // 2
        for i in range(count):
            if i >= pad and i < count - pad:
                _set(start + i, color)

    elif mode == "inward":
        lit = int(frac * count)
        pad = (count - lit) // 2
        for i in range(count):
            if i >= pad and i < count - pad:
                _set(start + i, color)

    elif mode == "chunked":
        lit_chunks = int(frac * chunks + 0.999)
        chunk_size = count / chunks
        outer = (chunks - lit_chunks) // 2
        for ci in range(chunks):
            if ci >= outer and ci < chunks - outer:
                ci_start = start + int(ci * chunk_size)
                ci_end   = start + int((ci + 1) * chunk_size) - 1
                for i in range(ci_start, min(ci_end + 1, end + 1)):
                    _set(i, color)

    _show()

    if remaining == 0:
        _effect_stop()
        _fill(OFF, start, end)
        _show()

# ---------------------------------------------------------------------------
# LED test pattern (multi-color marquee cycling through colors)
# ---------------------------------------------------------------------------

_led_test_active = False

def led_test_start():
    global _led_test_active
    _led_test_active = True
    _effect_start("marquee", {
        "color":    [255, 255, 255],
        "bulb_size": 4,
        "gap_size":  4,
        "speed_ms":  30,
        "segment":  "all",
    })
    _effect_state["color_idx"] = 0
    _effect_state["color_ms"]  = ticks_ms()

_LED_TEST_COLORS = [(255,255,255),(255,200,0),(0,180,255),(0,255,100)]
_LED_TEST_COLOR_INTERVAL = 2000

def led_test_stop():
    global _led_test_active
    _led_test_active = False
    _effect_stop()
    _fill(OFF); _show()

def led_test_tick():
    if not _led_test_active:
        return
    now = ticks_ms()
    if ticks_diff(now, _effect_state.get("color_ms", now)) >= _LED_TEST_COLOR_INTERVAL:
        idx = (_effect_state.get("color_idx", 0) + 1) % len(_LED_TEST_COLORS)
        _effect_state["color_idx"] = idx
        _effect_state["color_ms"]  = now
        _effect_params["color"] = list(_LED_TEST_COLORS[idx])

# ---------------------------------------------------------------------------
# Tick-based effect: spin (rapid color cycling → settle on final colors)
# params: colors [[r,g,b],...], settle_colors [[r,g,b],...], duration_ms
# Phase 1: rapid full-strip flashing through colors list
# Phase 2: slow down and land on settle_colors (split evenly across strip)
# ---------------------------------------------------------------------------

def _tick_spin(p, s):
    now      = ticks_ms()
    duration = p.get("duration_ms", 3000)
    elapsed  = ticks_diff(now, s["started_ms"])
    colors   = p.get("colors", [[255,255,255]])
    settle   = p.get("settle_colors", colors)
    frac     = min(elapsed / duration, 1.0)

    if frac < 0.75:
        # Phase 1: rapid cycling through colors (always all team colors for visual effect)
        speed = int(40 + frac * 200)  # 40ms → 190ms
        if ticks_diff(now, s["last_ms"]) < speed:
            return
        s["last_ms"] = now
        idx = (s.get("color_idx", 0) + 1) % len(colors)
        s["color_idx"] = idx
        _fill(tuple(colors[idx]))
        _show()
    elif frac < 1.0:
        # Phase 2: slow flicker between settle colors
        if ticks_diff(now, s["last_ms"]) < 300:
            return
        s["last_ms"] = now
        idx = (s.get("color_idx", 0) + 1) % len(settle)
        s["color_idx"] = idx
        _fill(tuple(settle[idx]))
        _show()
    else:
        # Settled: paint sides based on team count
        if not s.get("settled"):
            s["settled"] = True
            n = len(settle)
            _fill((0, 0, 0))
            if n >= 4:
                # 4 teams: one color per side
                for ci, seg_name in enumerate(["right", "top", "left", "bottom"]):
                    if seg_name in SEGMENTS:
                        s2, e2 = SEGMENTS[seg_name]
                        _fill(tuple(settle[ci % n]), s2, e2)
            elif n == 3:
                # 3 teams: right/top/left one each, bottom off
                for ci, seg_name in enumerate(["right", "top", "left"]):
                    if seg_name in SEGMENTS:
                        s2, e2 = SEGMENTS[seg_name]
                        _fill(tuple(settle[ci]), s2, e2)
            elif n == 2:
                # 2 teams: team0=right side, team1=left side
                # top runs right→left (pixel 36=top-right, 106=top-left)
                #   so team0 gets the right portion (ts..mid) and team1 gets left (mid+1..te)
                # bottom runs left→right (pixel 143=bottom-left, 211=bottom-right)
                #   so team1 gets left portion (bs..mid) and team0 gets right (mid+1..be)
                if "right" in SEGMENTS:
                    _fill(tuple(settle[0]), *SEGMENTS["right"])
                if "left" in SEGMENTS:
                    _fill(tuple(settle[1]), *SEGMENTS["left"])
                if "top" in SEGMENTS:
                    ts, te = SEGMENTS["top"]
                    mid = (ts + te) // 2
                    _fill(tuple(settle[0]), ts, mid)      # right half of top
                    _fill(tuple(settle[1]), mid + 1, te)  # left half of top
                if "bottom" in SEGMENTS:
                    bs, be = SEGMENTS["bottom"]
                    mid = (bs + be) // 2
                    _fill(tuple(settle[1]), bs, mid)      # left half of bottom
                    _fill(tuple(settle[0]), mid + 1, be)  # right half of bottom
            elif n == 1:
                _fill(tuple(settle[0]), *SEGMENTS.get("all", (0, NUM_LEDS - 1)))
            _show()

# ---------------------------------------------------------------------------
# Tick-based effect: flash (non-blocking)
# params: color, flashes, on_ms, off_ms
# ---------------------------------------------------------------------------

def _tick_flash(p, s):
    now     = ticks_ms()
    flashes = p.get("flashes", 3)
    on_ms   = p.get("on_ms", 100)
    off_ms  = p.get("off_ms", 80)
    color   = tuple(p.get("color", WHITE))
    phase   = s.get("phase", "on")
    done    = s.get("flash_count", 0)

    if done >= flashes:
        end_color = p.get("end_color")
        if end_color:
            _effect_start("solid", {"color": list(end_color)})
        else:
            _fill(OFF); _show()
            _effect_stop()
        return

    elapsed = ticks_diff(now, s["last_ms"])
    if phase == "on":
        if s.get("needs_draw", True):
            _fill(color); _show()
            s["needs_draw"] = False
        if elapsed >= on_ms:
            s["phase"]      = "off"
            s["last_ms"]    = now
            s["needs_draw"] = True
    else:
        if s.get("needs_draw", True):
            _fill(OFF); _show()
            s["needs_draw"] = False
        if elapsed >= off_ms:
            s["phase"]       = "on"
            s["last_ms"]     = now
            s["flash_count"] = done + 1
            s["needs_draw"]  = True

# ---------------------------------------------------------------------------
# Effect tick dispatcher
# ---------------------------------------------------------------------------

_TICKERS = {
    "solid":   _tick_solid,
    "pulse":   _tick_pulse,
    "marquee": _tick_marquee,
    "sparkle": _tick_sparkle,
    "rainbow": _tick_rainbow,
    "clock":   _tick_clock,
    "spin":    _tick_spin,
    "flash":   _tick_flash,
}

def effect_tick():
    ticker = _TICKERS.get(_effect_name)
    if ticker:
        ticker(_effect_params, _effect_state)

# ---------------------------------------------------------------------------
# Game event helpers
# ---------------------------------------------------------------------------

def _game_color(obj):
    raw = obj.get("teamColor")
    return tuple(raw) if raw else WHITE

_hold_idle_until = 0  # ticks_ms value — suppress IDLE transitions until this time

def _hold_idle(ms=8000):
    global _hold_idle_until
    _hold_idle_until = ticks_ms() + ms

def game_idle():
    _effect_start("pulse", {"color": list(WHITE), "bpm": 20, "min_bright": 0.02, "max_bright": 0.3})

def game_armed():
    _effect_start("pulse", {"color": [0, 60, 180], "bpm": 60, "min_bright": 0.1, "max_bright": 0.8})

def game_buzz(color):
    _effect_start("flash", {"color": list(color), "flashes": 3, "on_ms": 80, "off_ms": 60, "end_color": list(color)})

def game_correct(color):
    _effect_start("flash", {"color": list(GREEN), "flashes": 4, "on_ms": 120, "off_ms": 60})

def game_wrong():
    _effect_start("flash", {"color": list(RED), "flashes": 4, "on_ms": 120, "off_ms": 80})

def game_steal(color):
    _effect_start("flash", {"color": list(ORANGE), "flashes": 3, "on_ms": 100, "off_ms": 60, "end_color": list(color)})

def game_reset():
    game_idle()

# ---------------------------------------------------------------------------
# Clock countdown
# ---------------------------------------------------------------------------

def clock_start(duration_ms, segment="top", mode="inward"):
    _fill((0, 0, 0)); _show()  # clear full strip before clock
    _effect_start("clock", {"duration_ms": duration_ms, "segment": segment, "mode": mode})

def clock_stop():
    seg = _effect_params.get("segment", "top") if _effect_name == "clock" else "top"
    _effect_stop()
    s, e = _seg_range(seg)
    _fill(OFF, s, e); _show()

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
    # Judge protocol uses "type" + nested "payload"; LED commands use flat "event"
    event = obj.get("event") or obj.get("type", "")
    payload = obj.get("payload", {}) or {}
    # Merge top-level and payload so callers can use obj for both formats
    merged = dict(payload)
    merged.update({k: v for k, v in obj.items() if k not in ("type", "payload")})
    color = _game_color(merged)

    if event == "WINDOW_STATE":
        state = merged.get("windowState", payload.get("windowState", ""))
        if state == "ARMED":
            game_armed()
        elif state == "IDLE":
            if ticks_diff(ticks_ms(), _hold_idle_until) >= 0:
                game_idle()  # only go idle if no game effect is holding
        # LOCKED: hold current effect — piLed sends BUZZ_ACCEPTED flash via LED_EFFECT

    # BUZZ_ACCEPTED / CORRECT / WRONG / STEAL / RESET handled via piLed HTTP → LED_EFFECT
    # Serial path is fallback only (no JUDGE_URL)
    elif event == "BUZZ_ACCEPTED":
        _hold_idle(8000)
        game_buzz(color)

    elif event == "CORRECT":
        _hold_idle(4000)
        game_correct(color)

    elif event == "WRONG":
        _hold_idle(4000)
        game_wrong()

    elif event == "STEAL":
        _hold_idle(8000)
        game_steal(color)

    elif event == "RESET":
        game_reset()

    elif event == "CLOCK_START":
        clock_start(
            merged.get("durationMs", 30000),
            merged.get("segment", "top"),
            merged.get("mode", "inward"),
        )

    elif event == "CLOCK_STOP":
        clock_stop()

    elif event == "LED_EFFECT":
        effect = merged.get("effect", "")
        if effect == "off":
            _effect_stop()
            _fill(OFF); _show()
        elif effect in _TICKERS:
            _hold_idle(10000)  # suppress serial IDLE for 10s after any piLed command
            params = {k: v for k, v in merged.items() if k not in ("event", "type")}
            _effect_start(effect, params)

    elif event == "LED_TEST":
        if merged.get("active"):
            led_test_start()
        else:
            led_test_stop()

    elif event == "LED_PIXEL":
        idx = merged.get("index")
        if isinstance(idx, int) and 0 <= idx < NUM_LEDS:
            led_test_stop()
            _effect_stop()
            _fill(OFF); _set(idx, WHITE); _show()

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
game_idle()     # start idle pulse
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

    # --- Effect tick (all non-blocking effects) ---
    effect_tick()
    led_test_tick()

    sleep_ms(10)  # 10ms loop — fast enough for buttons, smooth for effects
