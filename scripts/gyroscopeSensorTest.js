export async function testGyroscope() {
  return new Promise((resolve) => {
    const gyroDialog = document.getElementById("gyro-dialog");
    const canvas = document.getElementById("gyro-canvas");
    const ctx = canvas.getContext("2d");

    // UI elements
    const progressIndicator = document.createElement("div");
    const instructions = document.createElement("div");

    const NUM_SLICES = 16;
    const SLICE_ANGLE = 360 / NUM_SLICES;
    const filledSlices = new Set();

    function setupUI() {
      Object.assign(progressIndicator.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        padding: "10px",
        borderRadius: "5px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: "9999",
        pointerEvents: "none",
      });

      Object.assign(instructions.style, {
        position: "fixed",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        textAlign: "center",
        padding: "10px",
        borderRadius: "5px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: "9999",
        pointerEvents: "none",
      });

      canvas.appendChild(progressIndicator);
      canvas.appendChild(instructions);

      // Set canvas to full window size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.backgroundColor = "#1a1a1a";
    }

    function updateOrientation(event) {
      const beta = event.beta || 0; // Forward/back tilt (-180 to 180)
      const gamma = event.gamma || 0; // Left/right tilt (-90 to 90)

      let angle = ((Math.atan2(gamma, beta) * 180) / Math.PI + 360) % 360;
      const sliceIndex = Math.floor(angle / SLICE_ANGLE);

      // Only fill if the tilt is significant enough
      const tiltMagnitude = Math.sqrt(beta * beta + gamma * gamma);
      if (tiltMagnitude > 20) {
        filledSlices.add(sliceIndex);
      }

      drawSlices();
      updateProgress();
      checkCompletion();
    }

    function drawSlices() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Calculate the radius to reach screen corners
      const radius = Math.sqrt(
        Math.pow(Math.max(centerX, canvas.width - centerX), 2) +
          Math.pow(Math.max(centerY, canvas.height - centerY), 2)
      );

      for (let i = 0; i < NUM_SLICES; i++) {
        const startAngle = (i * SLICE_ANGLE * Math.PI) / 180;
        const endAngle = ((i + 1) * SLICE_ANGLE * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();

        if (filledSlices.has(i)) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.6)"; // Filled slices
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; // Empty slices
        }
        ctx.fill();

        // Draw slice borders
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw center point
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    function updateProgress() {
      const progress = (filledSlices.size / NUM_SLICES) * 100;
      progressIndicator.textContent = `Progress: ${Math.round(progress)}%`;
      updateInstructions(progress);
    }

    function updateInstructions(progress) {
      const messages = {
        30: "Tilt your device in different directions",
        60: "Keep going! Try tilting in the empty sections",
        90: "Almost there! Look for any unfilled slices",
      };

      for (const [threshold, message] of Object.entries(messages)) {
        if (progress < threshold) {
          instructions.textContent = message;
          break;
        }
      }
    }

    function checkCompletion() {
      if (filledSlices.size === NUM_SLICES) {
        cleanup();
        resolve({
          name: "Gyroscope Test",
          success: true,
          details: "Gyroscope calibrated successfully in all directions",
        });
      }
    }

    function cleanup() {
      window.removeEventListener("deviceorientation", updateOrientation);
      gyroDialog.style.display = "none";
      canvas.innerHTML = "";
    }

    // Handle window resize
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawSlices();
    }
    window.addEventListener("resize", handleResize);

    // Initialize
    setupUI();
    gyroDialog.style.display = "block";
    drawSlices();

    // Check if device orientation is available
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", updateOrientation);
    } else {
      cleanup();
      resolve({
        name: "Gyroscope Test",
        success: false,
        details: "Device orientation not supported",
      });
    }
  });
}
