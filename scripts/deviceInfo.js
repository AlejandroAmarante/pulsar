export async function getDeviceInfo() {
  // Get the battery info asynchronously

  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edge|Opera/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/Edge/i.test(ua)) return "Edge";
    if (/Opera|OPR/i.test(ua)) return "Opera";
    if (/Trident/i.test(ua)) return "Internet Explorer";
    return "Unknown";
  };

  let batteryInfo = "Unknown";
  if (navigator.getBattery) {
    const battery = await navigator.getBattery();
    batteryInfo = `Level: ${(battery.level * 100).toFixed(1)}%, Charging: ${
      battery.charging ? "Yes" : "No"
    }`;
  }

  const deviceMemory = navigator.deviceMemory
    ? `≥ ${navigator.deviceMemory.toFixed(2)} GB`
    : "Unknown";

  const touchSupport = "ontouchstart" in window ? "Yes" : "No";

  const info = {
    Browser: { value: getBrowserName(), icon: "chrome" },
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
    "Network Type": {
      value: navigator.connection ? navigator.connection.type : "Unknown",
      icon: "wifi",
    },
    "Connection Type": {
      value: navigator.connection
        ? navigator.connection.effectiveType
        : "Unknown",
      icon: "signal",
    },
    Bandwidth: {
      value: navigator.connection
        ? `${navigator.connection.downlink} Mbps`
        : "Unknown",
      icon: "arrow-up-down",
    },
    Battery: { value: batteryInfo, icon: "battery-full" },
    "Device Memory": {
      value: `${deviceMemory}`,
      icon: "memory-stick",
    },
    "Touch Support": { value: touchSupport, icon: "fingerprint" },
  };

  const infoDiv = document.getElementById("device-info");
  infoDiv.innerHTML = "";

  for (const [key, { value, icon }] of Object.entries(info)) {
    const row = document.createElement("div");
    row.className = "list-item-row";

    // Add a "greyed-out" class if the value is "Unknown"
    const isUnknown = value === "Unknown";
    const valueClass = isUnknown ? "greyed-out" : "";

    row.innerHTML = `
      <i data-lucide="${icon}" class="icon"></i>
      <div>
        <span class="label">${key}:</span> 
        <span class="${valueClass}">${value}</span>
      </div>
    `;
    infoDiv.appendChild(row);
  }

  lucide.createIcons();
}
