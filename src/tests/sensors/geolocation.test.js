/**
 * Geolocation Test
 *
 *   API absent        → fail
 *   Position acquired → success
 *   Permission denied → partial (can't test hardware without permission)
 *   Other error       → partial (signal/environment issue, not hardware fault)
 */
export async function testGeolocation() {
  if (!("geolocation" in navigator)) {
    return {
      name: "Geolocation",
      status: "fail",
      details: "Geolocation API not supported",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          name: "Geolocation",
          status: "success",
          details: `Position acquired — accuracy ±${Math.round(accuracy)}m`,
        });
      },
      (error) => {
        // GeolocationPositionError codes: 1=PERMISSION_DENIED, 2=UNAVAILABLE, 3=TIMEOUT
        const isPermissionDenied = error.code === 1;
        resolve({
          name: "Geolocation",
          status: "partial",
          details: isPermissionDenied
            ? "Location permission denied — cannot verify hardware"
            : `Location unavailable: ${error.message}`,
        });
      },
      { timeout: 10_000, maximumAge: 30_000 },
    );
  });
}
