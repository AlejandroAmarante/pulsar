export async function testGyroscope() {
  return new Promise((resolve) => {
    const gyroDialog = document.getElementById("gyro-dialog");
    const canvas = document.getElementById("gyro-canvas");
    const ctx = canvas.getContext("2d");

    // UI elements
    const progressIndicator = document.createElement("div");
    const instructions = document.createElement("div");

    // Track visited angles in 10-degree segments
    const angleSegments = new Set();
    const TOTAL_SEGMENTS = 648; // (360° × 180°) / 100° segments
    const SEGMENT_SIZE = 10; // degrees

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

      // Make canvas square
      const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
      canvas.width = size;
      canvas.height = size;
      canvas.style.backgroundColor = "#1a1a1a";
    }

    function updateOrientation(event) {
      // Normalize angles to 0-360 range
      const alpha = ((event.alpha || 0) + 360) % 360;
      const beta = ((event.beta || 0) + 180) % 360;

      // Add segment to visited set
      const segment = getSegment(alpha, beta);
      angleSegments.add(segment);

      drawRadialIndicator(alpha, beta);
      updateProgress();
      checkCompletion();
    }

    function getSegment(alpha, beta) {
      // Convert angles to segment indices
      const alphaSegment = Math.floor(alpha / SEGMENT_SIZE);
      const betaSegment = Math.floor(beta / SEGMENT_SIZE);
      return `${alphaSegment},${betaSegment}`;
    }

    function drawRadialIndicator(alpha, beta) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;

      // Draw background grid
      ctx.beginPath();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;

      // Draw concentric circles
      for (let r = radius / 4; r <= radius; r += radius / 4) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw radial lines
      for (let angle = 0; angle < 360; angle += 30) {
        const radian = (angle * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + radius * Math.cos(radian),
          centerY + radius * Math.sin(radian)
        );
        ctx.stroke();
      }

      // Draw visited segments
      ctx.fillStyle = "rgba(46, 204, 113, 0.2)";
      angleSegments.forEach((segment) => {
        const [alphaIdx, betaIdx] = segment.split(",").map(Number);
        const segAlpha = (alphaIdx * SEGMENT_SIZE * Math.PI) / 180;
        const segBeta = (betaIdx * SEGMENT_SIZE * Math.PI) / 180;

        ctx.beginPath();
        ctx.arc(
          centerX + ((radius * betaIdx) / 36) * Math.cos(segAlpha),
          centerY + ((radius * betaIdx) / 36) * Math.sin(segAlpha),
          5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Draw current position indicator
      ctx.beginPath();
      ctx.fillStyle = "#2ecc71";
      ctx.arc(
        centerX + ((radius * beta) / 180) * Math.cos((alpha * Math.PI) / 180),
        centerY + ((radius * beta) / 180) * Math.sin((alpha * Math.PI) / 180),
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    function updateProgress() {
      const progress = (angleSegments.size / TOTAL_SEGMENTS) * 100;
      progressIndicator.textContent = `Coverage: ${Math.round(progress)}%`;
      updateInstructions(progress);
    }

    function updateInstructions(progress) {
      const messages = {
        30: "Tilt your device in different directions",
        60: "Keep going! Try to fill in the empty areas",
        90: "Almost there! Check for any gaps",
      };

      for (const [threshold, message] of Object.entries(messages)) {
        if (progress < threshold) {
          instructions.textContent = message;
          break;
        }
      }
    }

    function checkCompletion() {
      const coverage = angleSegments.size / TOTAL_SEGMENTS;
      if (coverage >= 0.75) {
        // 75% coverage required
        cleanup();
        resolve({
          name: "Gyroscope Test",
          success: true,
          details: `Gyroscope calibrated successfully with ${Math.round(
            coverage * 100
          )}% coverage`,
        });
      }
    }

    function cleanup() {
      window.removeEventListener("deviceorientation", updateOrientation);
      gyroDialog.style.display = "none";
      canvas.innerHTML = "";
    }

    // Initialize
    setupUI();
    gyroDialog.style.display = "block";

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
