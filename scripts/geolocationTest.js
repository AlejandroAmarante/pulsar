export async function testGeolocation() {
  return new Promise((resolve) => {
    if ("geolocation" in navigator) {
      // Request geolocation
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId); // Clear the timeout
          resolve({
            name: "Geolocation",
            success: true,
            details: "Geolocation access granted",
          });
        },
        () => {
          clearTimeout(timeoutId); // Clear the timeout
          resolve({
            name: "Geolocation",
            success: false,
            details: "Geolocation access denied",
          });
        }
      );
    } else {
      resolve({
        name: "Geolocation",
        success: false,
        details: "Geolocation API not supported",
      });
    }
  });
}
