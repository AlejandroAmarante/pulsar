export async function testColorScreens() {
  return new Promise((resolve) => {
    const colorDialog = document.getElementById("color-dialog");
    const colorScreen = document.getElementById("color-screen");
    const helpText = document.getElementById("help-text");
    const confirmButtons = document.getElementById("color-confirm-buttons");
    const yesButton = document.getElementById("color-yes");
    const noButton = document.getElementById("color-no");
    const colors = [
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#000000" },
      { name: "Red", value: "#ff0000" },
      { name: "Green", value: "#00ff00" },
      { name: "Blue", value: "#0000ff" },
    ];
    let currentColorIndex = 0;
    const failedColors = [];
    let controlsVisible = true;

    function setupColorTest() {
      colorDialog.style.display = "block";
      colorScreen.style.backgroundColor = colors[currentColorIndex].value;

      // Remove previous event listeners to reset toggle state
      colorScreen.removeEventListener("click", toggleControls);
      colorScreen.addEventListener("click", toggleControls);
    }

    function toggleControls() {
      controlsVisible = !controlsVisible;
      confirmButtons.classList.toggle("controls-hidden", !controlsVisible);
      helpText.classList.toggle("help-text-hidden", !controlsVisible);
    }

    function handleColorTestResponse(passed) {
      if (!passed) {
        failedColors.push(colors[currentColorIndex].name);
      }

      currentColorIndex++;
      if (currentColorIndex >= colors.length) {
        if (failedColors.length === 0) {
          resolve({
            name: "Color Screen Test",
            success: true,
            details: "All color screens tested successfully",
          });
        } else {
          resolve({
            name: "Color Screen Test",
            success: false,
            details: `Defects found in: ${failedColors.join(", ")} screen(s)`,
          });
        }
        colorDialog.style.display = "none";
        return;
      }

      setupColorTest();
    }

    function onYesClick() {
      handleColorTestResponse(true);
    }

    function onNoClick() {
      handleColorTestResponse(false);
    }

    yesButton.addEventListener("click", onYesClick);
    noButton.addEventListener("click", onNoClick);
    setupColorTest();
  });
}
