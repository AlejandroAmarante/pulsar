export async function getDeviceInfo() {
  // Get the battery info asynchronously
  let batteryInfo = "Unknown";
  if (navigator.getBattery) {
    const battery = await navigator.getBattery();
    batteryInfo = `Level: ${(battery.level * 100).toFixed(1)}%, Charging: ${
      battery.charging ? "Yes" : "No"
    }`;
  }

  const info = {
    Browser: { value: navigator.userAgent, icon: "chrome" },
    "Screen Resolution": {
      value: `${window.screen.width}x${window.screen.height}`,
      icon: "monitor",
    },
    "Window Size": {
      value: `${window.innerWidth}x${window.innerHeight}`,
      icon: "proportions",
    },
    "Device Pixel Ratio": {
      value: window.devicePixelRatio,
      icon: "maximize",
    },
    Platform: {
      value: (() => {
        const ua = navigator.userAgent;
        if (/Mobi|Android/i.test(ua)) return "Android";
        if (/Windows Phone/i.test(ua)) return "Windows Phone";
        if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
        if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
        if (/Linux/i.test(ua)) return "Linux";
        if (/Windows NT/i.test(ua)) return "Windows";
        return "Unknown";
      })(),
      icon: "monitor-smartphone",
    },
    "Connection Type": {
      value: navigator.connection
        ? navigator.connection.effectiveType
        : "Unknown",
      icon: "signal",
    },
    Battery: { value: batteryInfo, icon: "battery-full" },
  };

  const infoDiv = document.getElementById("device-info");
  infoDiv.innerHTML = "";

  for (const [key, { value, icon }] of Object.entries(info)) {
    const row = document.createElement("div");
    row.className = "device-info-row";
    row.innerHTML = `
          <i data-lucide="${icon}" class="icon"></i>
          <div>
            <span class="label">${key}:</span> ${value}
          </div>
        `;
    infoDiv.appendChild(row);
  }

  lucide.createIcons();
}
