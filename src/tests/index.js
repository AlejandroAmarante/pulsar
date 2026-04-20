/**
 * tests/index.js
 * Central registry for all device tests.
 * Exports the configuration array, leaf count, and shared status helpers
 * so main.js stays focused on UI/runner logic only.
 */

// ─── Test imports ─────────────────────────────────────────────────────────────

import { testGyroscope } from "./sensors/gyroscope.test.js";
import { testColorScreens } from "./hardware/color.test.js";
import { testTouchTracking, cleanupTouchTest } from "./sensors/touch.test.js";
import {
  testShortVibration,
  testMediumVibration,
  testLongVibration,
} from "./hardware/vibration.test.js";
import { testGeolocation } from "./sensors/geolocation.test.js";
import { testBluetooth } from "./connectivity/bluetooth.test.js";
import {
  testLowFrequency,
  testMidFrequency,
  testHighFrequency,
} from "./hardware/speaker.test.js";
import { testMicrophone } from "./hardware/microphone.test.js";
import { testFrontCamera, testRearCamera } from "./camera/camera.test.js";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Each entry is either:
//   { name, testFunction }                             – single test
//   { name, grouped: true, subtests: [...] }           – grouped test
//
// Grouped tests run subtests sequentially and render sub-rows in the UI.

export const TEST_CONFIGURATIONS = [
  { name: "Gyroscope", testFunction: testGyroscope },
  { name: "Color Screen", testFunction: testColorScreens },
  { name: "Touch Tracking", testFunction: testTouchTracking },
  {
    name: "Vibration",
    grouped: true,
    subtests: [
      { name: "Short", testFunction: testShortVibration },
      { name: "Medium", testFunction: testMediumVibration },
      { name: "Long", testFunction: testLongVibration },
    ],
  },
  { name: "Geolocation", testFunction: testGeolocation },
  { name: "Bluetooth", testFunction: testBluetooth },
  {
    name: "Frequency",
    grouped: true,
    subtests: [
      { name: "Low", testFunction: testLowFrequency },
      { name: "Mid", testFunction: testMidFrequency },
      { name: "High", testFunction: testHighFrequency },
    ],
  },
  { name: "Microphone", testFunction: testMicrophone },
  {
    name: "Camera",
    grouped: true,
    subtests: [
      { name: "Front", testFunction: testFrontCamera },
      { name: "Rear", testFunction: testRearCamera },
    ],
  },
];

// Total leaf-test count — subtests count individually, single tests count as 1.
export const TOTAL_LEAF_COUNT = TEST_CONFIGURATIONS.reduce(
  (sum, cfg) => sum + (cfg.grouped ? cfg.subtests.length : 1),
  0,
);

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Maps a result status string to its CSS class name. */
export function toStatusClass(status) {
  if (status === "success") return "success";
  if (status === "fail") return "failure";
  return "partial";
}

/**
 * Derives an aggregate status from an array of subtest results.
 *   All pass  → success
 *   Any fail  → fail
 *   Otherwise → partial
 */
export function aggregateStatus(subtestResults) {
  if (subtestResults.every((r) => r.status === "success")) return "success";
  if (subtestResults.some((r) => r.status === "fail")) return "fail";
  return "partial";
}

// ─── Cleanup exports ──────────────────────────────────────────────────────────
// Re-exported here so main.js has a single import point for test teardown.

export { cleanupTouchTest };
