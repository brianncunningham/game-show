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
LED_COUNT = 1        # one LED per wand (adjust as needed)
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

COLOR_OFF          = (0, 0, 0)
COLOR_IDLE         = (20, 20, 20)   # dim white       (G, R, B)
COLOR_ARMED        = (0, 0, 60)    # blue             (G=0,  R=0,  B=60)
COLOR_WINNER       = (60, 0, 0)    # green            (G=60, R=0,  B=0)
COLOR_NOT_WINNER   = (20, 50, 0)   # dim orange       (G=20, R=50, B=0)
COLOR_PENALTY      = (0, 60, 0)    # red              (G=0,  R=60, B=0)
COLOR_TEAM_FAILED  = (0, 10, 40)   # dim purple       (G=0,  R=10, B=40)
COLOR_RESET        = (0, 0, 0)

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
last_winner_led = -1
had_winner = False  # True after BUZZ_ACCEPTED, cleared on RESET
led_overrides = {}  # index → color, persists through re-arms (penalty/team-failed)
eligible_controllers = []  # set on WINDOW_STATE, used to mark ineligible as failed

def apply_state():
    time.sleep_ms(1)
    if window_state == "IDLE":
        all_leds(COLOR_IDLE)
    elif window_state in ("ARMED", "WAITING"):
        for i in range(LED_COUNT):
            np[i] = led_overrides.get(i, COLOR_ARMED)
        np.write()
    elif window_state == "LOCKED":
        for i in range(LED_COUNT):
            if i == winner_led:
                np[i] = COLOR_WINNER
            else:
                np[i] = led_overrides.get(i, COLOR_NOT_WINNER)
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
            print("RX:", msg_type)
            payload = msg.get("payload", msg)  # fall back to msg itself for flat format

            if msg_type == "WINDOW_STATE":
                window_state = payload.get("windowState", "IDLE")
                if window_state == "IDLE":
                    winner_led = -1
                    # Don't clear overrides or redraw — IDLE is transient before next WAITING
                    continue
                # On new window open (WAITING): update overrides for failed/eligible controllers
                if window_state == "WAITING":
                    winner_led = -1
                    last_winner_led = -1
                    is_steal = payload.get("isSteal", False)
                    eligible_controllers = [str(c) for c in payload.get("eligibleControllers", [])]
                    if eligible_controllers:
                        # Steal window with known eligible set:
                        # mark ineligible as failed, clear failed status for newly eligible
                        for i in range(LED_COUNT):
                            cid = str(i + 1)
                            if cid not in eligible_controllers:
                                led_overrides[i] = COLOR_TEAM_FAILED
                            elif led_overrides.get(i) == COLOR_TEAM_FAILED:
                                del led_overrides[i]
                    elif is_steal:
                        # Steal round, no eligible list — keep purple overrides
                        pass
                    else:
                        # Fresh round — clear all overrides
                        led_overrides.clear()
                    had_winner = False
                elif window_state != "LOCKED":
                    winner_led = -1
                apply_state()

            elif msg_type == "BUZZ_ACCEPTED":
                cid = payload.get("controllerId", "")
                winner_led = controller_to_led(cid)
                last_winner_led = winner_led
                had_winner = True
                if winner_led >= 0:
                    led_overrides[winner_led] = COLOR_TEAM_FAILED
                window_state = "LOCKED"
                apply_state()

            elif msg_type == "BUZZ_EARLY":
                cid = payload.get("controllerId", "")
                idx = controller_to_led(cid)
                if idx >= 0:
                    led_overrides[idx] = COLOR_PENALTY
                    set_led(idx, COLOR_PENALTY)

            elif msg_type == "TEAM_FAILED":
                failed_ids = payload.get("controllerIds", [])
                for cid in failed_ids:
                    idx = controller_to_led(cid)
                    if idx >= 0:
                        led_overrides[idx] = COLOR_TEAM_FAILED
                        set_led(idx, COLOR_TEAM_FAILED)

            elif msg_type == "WINDOW_CLOSED":
                pass  # override already set in BUZZ_ACCEPTED

            elif msg_type == "RESET":
                window_state = "IDLE"
                winner_led = -1
                last_winner_led = -1
                had_winner = False
                led_overrides.clear()
                all_leds(COLOR_IDLE)

            # controllerId-only messages (button press echo) — ignored
            # (arrives before BUZZ_ACCEPTED, would override winner color)

        except Exception:
            pass  # ignore malformed lines

    time.sleep_ms(5)
