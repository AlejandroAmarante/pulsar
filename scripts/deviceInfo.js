export function getDeviceInfo() {
  const info = {
    Browser: navigator.userAgent,
    "Screen Resolution": `${window.screen.width}x${window.screen.height}`,
    "Window Size": `${window.innerWidth}x${window.innerHeight}`,
    "Device Pixel Ratio": window.devicePixelRatio,
    Platform: (() => {
      const ua = navigator.userAgent;
      if (/Mobi|Android/i.test(ua)) return "Android";
      if (/Windows Phone/i.test(ua)) return "Windows Phone";
      if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
      if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
      if (/Linux/i.test(ua)) return "Linux";
      if (/Windows NT/i.test(ua)) return "Windows";
      return "Unknown";
    })(),
    "Connection Type": navigator.connection
      ? navigator.connection.effectiveType
      : "Unknown",
  };

  const infoDiv = document.getElementById("device-info");
  infoDiv.innerHTML = ""; // Clear the content before adding new info
  for (const [key, value] of Object.entries(info)) {
    infoDiv.innerHTML += `<p><strong>${key}:</strong> ${value}</p>`;
  }
}
