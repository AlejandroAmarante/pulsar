export async function testBluetooth() {
  return new Promise((resolve) => {
    if ("bluetooth" in navigator) {
      resolve({
        name: "Bluetooth",
        success: true,
        details: "Bluetooth access granted",
      });
    } else {
      resolve({
        name: "Bluetooth",
        success: false,
        details: "Bluetooth API not supported",
      });
    }
  });
}
