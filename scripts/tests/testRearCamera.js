/**
 * Rear Camera Test
 *
 *   Permission denied  → inconclusive
 *   Hardware/other error → fail
 *   Photo accepted     → success
 *   Photo rejected     → fail
 */

import { cameraTest } from "./cameraTest.js";

export async function testRearCamera() {
  return cameraTest("environment", "Rear Camera");
}
