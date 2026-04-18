/**
 * Front Camera Test
 *
 *   Permission denied  → inconclusive (can't verify hardware)
 *   Hardware/other error → fail
 *   Photo accepted     → success
 *   Photo rejected     → fail
 */
import { cameraTest } from "./cameraTest.js";

export async function testFrontCamera() {
  return cameraTest("user", "Front Camera");
}
