export async function testGeolocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({
        name: "Geolocation",
        success: false,
        details: "Geolocation API not supported",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        resolve({
          name: "Geolocation",
          success: true,
          details: "Geolocation access granted",
        });
      },
      () => {
        resolve({
          name: "Geolocation",
          success: false,
          details: "Geolocation access denied",
        });
      }
    );
  });
}
