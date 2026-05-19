"""
LED Strip Test — led_test.py
Run this temporarily on the buzz-pico to verify WS2812B strip on GP20.

320 LEDs (160/m × 2m). Cycles through: red, green, blue, white, chase, off.
Copy to Pico as main.py to run on boot, or run via Thonny directly.
"""

import array
import time
from machine import Pin
import rp2

LED_PIN = 20
NUM_LEDS = 320
BRIGHTNESS = 0.3  # 0.0–1.0, keep low for first test (heat/current)

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

sm = rp2.StateMachine(0, ws2812, freq=8_000_000, sideset_base=Pin(LED_PIN))
sm.active(1)

ar = array.array("I", [0] * NUM_LEDS)

def pixels_show():
    dimmer = array.array("I", [0] * NUM_LEDS)
    for i, c in enumerate(ar):
        r = int(((c >> 8) & 0xFF) * BRIGHTNESS)
        g = int(((c >> 16) & 0xFF) * BRIGHTNESS)
        b = int((c & 0xFF) * BRIGHTNESS)
        dimmer[i] = (g << 16) | (r << 8) | b
    sm.put(dimmer, 8)
    time.sleep_ms(10)

def pixels_set(i, color):
    ar[i] = (color[1] << 16) | (color[0] << 8) | color[2]

def pixels_fill(color):
    for i in range(NUM_LEDS):
        pixels_set(i, color)

def solid(color, duration_ms=1500):
    pixels_fill(color)
    pixels_show()
    time.sleep_ms(duration_ms)

def chase(color, delay_ms=20):
    pixels_fill((0, 0, 0))
    for i in range(NUM_LEDS):
        pixels_set(i, color)
        if i > 0:
            pixels_set(i - 1, (0, 0, 0))
        pixels_show()
        time.sleep_ms(delay_ms)
    pixels_fill((0, 0, 0))
    pixels_show()

def wipe_in_out(color, delay_ms=5):
    """Fill from both ends toward center, then unfill."""
    pixels_fill((0, 0, 0))
    half = NUM_LEDS // 2
    for i in range(half):
        pixels_set(i, color)
        pixels_set(NUM_LEDS - 1 - i, color)
        pixels_show()
        time.sleep_ms(delay_ms)
    for i in range(half - 1, -1, -1):
        pixels_set(i, (0, 0, 0))
        pixels_set(NUM_LEDS - 1 - i, (0, 0, 0))
        pixels_show()
        time.sleep_ms(delay_ms)

# ---------------------------------------------------------------------------
# Main test loop
# ---------------------------------------------------------------------------

print("LED test starting — GP20, {} LEDs".format(NUM_LEDS))

while True:
    print("RED")
    solid((255, 0, 0))
    print("GREEN")
    solid((0, 255, 0))
    print("BLUE")
    solid((0, 0, 255))
    print("WHITE")
    solid((255, 255, 255))
    print("OFF")
    solid((0, 0, 0), 500)
    print("CHASE red")
    chase((255, 0, 0), delay_ms=10)
    print("WIPE blue")
    wipe_in_out((0, 100, 255), delay_ms=4)
    time.sleep_ms(500)
