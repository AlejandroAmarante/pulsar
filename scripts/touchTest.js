export async function testTouchTracking() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("touch-dialog");
    const overlay = document.getElementById("overlay");
    const canvas = document.getElementById("touch-canvas");

    // Clear any existing content and event listeners
    cleanupTouchTest();

    // Add progress indicator
    const progressIndicator = document.createElement("div");
    progressIndicator.className = "touch-progress";
    progressIndicator.style.position = "fixed";
    progressIndicator.style.top = "20px";
    progressIndicator.style.left = "50%";
    progressIndicator.style.transform = "translateX(-50%)";
    progressIndicator.style.color = "#fff";
    progressIndicator.style.padding = "10px";
    progressIndicator.style.borderRadius = "5px";
    progressIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    progressIndicator.style.zIndex = "9999";
    progressIndicator.style.pointerEvents = "none";
    canvas.appendChild(progressIndicator);

    const instructions = document.createElement("div");
    instructions.className = "touch-instructions";
    instructions.style.position = "fixed";
    instructions.style.top = "50%";
    instructions.style.left = "50%";
    instructions.style.transform = "translate(-50%, -50%)";
    instructions.style.color = "#fff";
    instructions.style.textAlign = "center";
    instructions.style.zIndex = "9999";
    instructions.style.pointerEvents = "none";
    instructions.style.padding = "10px";
    instructions.style.borderRadius = "5px";
    instructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    canvas.appendChild(instructions);

    dialog.style.display = "block";
    overlay.style.display = "block";

    // Configuration
    const config = {
      numRows: 16,
      numCols: 8,
      timeoutSeconds: 20,
      minimumCoverage: 1.0, // 85% coverage required for success
    };

    const quadrants = [];
    let timeoutId = null;
    const touchedQuadrants = new Set();

    // Create quadrants with optimized layout calculation
    const createQuadrants = () => {
      const fragment = document.createDocumentFragment();
      const quadrantWidth = 100 / config.numCols;
      const quadrantHeight = 100 / config.numRows;

      for (let row = 0; row < config.numRows; row++) {
        for (let col = 0; col < config.numCols; col++) {
          const quadrant = document.createElement("div");
          quadrant.className = "quadrant";
          Object.assign(quadrant.style, {
            width: `${quadrantWidth}%`,
            height: `${quadrantHeight}%`,
            position: "absolute",
            left: `${quadrantWidth * col}%`,
            top: `${quadrantHeight * row}%`,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgb(245, 245, 245)",
            transition: "background-color 0.2s ease",
          });

          fragment.appendChild(quadrant);
          quadrants.push(quadrant);
        }
      }
      canvas.appendChild(fragment);
    };

    // Optimize touch handling with throttling
    let lastHandleTime = 0;
    const throttleMs = 16; // ~60fps

    function updateProgress() {
      const progress = (
        (touchedQuadrants.size / quadrants.length) *
        100
      ).toFixed(1);
      progressIndicator.textContent = `Coverage: ${progress}%`;

      // Update instructions based on progress
      if (progress < 20) {
        instructions.textContent =
          "Draw your finger across the screen to test for dead zones";
      } else if (progress < 50) {
        instructions.textContent = "Keep going! Make sure to cover all areas";
      } else if (progress < 85) {
        instructions.textContent = "Almost there! Check for any missed spots";
      } else {
        instructions.textContent =
          "Great coverage! Just a few more spots to check";
      }
    }

    function handleTouch(e) {
      const now = Date.now();
      if (now - lastHandleTime < throttleMs) return;
      lastHandleTime = now;

      e.preventDefault();
      const touches = e.touches || [e];
      const rect = canvas.getBoundingClientRect();

      for (let touch of touches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          // Use more efficient quadrant checking
          const col = Math.floor((x / rect.width) * config.numCols);
          const row = Math.floor((y / rect.height) * config.numRows);
          const index = row * config.numCols + col;

          if (
            index >= 0 &&
            index < quadrants.length &&
            !touchedQuadrants.has(index)
          ) {
            quadrants[index].style.backgroundColor = "rgba(46, 204, 113, 0.4)";
            touchedQuadrants.add(index);
            updateProgress();
          }
        }
      }

      // Check completion
      // Check completion
      if (touchedQuadrants.size >= quadrants.length * config.minimumCoverage) {
        cleanup();
        resolve({
          name: "Touch Tracking",
          success: true,
          details: `Touch tracking completed with ${(
            (touchedQuadrants.size / quadrants.length) *
            100
          ).toFixed(1)}% coverage`,
        });
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      cleanupTouchTest();
      dialog.style.display = "none";
      overlay.style.display = "none";
    }

    // Initialize test
    createQuadrants();
    updateProgress();

    // Add event listeners with named functions for proper cleanup
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("mousemove", handleTouch);

    // Store the event listeners and handler function on the canvas element
    canvas._touchHandler = handleTouch;
    // Set timeout
    timeoutId = setTimeout(() => {
      const coverage = (
        (touchedQuadrants.size / quadrants.length) *
        100
      ).toFixed(1);
      cleanup();
      resolve({
        name: "Touch Tracking",
        success: false,
        details: `Touch tracking timed out with ${coverage}% coverage`,
      });
    }, config.timeoutSeconds * 1000);
  });
}

function cleanupTouchTest() {
  const canvas = document.getElementById("touch-canvas");
  if (!canvas) return;

  // Remove event listeners if they exist
  if (canvas._touchHandler) {
    canvas.removeEventListener("touchmove", canvas._touchHandler);
    canvas.removeEventListener("mousemove", canvas._touchHandler);
    delete canvas._touchHandler;
  }

  // Clear the canvas content
  canvas.innerHTML = "";
}
