export async function testTouchTracking() {
  return new Promise((resolve) => {
    const touchDialog = document.getElementById("touch-dialog");
    const canvas = document.getElementById("touch-canvas");
    if (!touchDialog || !canvas) {
      console.error("Required DOM elements not found");
      resolve({
        name: "Touch Tracking",
        success: false,
        details: "Required DOM elements not found",
      });
      return;
    }

    cleanupTouchTest();

    // Calculate grid dimensions based on screen size with min/max constraints
    const calculateGrid = () => {
      const minSquareSize = 60;
      const maxSquareSize = 80;
      const { innerWidth: width, innerHeight: height } = window;

      let bestFit = {
        squareSize: minSquareSize,
        numRows: 0,
        numCols: 0,
        coverage: 0,
      };

      // Use binary search to find optimal square size for better performance
      let low = minSquareSize;
      let high = maxSquareSize;

      while (high - low > 0.5) {
        const size = (low + high) / 2;
        const cols = Math.floor(width / size);
        const rows = Math.floor(height / size);

        const coveredWidth = cols * size;
        const coveredHeight = rows * size;
        const coverage = (coveredWidth * coveredHeight) / (width * height);

        if (cols > 0 && rows > 0) {
          if (coverage > bestFit.coverage) {
            bestFit = {
              squareSize: size,
              numCols: cols,
              numRows: rows,
              coverage,
            };
          }

          // If coverage is above target, try smaller size for more precision
          // Otherwise try larger size for better coverage
          if (coverage > 0.95) {
            high = size;
          } else {
            low = size;
          }
        } else {
          high = size; // Too large, reduce size
        }

        if (bestFit.coverage > 0.99) {
          break;
        }
      }

      // Calculate the actual dimensions to center the grid
      const totalWidth = bestFit.numCols * bestFit.squareSize;
      const totalHeight = bestFit.numRows * bestFit.squareSize;

      return {
        numRows: bestFit.numRows,
        numCols: bestFit.numCols,
        squareSize: bestFit.squareSize,
        totalWidth,
        totalHeight,
      };
    };

    // Configure canvas
    const grid = calculateGrid();
    Object.assign(canvas.style, {
      width: `${grid.totalWidth}px`,
      height: `${grid.totalHeight}px`,
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    });

    const config = {
      numRows: grid.numRows,
      numCols: grid.numCols,
      minimumCoverage: 0.95, // Slightly lower for better user experience
      squareSize: grid.squareSize,
    };

    // Create UI elements
    const progressIndicator = document.createElement("div");
    const instructions = document.createElement("div");
    setupUI(progressIndicator, instructions, canvas);

    touchDialog.style.display = "block";

    // Use DocumentFragment for better performance when creating quadrants
    const createQuadrants = () => {
      const fragment = document.createDocumentFragment();
      const quadrants = [];
      const totalQuadrants = config.numRows * config.numCols;

      // Pre-calculate styles for performance
      const baseStyles = {
        width: `${config.squareSize}px`,
        height: `${config.squareSize}px`,
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgb(245, 245, 245)",
        transition: "background-color 0.2s ease",
      };

      for (let i = 0; i < totalQuadrants; i++) {
        const row = Math.floor(i / config.numCols);
        const col = i % config.numCols;

        const quadrant = document.createElement("div");
        quadrant.className = "quadrant";

        Object.assign(quadrant.style, {
          ...baseStyles,
          left: `${config.squareSize * col}px`,
          top: `${config.squareSize * row}px`,
        });

        fragment.appendChild(quadrant);
        quadrants.push(quadrant);
      }

      canvas.appendChild(fragment);
      return quadrants;
    };

    const quadrants = createQuadrants();
    const touchedQuadrants = new Set();
    let timeoutId = null;
    let isProcessingTouch = false; // Add debounce flag for touch events

    // Throttle touch handling for better performance
    const handleTouch = (() => {
      let lastCall = 0;
      const throttleMs = 16; // ~60fps

      return (e) => {
        e.preventDefault();
        const now = Date.now();

        if (now - lastCall < throttleMs || isProcessingTouch) return;
        lastCall = now;
        isProcessingTouch = true;

        requestAnimationFrame(() => {
          const touches = e.touches || [e];
          const rect = canvas.getBoundingClientRect();
          let changed = false;

          for (const touch of touches) {
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
                quadrants[index].style.backgroundColor =
                  "rgba(46, 204, 113, 0.4)";
                touchedQuadrants.add(index);
                changed = true;
              }
            }
          }

          if (changed) {
            updateProgress();
            checkCompletion();
          }

          isProcessingTouch = false;
        });
      };
    })();

    function updateProgress() {
      const coverage = touchedQuadrants.size / quadrants.length;
      const progressPercent = (coverage * 100).toFixed(1);
      progressIndicator.textContent = `Coverage: ${progressPercent}%`;

      // Update instructions based on progress
      if (coverage < 0.3) {
        instructions.textContent =
          "Draw your finger across the screen to test for dead zones";
      } else if (coverage < 0.6) {
        instructions.textContent = "Keep going! Make sure to cover all areas";
      } else if (coverage < 0.9) {
        instructions.textContent = "Almost there! Check for any missed spots";
      } else {
        instructions.textContent = "Great job covering the screen!";
      }
    }

    function checkCompletion() {
      const coverage = touchedQuadrants.size / quadrants.length;
      if (coverage >= config.minimumCoverage) {
        cleanup();
        resolve({
          name: "Touch Tracking",
          success: true,
          details: `Touch tracking completed with ${(coverage * 100).toFixed(
            1
          )}% coverage`,
        });
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      cleanupTouchTest();
      touchDialog.style.display = "none";
    }

    // Set a timeout for test completion
    timeoutId = setTimeout(() => {
      const coverage = touchedQuadrants.size / quadrants.length;
      cleanup();
      resolve({
        name: "Touch Tracking",
        success: coverage >= 0.7, // Consider partial success
        details: `Touch tracking timed out with ${(coverage * 100).toFixed(
          1
        )}% coverage`,
      });
    }, 60000); // 60 second timeout

    // Initialize
    updateProgress();

    // Use passive: false only for touchmove where preventDefault is needed
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    // Mouse events are passive by default
    canvas.addEventListener("mousemove", handleTouch);

    // Store handler for cleanup
    canvas._touchHandler = handleTouch;
  });
}

function setupUI(progressIndicator, instructions, canvas) {
  // Configure progress indicator
  Object.assign(progressIndicator, {
    id: "touch-progress",
    textContent: "Coverage: 0.0%",
  });

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

  // Configure instructions
  Object.assign(instructions, {
    id: "touch-instructions",
    textContent: "Draw your finger across the screen to test for dead zones",
  });

  Object.assign(instructions.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    padding: "10px",
    borderRadius: "5px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: "9999",
    pointerEvents: "none",
    textAlign: "center",
    maxWidth: "80%",
  });

  // Append elements to canvas
  canvas.appendChild(progressIndicator);
  canvas.appendChild(instructions);
}

function cleanupTouchTest() {
  const canvas = document.getElementById("touch-canvas");
  if (!canvas) return;

  // Proper event cleanup
  if (canvas._touchHandler) {
    canvas.removeEventListener("touchmove", canvas._touchHandler, {
      passive: false,
    });
    canvas.removeEventListener("mousemove", canvas._touchHandler);
    delete canvas._touchHandler;
  }

  // Remove all child elements
  while (canvas.firstChild) {
    canvas.removeChild(canvas.firstChild);
  }
}
