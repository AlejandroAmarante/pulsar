export async function testGyroscope() {
  return new Promise((resolve) => {
    const gyroDialog = document.getElementById("gyro-dialog");
    const canvas = document.getElementById("gyro-canvas");
    const ctx = canvas.getContext("2d");

    // UI elements
    const progressIndicator = document.createElement("div");
    const instructions = document.createElement("div");

    let orientationData = {
      alpha: 0, // z-axis rotation
      beta: 0, // x-axis rotation
      gamma: 0, // y-axis rotation
    };

    // Track rotation ranges
    let rotationRanges = {
      alpha: { min: 360, max: 0 },
      beta: { min: 180, max: -180 },
      gamma: { min: 90, max: -90 },
    };

    // Required coverage for each axis (in degrees)
    const requiredCoverage = {
      alpha: 270, // Expect most of full rotation
      beta: 135, // Expect significant tilt forward/backward
      gamma: 90, // Expect significant tilt left/right
    };

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
        color: "#fff",
      });

      canvas.appendChild(progressIndicator);
      canvas.appendChild(instructions);

      // Set canvas size
      canvas.width = window.innerWidth * 0.8;
      canvas.height = window.innerHeight * 0.6;
      canvas.style.backgroundColor = "#1a1a1a";
    }

    function updateOrientation(event) {
      orientationData = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      };

      // Update ranges
      rotationRanges.alpha.min = Math.min(
        rotationRanges.alpha.min,
        event.alpha
      );
      rotationRanges.alpha.max = Math.max(
        rotationRanges.alpha.max,
        event.alpha
      );
      rotationRanges.beta.min = Math.min(rotationRanges.beta.min, event.beta);
      rotationRanges.beta.max = Math.max(rotationRanges.beta.max, event.beta);
      rotationRanges.gamma.min = Math.min(
        rotationRanges.gamma.min,
        event.gamma
      );
      rotationRanges.gamma.max = Math.max(
        rotationRanges.gamma.max,
        event.gamma
      );

      updateProgress();
      drawOrientation();
      checkCompletion();
    }

    function calculateCoverage() {
      return {
        alpha: rotationRanges.alpha.max - rotationRanges.alpha.min,
        beta: rotationRanges.beta.max - rotationRanges.beta.min,
        gamma: rotationRanges.gamma.max - rotationRanges.gamma.min,
      };
    }

    function updateProgress() {
      const coverage = calculateCoverage();
      const progress = {
        alpha: Math.min(100, (coverage.alpha / requiredCoverage.alpha) * 100),
        beta: Math.min(100, (coverage.beta / requiredCoverage.beta) * 100),
        gamma: Math.min(100, (coverage.gamma / requiredCoverage.gamma) * 100),
      };

      const avgProgress = (progress.alpha + progress.beta + progress.gamma) / 3;
      progressIndicator.textContent =
        `Progress: ${Math.round(avgProgress)}%\n` +
        `Rotation: ${Math.round(progress.alpha)}%\n` +
        `Tilt: ${Math.round(progress.beta)}%\n` +
        `Roll: ${Math.round(progress.gamma)}%`;

      updateInstructions(avgProgress);
    }

    function updateInstructions(progress) {
      const messages = {
        30: "Rotate your device in all directions",
        60: "Try tilting forward and backward",
        90: "Now roll side to side",
      };

      for (const [threshold, message] of Object.entries(messages)) {
        if (progress < threshold) {
          instructions.textContent = message;
          break;
        }
      }
    }

    function drawOrientation() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw device representation
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const deviceWidth = 100;
      const deviceHeight = 180;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Apply rotations
      ctx.rotate((orientationData.alpha * Math.PI) / 180);
      ctx.rotate((orientationData.beta * Math.PI) / 180);
      ctx.rotate((orientationData.gamma * Math.PI) / 180);

      // Draw device
      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        -deviceWidth / 2,
        -deviceHeight / 2,
        deviceWidth,
        deviceHeight
      );

      // Draw screen indicator
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(
        -deviceWidth / 4,
        -deviceHeight / 4,
        deviceWidth / 2,
        deviceHeight / 2
      );

      ctx.restore();
    }

    function checkCompletion() {
      const coverage = calculateCoverage();
      const isComplete =
        coverage.alpha >= requiredCoverage.alpha &&
        coverage.beta >= requiredCoverage.beta &&
        coverage.gamma >= requiredCoverage.gamma;

      if (isComplete) {
        cleanup();
        resolve({
          name: "Gyroscope Test",
          success: true,
          details: `Gyroscope calibrated successfully with full range of motion`,
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
