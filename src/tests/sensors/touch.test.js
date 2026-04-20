/**
 * Touch Tracking Test
 *
 *   ≥ 95% coverage           → success
 *   Timeout with ≥ 50%       → partial (partial, not definitively broken)
 *   Timeout with < 50%       → fail
 */
export function cleanupTouchTest() {
  const canvas = document.getElementById("touch-canvas");
  if (!canvas) return;
  if (canvas._touchHandler) {
    canvas.removeEventListener("touchmove", canvas._touchHandler, {
      passive: false,
    });
    canvas.removeEventListener("mousemove", canvas._touchHandler);
    delete canvas._touchHandler;
  }
  while (canvas.firstChild) canvas.removeChild(canvas.firstChild);
}

export async function testTouchTracking() {
  return new Promise((resolve) => {
    const touchDialog = document.getElementById("touch-dialog");
    const canvas = document.getElementById("touch-canvas");

    if (!touchDialog || !canvas) {
      return resolve({
        name: "Touch Tracking",
        status: "fail",
        details: "Required DOM elements not found",
      });
    }

    cleanupTouchTest();

    // ── Grid calculation ──────────────────────────────────────────────────
    function calculateGrid() {
      const { innerWidth: W, innerHeight: H } = window;
      let best = { squareSize: 60, numRows: 0, numCols: 0, coverage: 0 };
      let lo = 60,
        hi = 80;

      while (hi - lo > 0.5) {
        const size = (lo + hi) / 2;
        const cols = Math.floor(W / size);
        const rows = Math.floor(H / size);
        if (cols > 0 && rows > 0) {
          const coverage = (cols * size * rows * size) / (W * H);
          if (coverage > best.coverage)
            best = { squareSize: size, numCols: cols, numRows: rows, coverage };
          if (coverage > 0.95) hi = size;
          else lo = size;
          if (best.coverage > 0.99) break;
        } else {
          hi = size;
        }
      }
      return best;
    }

    const grid = calculateGrid();
    const { numRows, numCols, squareSize } = grid;
    const totalW = numCols * squareSize;
    const totalH = numRows * squareSize;
    const MINIMUM_COVERAGE = 1.0;

    Object.assign(canvas.style, {
      width: `${totalW}px`,
      height: `${totalH}px`,
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    });

    // ── UI ────────────────────────────────────────────────────────────────
    const progressEl = Object.assign(document.createElement("div"), {
      textContent: "Coverage: 0.0%",
    });
    Object.assign(progressEl.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      padding: "10px",
      borderRadius: "5px",
      background: "rgba(0,0,0,0.7)",
      zIndex: "9999",
      pointerEvents: "none",
    });

    const hintEl = Object.assign(document.createElement("div"), {
      textContent: "Drag your finger across every part of the screen",
    });
    Object.assign(hintEl.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      padding: "10px",
      borderRadius: "5px",
      textAlign: "center",
      background: "rgba(0,0,0,0.7)",
      zIndex: "9999",
      pointerEvents: "none",
      maxWidth: "80%",
    });

    canvas.appendChild(progressEl);
    canvas.appendChild(hintEl);

    // ── Quadrants ─────────────────────────────────────────────────────────
    const fragment = document.createDocumentFragment();
    const quadrants = [];
    const total = numRows * numCols;

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / numCols);
      const col = i % numCols;
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: `${squareSize}px`,
        height: `${squareSize}px`,
        position: "absolute",
        left: `${col * squareSize}px`,
        top: `${row * squareSize}px`,
        backgroundColor: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(245,245,245,0.15)",
        transition: "background-color 0.15s ease",
      });
      fragment.appendChild(el);
      quadrants.push(el);
    }
    canvas.appendChild(fragment);

    const touched = new Set();
    touchDialog.style.display = "block";

    // ── Touch handler (throttled to ~60 fps) ──────────────────────────────
    let lastCall = 0;
    const THROTTLE_MS = 16;

    const handleTouch = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastCall < THROTTLE_MS) return;
      lastCall = now;

      requestAnimationFrame(() => {
        const rect = canvas.getBoundingClientRect();
        const touches = e.touches || [e];
        let changed = false;

        for (const t of touches) {
          const x = t.clientX - rect.left;
          const y = t.clientY - rect.top;
          if (x < 0 || x > rect.width || y < 0 || y > rect.height) continue;

          const col = Math.floor(x / squareSize);
          const row = Math.floor(y / squareSize);
          const index = row * numCols + col;

          if (index >= 0 && index < quadrants.length && !touched.has(index)) {
            quadrants[index].style.backgroundColor = "rgba(46,204,113,0.45)";
            touched.add(index);
            changed = true;
          }
        }

        if (changed) updateProgress();
      });
    };

    function updateProgress() {
      const coverage = touched.size / quadrants.length;
      const pct = (coverage * 100).toFixed(1);
      progressEl.textContent = `Coverage: ${pct}%`;

      if (coverage < 0.3)
        hintEl.textContent = "Drag your finger across every part of the screen";
      else if (coverage < 0.6)
        hintEl.textContent = "Keep going — cover all areas";
      else if (coverage < 0.9)
        hintEl.textContent = "Almost there — check for missed spots";
      else hintEl.textContent = "Great coverage!";

      if (coverage >= MINIMUM_COVERAGE) {
        cleanup();
        resolve({
          name: "Touch Tracking",
          status: "success",
          details: `${pct}% screen coverage — no dead zones detected`,
        });
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      cleanupTouchTest();
      touchDialog.style.display = "none";
    }

    canvas._touchHandler = handleTouch;
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("mousemove", handleTouch);

    // ── Timeout ───────────────────────────────────────────────────────────
    const timeoutId = setTimeout(() => {
      const coverage = touched.size / quadrants.length;
      const pct = (coverage * 100).toFixed(1);
      cleanup();
      resolve({
        name: "Touch Tracking",
        status: coverage >= 0.5 ? "partial" : "fail",
        details:
          coverage >= 0.5
            ? `Timed out at ${pct}% coverage — possible dead zones`
            : `Timed out at ${pct}% coverage — likely touch issues`,
      });
    }, 60_000);
  });
}
