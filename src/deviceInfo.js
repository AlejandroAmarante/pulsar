export async function getDeviceInfo() {
  // ---------- Browser Detection ----------
  const getBrowserName = () => {
    if (navigator.userAgentData?.brands) {
      const brands = navigator.userAgentData.brands.map((b) => b.brand);
      if (brands.some((b) => /Chrome/i.test(b))) return "Chrome";
      if (brands.some((b) => /Edge/i.test(b))) return "Edge";
      if (brands.some((b) => /Opera/i.test(b))) return "Opera";
    }

    const ua = navigator.userAgent;
    if (/Edg/i.test(ua)) return "Edge";
    if (/OPR|Opera/i.test(ua)) return "Opera";
    if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    return "Unknown";
  };

  // ---------- Platform Detection ----------
  const getPlatform = async () => {
    if (navigator.userAgentData?.platform) {
      return navigator.userAgentData.platform;
    }

    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Unknown";
  };

  // ---------- Battery ----------
  let batteryInfo = "Unknown";
  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      batteryInfo = `${(b.level * 100).toFixed(0)}% · ${
        b.charging ? "Charging" : "Discharging"
      }`;
    } catch {}
  }

  // ---------- Network ----------
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  // ---------- Platform ----------
  const platform = await getPlatform();

  // ---------- Info Object ----------
  const info = {
    Browser: {
      value: getBrowserName(),
      icon: "ri-global-line",
    },
    Platform: {
      value: platform,
      icon: "ri-smartphone-line",
    },
    Resolution: {
      value: `${screen.width} × ${screen.height}`,
      icon: "ri-fullscreen-line",
    },
    // Viewport: {
    //   value: `${window.innerWidth} × ${window.innerHeight}`,
    //   icon: "ri-layout-top-line",
    // },
    // "Pixel Ratio": {
    //   value: `${window.devicePixelRatio.toFixed(2)}x`,
    //   icon: "ri-focus-3-line",
    // },
    CPU: {
      value: navigator.hardwareConcurrency
        ? `${navigator.hardwareConcurrency} cores`
        : "Unknown",
      icon: "ri-cpu-line",
    },
    Memory: {
      value: navigator.deviceMemory
        ? `≥ ${navigator.deviceMemory} GB`
        : "Unknown",
      icon: "ri-ram-2-line",
    },
    Network: {
      value: conn?.type || "Unknown",
      icon: "ri-wifi-line",
    },
    Connection: {
      value: conn?.effectiveType || "Unknown",
      icon: "ri-signal-cellular-3-line",
    },
    // Latency: {
    //   value: conn?.rtt ? `${conn.rtt} ms` : "Unknown",
    //   icon: "ri-timer-line",
    // },
    Bandwidth: {
      value: conn?.downlink ? `${conn.downlink} Mbps` : "Unknown",
      icon: "ri-arrow-up-down-line",
    },
    Battery: {
      value: batteryInfo,
      icon: "ri-battery-2-charge-line",
    },
    Touch: {
      value:
        navigator.maxTouchPoints > 0
          ? `${navigator.maxTouchPoints} points`
          : "None",
      icon: "ri-fingerprint-line",
    },
    Timezone: {
      value: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
      icon: "ri-time-line",
    },
    Language: {
      value: navigator.language || "Unknown",
      icon: "ri-translate-2",
    },
  };

  // ---------- Render ----------
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
