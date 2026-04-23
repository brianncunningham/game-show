"""
LED Pico — main.py
Raspberry Pi Pico 2 WH

Responsibilities:
  - Receive JSON state events from Buzz Pico over UART
  - Drive WS2812 addressable LEDs to reflect game state

Pin mapping:
  GP5  (RX) : UART1 RX — receives from Buzz Pico GP20 TX
  GP4  (TX) : UART1 TX — reserved, not yet used
  GP0       : WS2812 data out (chain of all LEDs)
  VBUS      : 5V power for WS2812 LEDs
  GND       : shared ground with Buzz Pico and LEDs

UART protocol received (from Buzz Pico):
  {"controllerId":"3"}                                                     — button pressed
  {"type":"WINDOW_STATE","payload":{"windowId":"...","windowState":"IDLE"}}
  {"type":"WINDOW_STATE","payload":{"windowId":"...","windowState":"ARMED"}}
  {"type":"WINDOW_STATE","payload":{"windowId":"...","windowState":"LOCKED"}}
  {"type":"BUZZ_ACCEPTED","payload":{"windowId":"...","controllerId":"3"}}
  {"type":"RESET","payload":{}}

LED behavior:
  IDLE    → slow white pulse (breathing)
  ARMED   → fast green pulse (ready for buzz)
  LOCKED  → solid color for winning controller, others dim red
  RESET   → all off briefly, then back to IDLE
"""

import json
import time
from machine import Pin, UART
from neopixel import NeoPixel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LED_PIN = 0          # GP0 → WS2812 DIN
LED_COUNT = 20       # one LED per wand (adjust as needed)
UART_RX_PIN = 5      # GP5 — UART1 RX from Buzz Pico
UART_TX_PIN = 4      # GP4 — UART1 TX (reserved)

# Controller ID → LED index mapping (1-based controller ID → 0-based index)
# Adjust if your wand wiring order differs from button order
def controller_to_led(controller_id: str) -> int:
    try:
        # Handle both "1" and "c1" style IDs
        numeric = ''.join(c for c in controller_id if c.isdigit())
        return int(numeric) - 1
    except (ValueError, TypeError):
        return -1

# ---------------------------------------------------------------------------
# Hardware init
# ---------------------------------------------------------------------------

np = NeoPixel(Pin(LED_PIN), LED_COUNT)
uart = UART(1, baudrate=115200, rx=Pin(UART_RX_PIN), tx=Pin(UART_TX_PIN))

# ---------------------------------------------------------------------------
# LED helpers
# ---------------------------------------------------------------------------

COLOR_OFF     = (0, 0, 0)
COLOR_IDLE    = (20, 20, 20)    # dim white (GRB)
COLOR_ARMED   = (60, 0, 0)     # green (GRB: G=60, R=0, B=0)
COLOR_BUZZ    = (0, 0, 80)     # blue (GRB: G=0, R=0, B=80)
COLOR_WINNER  = (40, 80, 0)    # gold (GRB: G=40, R=80, B=0)
COLOR_LOSER   = (0, 30, 0)     # dim red (GRB: G=0, R=30, B=0)
COLOR_RESET   = (0, 0, 0)

def all_leds(color: tuple):
    for i in range(LED_COUNT):
        np[i] = color
    np.write()

def set_led(index: int, color: tuple):
    if 0 <= index < LED_COUNT:
        np[index] = color
        np.write()

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

window_state = "IDLE"
winner_led = -1

def apply_state():
    if window_state == "IDLE":
        all_leds(COLOR_IDLE)
    elif window_state == "ARMED":
        all_leds(COLOR_ARMED)
    elif window_state == "LOCKED":
        for i in range(LED_COUNT):
            np[i] = COLOR_WINNER if i == winner_led else COLOR_LOSER
        np.write()
    else:
        all_leds(COLOR_IDLE)

# ---------------------------------------------------------------------------
# UART read buffer
# ---------------------------------------------------------------------------

rx_buf = b""

def read_line() -> str | None:
    global rx_buf
    if uart.any():
        rx_buf += uart.read(uart.any())
    if b"\n" in rx_buf:
        line, rx_buf = rx_buf.split(b"\n", 1)
        return line.decode("utf-8", "ignore").strip()
    return None

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

all_leds(COLOR_IDLE)
print("LED Pico ready")

while True:
    line = read_line()
    if line:
        try:
            msg = json.loads(line)
            msg_type = msg.get("type") or msg.get("event")
            payload = msg.get("payload", msg)  # fall back to msg itself for flat format

            if msg_type == "WINDOW_STATE":
                window_state = payload.get("windowState", "IDLE")
                if window_state != "LOCKED":
                    winner_led = -1
                apply_state()

            elif msg_type == "BUZZ_ACCEPTED":
                cid = payload.get("controllerId", "")
                winner_led = controller_to_led(cid)
                window_state = "LOCKED"
                apply_state()

            elif msg_type == "RESET":
                window_state = "IDLE"
                winner_led = -1
                all_leds(COLOR_RESET)
                time.sleep_ms(200)
                apply_state()

            # controllerId-only messages (button press echo) — ignored
            # (arrives before BUZZ_ACCEPTED, would override winner color)

        except Exception:
            pass  # ignore malformed lines

    time.sleep_ms(5)
