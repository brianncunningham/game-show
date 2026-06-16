/**
 * Simulation Input Adapter
 *
 * Provides programmatic buzz injection for development and diagnostics.
 * Called by the /api/buzzer/simulate/:controllerId HTTP route.
 *
 * This is the reference implementation of the input adapter pattern:
 *   - Import judgeController
 *   - Call receiveBuzz(controllerId) on input event
 *   - No other judge logic here
 *
 * Future adapters (GPIO, ESP32, phone clients) follow this exact same pattern.
 */

import { judgeController } from '../judgeController.js';

export const simulateInput = (controllerId: string): void => {
  console.log(`[SimInput] buzz from: ${controllerId}`);
  judgeController.receiveBuzz(controllerId);
};
