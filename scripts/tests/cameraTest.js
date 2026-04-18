/**
 * Shared camera test logic.
 * @param {'user'|'environment'} facingMode
 * @param {string} label  – e.g. "Front" or "Rear"
 */
export async function cameraTest(facingMode, label) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("camera-dialog");
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

    dialog.style.display = "block";

    function toggleControls() {
      controlsVisible = !controlsVisible;
      buttonContainer.classList.toggle("controls-hidden", !controlsVisible);
      if (helpText)
        helpText.classList.toggle("help-text-hidden", !controlsVisible);
    }

    async function startCamera() {
      stopCamera();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        video.srcObject = stream;
        await video.play();
        video.classList.remove("hidden");
        photoPreview.classList.add("hidden");
        cameraControls.classList.remove("hidden");
        previewControls.classList.add("hidden");
        controlsVisible = true;
      } catch (error) {
        cleanup();
        const isPermission =
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError";
        resolve({
          status: isPermission ? "inconclusive" : "fail",
          details: isPermission
            ? "Permission denied — cannot verify hardware"
            : error.message,
        });
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (video.srcObject) {
        video.srcObject = null;
        video.load();
      }
    }

    function takePhoto() {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      photoPreview.src = canvas.toDataURL("image/jpeg", 0.92);
      video.classList.add("hidden");
      photoPreview.classList.remove("hidden");
      cameraControls.classList.add("hidden");
      previewControls.classList.remove("hidden");
      stopCamera();
    }

    function cleanup() {
      stopCamera();
      captureButton.removeEventListener("click", takePhoto);
      photoPreview.removeEventListener("click", toggleControls);
      retakeButton.removeEventListener("click", startCamera);
      dialog.style.display = "none";
    }

    captureButton.addEventListener("click", takePhoto);
    photoPreview.addEventListener("click", toggleControls);
    retakeButton.addEventListener("click", startCamera);

    acceptButton.addEventListener("click", () => {
      cleanup();
      resolve({ status: "success", details: "Photo captured and accepted" });
    });

    rejectButton.addEventListener("click", () => {
      cleanup();
      resolve({ status: "fail", details: "Photo captured but rejected" });
    });

    startCamera();
  });
}
