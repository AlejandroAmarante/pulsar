/**
 * Gyroscope / Device Orientation Test
 *
 * The user tilts the device to fill 16 angular slices.
 *   API absent or permission denied → partial
 *   All slices filled               → success
 *   (timeout handled by main runner → partial)
 */
export async function testGyroscope() {
  return new Promise(async (resolve) => {
    const gyroDialog = document.getElementById("gyro-dialog");
    const canvas = document.getElementById("gyro-canvas");
    const ctx = canvas.getContext("2d");
    const instructions = document.getElementById("gyro-instructions");

    const NUM_SLICES = 16;
    const SLICE_ANGLE = 360 / NUM_SLICES;
    const filledSlices = new Set();

    let currentPos = { x: 0, y: 0, magnitude: 0, sliceIndex: 0 };
    let rafId = null;
    let dirty = false; // Only redraw when data changed

    // ── iOS 13+ permission ────────────────────────────────────────────────
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          return resolve({
            name: "Gyroscope",
            status: "partial",
            details: "Motion permission denied — cannot verify gyroscope",
          });
        }
      } catch {
        return resolve({
          name: "Gyroscope",
          status: "partial",
          details: "Motion permission request failed",
        });
      }
    }

    if (!window.DeviceOrientationEvent) {
      return resolve({
        name: "Gyroscope",
        status: "partial",
        details: "DeviceOrientation API not supported",
      });
    }

    // ── Setup ─────────────────────────────────────────────────────────────
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dirty = true;
    }

    resize();
    gyroDialog.style.display = "block";
    instructions.textContent =
      "Tilt the device in all directions to fill every segment";
    instructions.style.display = "block";

    // ── Render loop ───────────────────────────────────────────────────────
    function renderLoop() {
      if (dirty) {
        drawSlices();
        drawIndicator();
        dirty = false;
      }
      rafId = requestAnimationFrame(renderLoop);
    }
    rafId = requestAnimationFrame(renderLoop);

    function drawSlices() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.hypot(
        Math.max(cx, canvas.width - cx),
        Math.max(cy, canvas.height - cy),
      );

      for (let i = 0; i < NUM_SLICES; i++) {
        const startAngle = (i * SLICE_ANGLE * Math.PI) / 180;
        const endAngle = ((i + 1) * SLICE_ANGLE * Math.PI) / 180;
        const isCurrent =
          i === currentPos.sliceIndex && currentPos.magnitude > 20;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = isCurrent
          ? "rgba(46, 204, 113, 0.85)"
          : filledSlices.has(i)
            ? "rgba(46, 204, 113, 0.55)"
            : "rgba(255, 255, 255, 0.07)";
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Centre dot
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    function drawIndicator() {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = currentPos.magnitude > 20 ? "#2ecc71" : "#e74c3c";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Orientation handler ───────────────────────────────────────────────
    function onOrientation(event) {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      const angle = ((Math.atan2(gamma, -beta) * 180) / Math.PI + 270) % 360;
      const magnitude = Math.hypot(beta, gamma);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxRadius = Math.min(cx, cy) * 0.8;
      const normalized = Math.min(magnitude / 90, 1);
      const radius = normalized * maxRadius;
      const rad = (angle * Math.PI) / 180;
      const sliceIndex = Math.floor(angle / SLICE_ANGLE);

      currentPos = {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad),
        magnitude,
        sliceIndex,
      };

      if (magnitude > 20) filledSlices.add(sliceIndex);

      // Hide instructions after first real movement
      if (filledSlices.size === 1) instructions.style.display = "none";

      dirty = true;

      if (filledSlices.size === NUM_SLICES) {
        cleanup();
        resolve({
          name: "Gyroscope",
          status: "success",
          details:
            "All orientation segments covered — gyroscope working correctly",
        });
      }
    }

    function cleanup() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("resize", resize);
      gyroDialog.style.display = "none";
    }

    window.addEventListener("resize", resize);
    window.addEventListener("deviceorientation", onOrientation);
  });
}
