/**
 * Bluetooth Test
 *
 * We can only inspect API presence without a user gesture — requesting a device
 * requires interaction and is outside a scripted test. Therefore:
 *   API absent  → fail        (browser/device definitively doesn't support it)
 *   API present → inconclusive (hardware not verified without user interaction)
 */
export async function testBluetooth() {
  if (!("bluetooth" in navigator)) {
    return {
      name: "Bluetooth",
      status: "fail",
      details: "Web Bluetooth API not supported in this browser",
    };
  }

  return {
    name: "Bluetooth",
    status: "inconclusive",
    details:
      "Bluetooth API detected — hardware verification requires user interaction",
  };
}
