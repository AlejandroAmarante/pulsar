// Camera Test Setup
let cameraTestResult = null;

// Test front camera photo capture
export async function testCameraPhoto() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("camera-dialog");
    const overlay = document.getElementById("overlay");
    dialog.style.display = "flex";
    overlay.style.display = "block";

    // Update dialog content
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    title.textContent = "Camera Test";
    description.textContent =
      "Please take a photo using your camera. Were you able to capture the photo?";

    const takePhotoButton = document.getElementById("take-photo");
    const yesButton = document.getElementById("photo-yes");
    const noButton = document.getElementById("photo-no");

    // Disable Yes/No buttons initially
    yesButton.disabled = true;
    noButton.disabled = true;

    // Remove existing event listeners
    const newTakePhotoButton = takePhotoButton.cloneNode(true);
    takePhotoButton.parentNode.replaceChild(
      newTakePhotoButton,
      takePhotoButton
    );

    // Handle photo capture
    newTakePhotoButton.addEventListener("click", async () => {
      try {
        // Create file input element
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "user"; // Specifically request front camera

        // Trigger file selection/camera
        input.click();

        // Enable Yes/No buttons after photo attempt
        yesButton.disabled = false;
        noButton.disabled = false;

        // Handle file selection
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            // Optional: you could add preview functionality here
            console.log("Photo captured:", file.name);
          }
        };
      } catch (error) {
        console.error("Camera error:", error);
        handleResponse(false);
      }
    });

    function handleResponse(success) {
      dialog.style.display = "none";
      overlay.style.display = "none";
      resolve({
        name: "Camera Photo Test",
        success: success,
        details: `Photo capture: ${success ? "Successful" : "Failed"}`,
      });
    }

    yesButton.onclick = () => handleResponse(true);
    noButton.onclick = () => handleResponse(false);
  });
}
