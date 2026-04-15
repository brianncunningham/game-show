"""
Buzz Pico — main.py
Raspberry Pi Pico 2 WH

Responsibilities:
  - Watch 20 GPIO pins (GP0–GP19), one per buzzer button
  - On button press: send controller ID over USB serial to Pi (judge)
  - On button press: send controller ID over UART to LED Pico
  - Receive state events from Pi over USB serial and forward to LED Pico
  - Debounce all inputs in software

Pin mapping:
  GP0–GP19  : buzzer buttons (controllers 1–20), active LOW with internal pull-up
  GP20 (TX) : UART to LED Pico RX
  GP21 (RX) : UART from LED Pico TX (reserved, not yet used)
  GND       : shared ground with LED Pico and buttons

Wiring per button:
  One leg to GP pin, other leg to GND.
  Internal pull-up enabled — no external resistor needed.

USB serial protocol (Buzz Pico → Pi):
  {"controllerId":"1"}\n

USB serial protocol (Pi → Buzz Pico):
  {"event":"WINDOW_STATE","windowState":"ARMED"}\n
  {"event":"BUZZ_ACCEPTED","controllerId":"3"}\n
  {"event":"RESET"}\n

UART protocol (Buzz Pico → LED Pico):
  Same JSON lines as above, forwarded as-is.
"""

import json
import sys
import select
from machine import Pin, UART
from utime import ticks_ms, ticks_diff, sleep_ms

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEBOUNCE_MS = 200       # minimum ms between registering presses on same button
HOLD_IGNORE_MS = 300    # ignore further presses while button is held

# GP pin → controller ID (1-based, matches game-show controllerAssignments)
BUTTON_MAP = {
    0:  "1",
    1:  "2",
    2:  "3",
    3:  "4",
    4:  "5",
    5:  "6",
    6:  "7",
    7:  "8",
    8:  "9",
    9:  "10",
    10: "11",
    11: "12",
    12: "13",
    13: "14",
    14: "15",
    15: "16",
    16: "17",
    17: "18",
    18: "19",
    19: "20",
}

# ---------------------------------------------------------------------------
# UART to LED Pico (GP20=TX, GP21=RX, 115200 baud)
# ---------------------------------------------------------------------------

led_uart = UART(1, baudrate=115200, tx=Pin(20), rx=Pin(21))

def uart_send(msg: str):
    led_uart.write((msg + "\n").encode())

# ---------------------------------------------------------------------------
# USB serial helpers
# ---------------------------------------------------------------------------

def usb_send(obj: dict):
    """Send a JSON line to the Pi over USB serial."""
    print(json.dumps(obj))

def usb_readline() -> str | None:
    """Non-blocking read of a line from USB serial. Returns None if nothing available."""
    if select.select([sys.stdin], [], [], 0)[0]:
        return sys.stdin.readline().strip()
    return None

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
# Main loop
# ---------------------------------------------------------------------------

# Wait for USB CDC to enumerate
sleep_ms(2000)
print("Buzz Pico ready -- watching 20 buttons on GP0-GP19")

while True:
    now = ticks_ms()

    # --- Check buttons ---
    for gp, (pin, cid) in buttons.items():
        if pin.value() == 0:  # active LOW — button pressed
            elapsed = ticks_diff(now, last_press_ms[gp])
            if elapsed > DEBOUNCE_MS:
                last_press_ms[gp] = now
                msg = {"controllerId": cid}
                usb_send(msg)
                uart_send(json.dumps(msg))

    # --- Check for incoming state from Pi ---
    line = usb_readline()
    if line:
        try:
            obj = json.loads(line)
            # Forward state events to LED Pico
            uart_send(json.dumps(obj))
        except Exception:
            pass  # ignore malformed input

    sleep_ms(1)  # 1ms poll loop — fast enough for buzzer response
