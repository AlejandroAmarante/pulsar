export async function testGeolocation() {
  return new Promise((resolve) => {
    if ("geolocation" in navigator) {
      // Timeout to prevent the test from getting stuck indefinitely
      const timeoutId = setTimeout(() => {
        resolve({
          name: "Geolocation",
          success: false,
          details: "Geolocation request timed out",
        });
      }, 10000); // 10 seconds timeout

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
