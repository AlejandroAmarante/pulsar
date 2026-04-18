/**
 * Color Screen Test
 *
 * User confirms each color visually.
 *   All pass  → success
 *   Any fail  → fail
 * No inconclusive path here — user is the sensor.
 */
export async function testColorScreens() {
  return new Promise((resolve) => {
    const colorDialog = document.getElementById("color-dialog");
    const colorScreen = document.getElementById("color-screen");
    const helpText = document.getElementById("help-text");
    const confirmButtons = document.getElementById("color-confirm-buttons");
    const previewControls = document.getElementById("color-preview-controls");
    const yesButton = document.getElementById("color-yes");
    const noButton = document.getElementById("color-no");

    const COLORS = [
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#000000" },
      { name: "Red", value: "#ff0000" },
      { name: "Green", value: "#00ff00" },
      { name: "Blue", value: "#0000ff" },
    ];

    let currentIndex = 0;
    const failedColors = [];
    let controlsVisible = true;

    function showColor(index) {
      colorScreen.style.backgroundColor = COLORS[index].value;
      colorDialog.style.display = "block";

      // Reset controls visibility each new colour
      controlsVisible = true;
      confirmButtons.classList.remove("controls-hidden");
      if (helpText) helpText.classList.remove("help-text-hidden");
      if (previewControls)
        previewControls.classList.remove("preview-controls-hidden");
    }

    function toggleControls() {
      controlsVisible = !controlsVisible;
      confirmButtons.classList.toggle("controls-hidden", !controlsVisible);
      if (helpText)
        helpText.classList.toggle("help-text-hidden", !controlsVisible);
      if (previewControls)
        previewControls.classList.toggle(
          "preview-controls-hidden",
          !controlsVisible,
        );
    }

    function advance(passed) {
      if (!passed) failedColors.push(COLORS[currentIndex].name);
      currentIndex++;

      if (currentIndex >= COLORS.length) {
        cleanup();
        if (failedColors.length === 0) {
          resolve({
            name: "Color Screen Test",
            status: "success",
            details: "All colours displayed correctly",
          });
        } else {
          resolve({
            name: "Color Screen Test",
            status: "fail",
            details: `Defects reported on: ${failedColors.join(", ")}`,
          });
        }
        return;
      }
      showColor(currentIndex);
    }

    function cleanup() {
      colorDialog.style.display = "none";
      colorScreen.removeEventListener("click", toggleControls);
      yesButton.removeEventListener("click", onYes);
      noButton.removeEventListener("click", onNo);
    }

    function onYes() {
      advance(true);
    }
    function onNo() {
      advance(false);
    }

    colorScreen.addEventListener("click", toggleControls);
    yesButton.addEventListener("click", onYes);
    noButton.addEventListener("click", onNo);

    showColor(0);
  });
}
