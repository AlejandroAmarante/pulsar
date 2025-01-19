// camera-test.js
export async function testRearCamera() {
  return new Promise((resolve) => {
    // Initialize Lucide icons if needed
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // Get DOM elements after ensuring they exist
    const cameraDialog = document.getElementById("camera-dialog");
    const video = document.getElementById("camera-preview");
    const photoPreview = document.getElementById("photo-preview");
    const captureButton = document.getElementById("capture-button");
    const previewControls = document.getElementById("preview-controls");
    const buttonContainer = document.getElementById("button-container");
    const cameraControls = document.getElementById("camera-controls");
    const retakeButton = document.getElementById("retake-button");
    const acceptButton = document.getElementById("accept-button");
    const rejectButton = document.getElementById("reject-button");
    const helpText = document.getElementById("help-text");

    let stream = null;
    let controlsVisible = true;
    cameraDialog.style.display = "block";

    function toggleControls() {
      controlsVisible = !controlsVisible;
      buttonContainer.classList.toggle("controls-hidden", !controlsVisible);
      helpText.classList.toggle("help-text-hidden", !controlsVisible);
    }

    async function startCamera() {
      try {
        // Stop any existing stream
        stopCamera();

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        video.srcObject = stream;
        await video.play(); // Ensure video starts playing

        video.classList.remove("hidden");
        photoPreview.classList.add("hidden");
        cameraControls.classList.remove("hidden");
        previewControls.classList.add("hidden");
        controlsVisible = true;
      } catch (error) {
        console.error("Error accessing camera:", error);
        resolve({
          name: "Camera Photo Test",
          success: false,
          details: "Failed to access front camera: " + error.message,
        });
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (video.srcObject) {
        video.srcObject = null;
      }
    }

    function takePhoto() {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      photoPreview.src = canvas.toDataURL("image/jpeg", 1);
      video.classList.add("hidden");
      photoPreview.classList.remove("hidden");
      cameraControls.classList.add("hidden");
      previewControls.classList.remove("hidden");

      stopCamera();
    }

    // Event listeners
    captureButton.addEventListener("click", takePhoto);
    photoPreview.addEventListener("click", toggleControls);
    retakeButton.addEventListener("click", startCamera);

    acceptButton.addEventListener("click", () => {
      stopCamera();
      cameraDialog.style.display = "none";
      resolve({
        name: "Rear Camera Photo Test",
        success: true,
        details: "Photo accepted",
        photoData: photoPreview.src,
      });
    });

    rejectButton.addEventListener("click", () => {
      stopCamera();
      cameraDialog.style.display = "none";
      resolve({
        name: "Rear Camera Photo Test",
        success: false,
        details: "Photo rejected",
      });
    });

    // Start camera when initialized
    startCamera();
  });
}
