/**
 * Hardware Input Adapter — NOT YET IMPLEMENTED
 *
 * This file is a placeholder showing where GPIO / physical buzzer input
 * will be wired in during Phase 6.
 *
 * Planned implementation options:
 *
 * Option A — Raspberry Pi GPIO (onboard buttons)
 *   Use the 'onoff' npm package to watch GPIO pin state changes.
 *   Each pin maps to a controllerId (configured at startup).
 *   On falling edge (button press): call judgeController.receiveBuzz(controllerId)
 *
 *   Example (NOT active):
 *     import Gpio from 'onoff';
 *     const button = new Gpio.Gpio(17, 'in', 'falling');
 *     button.watch(() => judgeController.receiveBuzz('controller-1'));
 *
 * Option B — ESP32 over HTTP POST
 *   Each ESP32 unit sends POST /api/buzzer/buzz/:controllerId on button press.
 *   Add a route in buzzerRoutes.ts that calls judgeController.receiveBuzz().
 *   No changes to judge logic needed.
 *
 * Option C — ESP32 over WebSocket
 *   ESP32 opens a persistent WS connection to /ws/buzzer-input (new path).
 *   On button press, sends { controllerId } as JSON.
 *   A new buzzerInputSocket.ts reads messages and calls receiveBuzz().
 *
 * In all cases: the only call needed is judgeController.receiveBuzz(controllerId).
 * The judge handles all state, lockout, and event emission.
 */

import { judgeController } from '../judgeController.js';

// Exported as a no-op stub so this file is valid TypeScript.
// Replace with real implementation during Phase 6.
export const initHardwareInput = (): void => {
  console.log('[HardwareInput] No hardware adapter configured — simulation only');
  void judgeController; // reference to suppress unused import warnings
};
