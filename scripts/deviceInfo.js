export async function getDeviceInfo() {
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

  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return "Android";
    if (/Windows Phone/i.test(ua)) return "Windows Phone";
    if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
    if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    if (/Windows NT/i.test(ua)) return "Windows";
    return "Unknown";
  };

  let batteryInfo = "Unknown";
  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      batteryInfo = `${(b.level * 100).toFixed(0)}% · ${b.charging ? "Charging" : "On battery"}`;
    } catch (_) {}
  }

  const conn = navigator.connection;

  const info = {
    Browser: { value: getBrowserName(), icon: "ri-global-line" },
    Resolution: {
      value: `${window.screen.width} × ${window.screen.height}`,
      icon: "ri-computer-line",
    },
    Viewport: {
      value: `${window.innerWidth} × ${window.innerHeight}`,
      icon: "ri-layout-4-line",
    },
    "Pixel Ratio": {
      value: `${window.devicePixelRatio}x`,
      icon: "ri-focus-3-line",
    },
    Platform: { value: getPlatform(), icon: "ri-smartphone-line" },
    Network: {
      value: conn ? conn.type || "Unknown" : "Unknown",
      icon: "ri-wifi-line",
    },
    Connection: {
      value: conn ? conn.effectiveType || "Unknown" : "Unknown",
      icon: "ri-signal-cellular-3-line",
    },
    Bandwidth: {
      value: conn ? `${conn.downlink} Mbps` : "Unknown",
      icon: "ri-arrow-up-down-line",
    },
    Battery: { value: batteryInfo, icon: "ri-battery-2-charge-line" },
    Memory: {
      value: navigator.deviceMemory
        ? `≥ ${navigator.deviceMemory} GB`
        : "Unknown",
      icon: "ri-cpu-line",
    },
    Touch: {
      value: "ontouchstart" in window ? "Supported" : "None",
      icon: "ri-fingerprint-line",
    },
  };

  const infoDiv = document.getElementById("device-info");
  infoDiv.innerHTML = "";

  for (const [key, { value, icon }] of Object.entries(info)) {
    const isUnknown = value === "Unknown";
    const row = document.createElement("div");
    row.className = "list-item-row";
    row.innerHTML = `
      <i class="${icon} icon" aria-hidden="true"></i>
      <span class="label">${key}</span>
      <span class="value${isUnknown ? " greyed-out" : ""}">${value}</span>
    `;
    infoDiv.appendChild(row);
  }
}
