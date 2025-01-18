// Camera Test with Fullscreen Preview
export async function testCameraPhoto() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("camera-dialog");
    const fullscreenDialog = document.getElementById("photo-fullscreen-dialog");
    const photoPreview = document.getElementById("photo-preview");
    const controlsContainer = document.getElementById("photo-controls");
    const helpText = document.getElementById("help-text");
    const overlay = document.getElementById("overlay");
    let controlsVisible = true;
    overlay.style.display = "block";

    dialog.style.display = "flex";
    fullscreenDialog.style.display = "none";

    // Update initial dialog content
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    title.textContent = "Camera Test";
    description.textContent = "Please take a photo using your camera.";

    function toggleControls() {
      controlsVisible = !controlsVisible;
      controlsContainer.style.opacity = controlsVisible ? "1" : "0";
      controlsContainer.style.transform = controlsVisible
        ? "translateY(0)"
        : "translateY(100%)";
      helpText.style.opacity = controlsVisible ? "1" : "0";
    }

    // Setup fullscreen dialog interactions
    fullscreenDialog.addEventListener("click", (e) => {
      // Only toggle if clicking the dialog background or image
      if (e.target === fullscreenDialog || e.target === photoPreview) {
        toggleControls();
      }
    });

    // Handle photo capture
    const takePhotoButton = document.getElementById("take-photo");
    takePhotoButton.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "user";

      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            photoPreview.src = e.target.result;
            dialog.style.display = "none";
            overlay.style.display = "none";
            fullscreenDialog.style.display = "flex";
            controlsVisible = true;
            controlsContainer.style.opacity = "1";
            controlsContainer.style.transform = "translateY(0)";
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    // Handle retake
    const retakeButton = document.getElementById("retake-photo");
    retakeButton.onclick = () => {
      fullscreenDialog.style.display = "none";
      dialog.style.display = "flex";
      photoPreview.src = "";
    };

    // Handle pass/fail
    const passButton = document.getElementById("pass-photo");
    const failButton = document.getElementById("fail-photo");

    passButton.onclick = () => {
      fullscreenDialog.style.display = "none";
      resolve({
        name: "Camera Photo Test",
        success: true,
        details: "Photo test passed",
      });
    };

    failButton.onclick = () => {
      fullscreenDialog.style.display = "none";
      resolve({
        name: "Camera Photo Test",
        success: false,
        details: "Photo test failed",
      });
    };
  });
}
