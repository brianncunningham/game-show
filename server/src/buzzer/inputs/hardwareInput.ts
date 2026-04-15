/**
 * Hardware Input Adapter — Pico 2 WH over USB serial
 *
 * Reads JSON lines from the Buzz Pico over USB serial (/dev/ttyACM0).
 * Each line is: {"controllerId":"1"}
 * On receipt, calls judgeController.receiveBuzz(controllerId).
 *
 * Also forwards state events from the judge back to the Pico over serial,
 * so the Pico can relay them to the LED Pico over UART.
 *
 * Configuration via environment variables:
 *   PICO_PORT   — serial device path (default: /dev/ttyACM0)
 *   PICO_BAUD   — baud rate (default: 115200)
 *
 * Set HARDWARE_INPUT=1 to enable. Otherwise runs as simulation-only stub.
 */

import { judgeController } from '../judgeController.js';

const ENABLED = process.env['HARDWARE_INPUT'] === '1';
const PICO_PORT = process.env['PICO_PORT'] ?? '/dev/ttyACM0';
const PICO_BAUD = Number(process.env['PICO_BAUD'] ?? 115200);

export const initHardwareInput = async (): Promise<void> => {
  if (!ENABLED) {
    console.log('[HardwareInput] Disabled — set HARDWARE_INPUT=1 to enable Pico serial input');
    return;
  }

  let SerialPort: typeof import('serialport').SerialPort;
  let ReadlineParser: typeof import('@serialport/parser-readline').ReadlineParser;

  try {
    ({ SerialPort } = await import('serialport'));
    ({ ReadlineParser } = await import('@serialport/parser-readline'));
  } catch {
    console.error('[HardwareInput] serialport package not found — run: npm install serialport');
    return;
  }

  const port = new SerialPort({ path: PICO_PORT, baudRate: PICO_BAUD, autoOpen: false });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.open((err: Error | null) => {
    if (err) {
      console.error(`[HardwareInput] Failed to open ${PICO_PORT}:`, err.message);
      return;
    }
    console.log(`[HardwareInput] Pico connected on ${PICO_PORT} at ${PICO_BAUD} baud`);
  });

  parser.on('data', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed) as Record<string, unknown>;
      const controllerId = msg['controllerId'];
      if (typeof controllerId === 'string' && controllerId.length > 0) {
        console.log(`[HardwareInput] Buzz received from controller ${controllerId}`);
        judgeController.receiveBuzz(controllerId);
      }
    } catch {
      console.warn('[HardwareInput] Malformed line from Pico:', trimmed);
    }
  });

  port.on('close', () => {
    console.warn('[HardwareInput] Pico serial port closed — reconnecting in 3s...');
    setTimeout(() => port.open(), 3000);
  });

  port.on('error', (err: Error) => {
    console.error('[HardwareInput] Serial port error:', err.message);
  });

  // Expose a function to send state events down to the Pico
  judgeController.onEvent((event) => {
    if (port.isOpen) {
      port.write(JSON.stringify(event) + '\n');
    }
  });
};
