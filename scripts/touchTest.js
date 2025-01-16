export async function testTouchTracking() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("touch-dialog");
    const overlay = document.getElementById("overlay");
    const canvas = document.getElementById("touch-canvas");

    cleanupTouchTest();

    // Calculate grid dimensions based on screen size
    const calculateGrid = () => {
      const minSquareSize = 40; // Minimum size for each square in pixels
      const width = window.innerWidth;
      const height = window.innerHeight;

      const numCols = Math.floor(width / minSquareSize);
      const numRows = Math.floor(height / minSquareSize);

      return {
        numRows,
        numCols,
        squareSize: Math.min(width / numCols, height / numRows),
      };
    };

    const grid = calculateGrid();

    // Configuration
    const config = {
      numRows: grid.numRows,
      numCols: grid.numCols,
      timeoutSeconds: 30,
      minimumCoverage: 1.0,
      squareSize: grid.squareSize,
    };

    // Add UI elements
    const progressIndicator = document.createElement("div");
    const instructions = document.createElement("div");
    setupUI(progressIndicator, instructions, canvas);

    dialog.style.display = "block";
    overlay.style.display = "block";

    const quadrants = [];
    let timeoutId = null;
    const touchedQuadrants = new Set();

    // Create responsive quadrants
    const createQuadrants = () => {
      const fragment = document.createDocumentFragment();

      for (let row = 0; row < config.numRows; row++) {
        for (let col = 0; col < config.numCols; col++) {
          const quadrant = document.createElement("div");
          quadrant.className = "quadrant";
          Object.assign(quadrant.style, {
            width: `${config.squareSize}px`,
            height: `${config.squareSize}px`,
            position: "absolute",
            left: `${config.squareSize * col}px`,
            top: `${config.squareSize * row}px`,
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

    function handleTouch(e) {
      e.preventDefault();
      const touches = e.touches || [e];
      const rect = canvas.getBoundingClientRect();

      for (let touch of touches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          const col = Math.floor(x / config.squareSize);
          const row = Math.floor(y / config.squareSize);
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

      checkCompletion();
    }

    function updateProgress() {
      const progress = (
        (touchedQuadrants.size / quadrants.length) *
        100
      ).toFixed(1);
      progressIndicator.textContent = `Coverage: ${progress}%`;
      updateInstructions(progress, instructions);
    }

    function checkCompletion() {
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

    // Initialize
    createQuadrants();
    updateProgress();

    // Event listeners
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("mousemove", handleTouch);
    canvas._touchHandler = handleTouch;

    // Timeout
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

function setupUI(progressIndicator, instructions, canvas) {
  const uiElements = [
    {
      element: progressIndicator,
      className: "touch-progress",
      styles: {
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
      },
    },
    {
      element: instructions,
      className: "touch-instructions",
      styles: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "#fff",
        textAlign: "center",
        zIndex: "9999",
        pointerEvents: "none",
        padding: "10px",
        borderRadius: "5px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      },
    },
  ];

  uiElements.forEach(({ element, className, styles }) => {
    element.className = className;
    Object.assign(element.style, styles);
    canvas.appendChild(element);
  });
}

function updateInstructions(progress, instructions) {
  const messages = {
    20: "Draw your finger across the screen to test for dead zones",
    50: "Keep going! Make sure to cover all areas",
    85: "Almost there! Check for any missed spots",
    100: "Great coverage! Just a few more spots to check",
  };

  for (const [threshold, message] of Object.entries(messages)) {
    if (progress < threshold) {
      instructions.textContent = message;
      break;
    }
  }
}

function cleanupTouchTest() {
  const canvas = document.getElementById("touch-canvas");
  if (!canvas) return;

  if (canvas._touchHandler) {
    canvas.removeEventListener("touchmove", canvas._touchHandler);
    canvas.removeEventListener("mousemove", canvas._touchHandler);
    delete canvas._touchHandler;
  }

  canvas.innerHTML = "";
}
