/**
 * color.test.js
 *
 * User confirms each color visually.
 *   All pass → success
 *   Any fail → fail
 */
export async function testColorScreens() {
  return new Promise((resolve) => {
    const colorDialog = document.getElementById("color-dialog");
    const colorScreen = document.getElementById("color-screen");
    const helpText = document.getElementById("color-help-text");
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

      // Reset visibility each new colour
      controlsVisible = true;
      confirmButtons.classList.remove("btn-group--hidden");
      helpText?.classList.remove("hint--hidden");
      previewControls?.classList.remove("preview-bar--hidden");
    }

    function toggleControls() {
      controlsVisible = !controlsVisible;
      confirmButtons.classList.toggle("btn-group--hidden", !controlsVisible);
      helpText?.classList.toggle("hint--hidden", !controlsVisible);
      previewControls?.classList.toggle(
        "preview-bar--hidden",
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
