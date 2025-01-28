export async function testGyroscope() {
  return new Promise((resolve) => {
    const gyroDialog = document.getElementById("gyro-dialog");
    const canvas = document.getElementById("gyro-canvas");
    const ctx = canvas.getContext("2d");
    const gyroInstructions = document.getElementById("gyro-instructions");

    gyroDialog.style.display = "block";
    gyroInstructions.textContent = "Tilt the device to test the gyroscope";

    // UI elements

    const NUM_SLICES = 16;
    const SLICE_ANGLE = 360 / NUM_SLICES;
    const filledSlices = new Set();

    let currentPosition = {
      x: 0,
      y: 0,
      magnitude: 0,
      sliceIndex: 0,
    };

    function setupUI() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.backgroundColor = "#1a1a1a";
    }

    function updateOrientation(event) {
      const beta = event.beta || 0; // Forward/back tilt (-180 to 180)
      const gamma = event.gamma || 0; // Left/right tilt (-90 to 90)

      // Calculate angle for both indicator and slices
      // Adjust starting angle by -90 to align with screen orientation
      let angle = ((Math.atan2(gamma, -beta) * 180) / Math.PI + 270) % 360;
      const tiltMagnitude = Math.sqrt(beta * beta + gamma * gamma);

      // Update indicator position
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) * 0.8;
      const normalizedMagnitude = Math.min(tiltMagnitude / 90, 1);
      const radius = normalizedMagnitude * maxRadius;
      const angleRad = (angle * Math.PI) / 180;

      // Calculate slice index based on the same angle
      const sliceIndex = Math.floor(angle / SLICE_ANGLE);

      currentPosition = {
        x: centerX + radius * Math.cos(angleRad),
        y: centerY + radius * Math.sin(angleRad),
        magnitude: tiltMagnitude,
        sliceIndex: sliceIndex,
      };

      // Fill slice if magnitude is sufficient
      if (tiltMagnitude > 20) {
        filledSlices.add(sliceIndex);
      }

      drawSlices();
      drawIndicator();
      updateProgress();
      checkCompletion();
    }

    function drawSlices() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
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

        // Highlight current slice and filled slices differently
        if (
          i === currentPosition.sliceIndex &&
          currentPosition.magnitude > 20
        ) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.8)"; // Current active slice
        } else if (filledSlices.has(i)) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.6)"; // Previously filled slices
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; // Empty slices
        }
        ctx.fill();

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

    function drawIndicator() {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw line from center to indicator
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(currentPosition.x, currentPosition.y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw indicator circle
      ctx.beginPath();
      ctx.arc(currentPosition.x, currentPosition.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = currentPosition.magnitude > 20 ? "#2ecc71" : "#e74c3c";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function updateProgress() {
      const progress = (filledSlices.size / NUM_SLICES) * 100;
      updateInstructions(progress);
    }

    function updateInstructions(progress) {
      if (progress > 0) {
        gyroInstructions.style.display = "none";
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
      window.removeEventListener("resize", handleResize);
      gyroDialog.style.display = "none";
      canvas.innerHTML = "";
    }

    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawSlices();
      drawIndicator();
    }
    window.addEventListener("resize", handleResize);

    // Initialize
    setupUI();
    gyroDialog.style.display = "block";
    drawSlices();

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
