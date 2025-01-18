export async function testCameraPhoto() {
  return new Promise((resolve) => {
    // Import required Lucide icons
    const { createIcons, Camera, RotateCcw, Check, X } = lucide;

    // Create and inject HTML structure
    const cameraUI = document.createElement("div");
    cameraUI.innerHTML = `
      <div id="camera-container" class="camera-container">
        <video id="camera-preview" autoplay playsinline></video>
        <div id="camera-controls" class="camera-controls">
          <button id="capture-button" class="capture-button" aria-label="Take photo">
            <i data-lucide="camera"></i>
          </button>
        </div>
        <div id="preview-controls" class="preview-controls hidden">
          <p id="help-text" class="help-text">Tap the photo to hide/show buttons</p>
          <div id="button-container" class="button-container">
            <button id="retake-button" class="action-button" aria-label="Retake photo">
              <i data-lucide="rotate-ccw"></i>
            </button>
            <button id="accept-button" class="action-button" aria-label="Accept photo">
              <i data-lucide="check"></i>
            </button>
            <button id="reject-button" class="action-button" aria-label="Reject photo">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>
        <img id="photo-preview" class="photo-preview hidden" />
      </div>
    `;
    document.body.appendChild(cameraUI);

    // Initialize Lucide icons
    createIcons();

    // Add styles
    const styles = document.createElement("style");
    styles.textContent = `
      .camera-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 9999;
      }

      #camera-preview, .photo-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .camera-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
      }

      .capture-button {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: white;
        border: none;
        padding: 0;
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .capture-button i {
        width: 32px;
        height: 32px;
        color: #000;
      }

      .preview-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 2rem;
        background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
      }

      .button-container {
        display: flex;
        justify-content: space-around;
        align-items: center;
        transition: opacity 0.3s, transform 0.3s;
      }

      .help-text {
        text-align: center;
        color: white;
        margin: 0 0 1rem 0;
        font-size: 14px;
        opacity: 0.8;
        transition: opacity 0.3s;
      }

      .action-button {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(4px);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .action-button i {
        width: 24px;
        height: 24px;
        color: white;
      }

      .hidden {
        display: none;
      }

      .controls-hidden {
        transform: translateY(100%);
        opacity: 0;
      }

      .help-text-hidden {
        opacity: 0;
      }
    `;
    document.head.appendChild(styles);

    // Get DOM elements
    const container = document.getElementById("camera-container");
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

    // Toggle controls visibility
    function toggleControls() {
      controlsVisible = !controlsVisible;
      buttonContainer.classList.toggle("controls-hidden", !controlsVisible);
      helpText.classList.toggle("help-text-hidden", !controlsVisible);
    }

    // Camera handling functions
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        video.srcObject = stream;
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
    }

    function takePhoto() {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      photoPreview.src = canvas.toDataURL("image/jpeg", 0.8);
      video.classList.add("hidden");
      photoPreview.classList.remove("hidden");
      cameraControls.classList.add("hidden");
      previewControls.classList.remove("hidden");

      stopCamera();
    }

    // Event listeners
    captureButton.addEventListener("click", takePhoto);
    photoPreview.addEventListener("click", toggleControls);

    retakeButton.addEventListener("click", () => {
      startCamera();
    });

    acceptButton.addEventListener("click", () => {
      stopCamera();
      container.remove();
      styles.remove();
      resolve({
        name: "Camera Photo Test",
        success: true,
        details: "Photo accepted",
        photoData: photoPreview.src,
      });
    });

    rejectButton.addEventListener("click", () => {
      stopCamera();
      container.remove();
      styles.remove();
      resolve({
        name: "Camera Photo Test",
        success: false,
        details: "Photo rejected",
      });
    });

    // Start camera when initialized
    startCamera();
  });
}
