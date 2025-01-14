// Device Information
function getDeviceInfo() {
  const info = {
    Browser: navigator.userAgent,
    "Screen Resolution": `${window.screen.width}x${window.screen.height}`,
    "Window Size": `${window.innerWidth}x${window.innerHeight}`,
    "Device Pixel Ratio": window.devicePixelRatio,
    Platform: (() => {
      const ua = navigator.userAgent;
      if (/Mobi|Android/i.test(ua)) return "Android";
      if (/Windows Phone/i.test(ua)) return "Windows Phone";
      if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
      if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
      if (/Linux/i.test(ua)) return "Linux";
      if (/Windows NT/i.test(ua)) return "Windows";
      return "Unknown";
    })(),
    "Connection Type": navigator.connection
      ? navigator.connection.effectiveType
      : "Unknown",
  };

  const infoDiv = document.getElementById("device-info");
  infoDiv.innerHTML = ""; // Clear the content before adding new info
  for (const [key, value] of Object.entries(info)) {
    infoDiv.innerHTML += `<p><strong>${key}:</strong> ${value}</p>`;
  }
}

// Sound Test Setup
let audioContext;
let soundTestResult = null;

function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playTestSound() {
  if (!audioContext) initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set frequency to 440 Hz (A4 note)
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

  // Gradually decrease volume
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 1
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 1);
}

async function testSound() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("sound-dialog");
    const overlay = document.getElementById("overlay");
    const playButton = document.getElementById("play-sound");
    const yesButton = document.getElementById("sound-yes");
    const noButton = document.getElementById("sound-no");

    dialog.style.display = "block";
    overlay.style.display = "block";

    playButton.addEventListener("click", playTestSound);

    yesButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      resolve({
        name: "Sound Test",
        success: true,
        details: "Sound playback confirmed by user",
      });
    });

    noButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      resolve({
        name: "Sound Test",
        success: false,
        details: "Sound playback failed or not heard",
      });
    });
  });
}

// Test Functions
async function runTests() {
  const tests = [
    testScreenResolution,
    testOrientation,
    testVibration,
    testTouch,
    testTouchTracking,
    testGeolocation,
    testSound,
    testMicrophone,
  ];

  let results = [];
  const progress = document.getElementById("progress");
  const testResults = document.getElementById("test-results");
  const statusDots = document.querySelectorAll(".status");

  for (let i = 0; i < tests.length; i++) {
    const result = await tests[i]();
    console.log("Test:", i);
    results.push(result);

    // Update progress bar
    progress.style.width = `${((i + 1) / tests.length) * 100}%`;

    // Update status dot
    statusDots[i].className = `status ${
      result.success ? "success" : "failure"
    }`;
  }

  // Display results
  document.getElementById("results-section").style.display = "block";
  testResults.innerHTML = results
    .map(
      (r) =>
        `<div class="result">
                    <div class="status ${
                      r.success ? "success" : "failure"
                    }"></div>
                    <div>
                        <strong>${r.name}</strong><br>
                        ${r.details}
                    </div>
                </div>`
    )
    .join("");

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth", // Smooth scrolling animation
  });
}

async function testScreenResolution() {
  const width = window.screen.width;
  const height = window.screen.height;
  return {
    name: "Screen Resolution",
    success: width > 0 && height > 0,
    details: `Resolution: ${width}x${height}`,
  };
}

async function testOrientation() {
  return {
    name: "Device Orientation",
    success: "orientation" in screen,
    details:
      "orientation" in screen
        ? "Device orientation API supported"
        : "Device orientation API not supported",
  };
}

async function testVibration() {
  return {
    name: "Vibration",
    success: "vibrate" in navigator,
    details:
      "vibrate" in navigator
        ? "Vibration API supported"
        : "Vibration API not supported",
  };
}

async function testTouch() {
  return {
    name: "Touch Support",
    success: "ontouchstart" in window,
    details:
      "ontouchstart" in window
        ? "Touch events supported"
        : "Touch events not supported",
  };
}

async function testTouchTracking() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("touch-dialog");
    const overlay = document.getElementById("overlay");
    const canvas = document.getElementById("touch-canvas");

    dialog.style.display = "block";
    overlay.style.display = "block";

    // Divide canvas into quadrants
    const quadrants = [];
    const numRows = 16; // Number of rows
    const numCols = 8; // Number of columns

    // Create and append quadrants
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const quadrant = document.createElement("div");
        quadrant.className = "quadrant";
        quadrant.style.width = `${100 / numCols}%`;
        quadrant.style.height = `${100 / numRows}%`;
        quadrant.style.position = "absolute";
        quadrant.style.left = `${(100 / numCols) * col}%`;
        quadrant.style.top = `${(100 / numRows) * row}%`;
        quadrant.style.backgroundColor = "white";
        canvas.appendChild(quadrant);
        quadrants.push(quadrant);
      }
    }

    // Track which quadrants have been touched
    const touchedQuadrants = new Set();
    function handleTouch(e) {
      console.log(touchedQuadrants.size);
      e.preventDefault();
      const touches = e.touches || [e];

      for (let touch of touches) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          quadrants.forEach((quadrant, index) => {
            const qRect = quadrant.getBoundingClientRect();
            if (
              x >= qRect.left - rect.left &&
              x <= qRect.right - rect.left &&
              y >= qRect.top - rect.top &&
              y <= qRect.bottom - rect.top
            ) {
              if (!touchedQuadrants.has(index)) {
                quadrant.style.backgroundColor = "green";
                touchedQuadrants.add(index);
              }
            }
          });
        }
      }

      // Check if all quadrants are touched
      if (touchedQuadrants.size === quadrants.length) {
        dialog.style.display = "none";
        touchedQuadrants.clear();
        resolve({
          name: "Touch Tracking",
          success: true,
          details: "All quadrants touched successfully",
        });
      }

      setTimeout(() => {
        resolve({
          name: "Touch Tracking",
          success: false,
          details: "Touch Tracking timed out",
        });
      }, 15000); // 15 seconds timeout
    }

    canvas.addEventListener("touchmove", handleTouch);
    canvas.addEventListener("mousemove", handleTouch);
  });
}

async function testGeolocation() {
  return new Promise((resolve) => {
    if ("geolocation" in navigator) {
      // Timeout to prevent the test from getting stuck indefinitely
      const timeoutId = setTimeout(() => {
        resolve({
          name: "Geolocation",
          success: false,
          details: "Geolocation request timed out",
        });
      }, 10000); // 10 seconds timeout

      // Request geolocation
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId); // Clear the timeout
          resolve({
            name: "Geolocation",
            success: true,
            details: "Geolocation access granted",
          });
        },
        () => {
          clearTimeout(timeoutId); // Clear the timeout
          resolve({
            name: "Geolocation",
            success: false,
            details: "Geolocation access denied",
          });
        }
      );
    } else {
      resolve({
        name: "Geolocation",
        success: false,
        details: "Geolocation API not supported",
      });
    }
  });
}

// Microphone Test Setup
let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;

async function testMicrophone() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("mic-dialog");
    const overlay = document.getElementById("overlay");
    const startButton = document.getElementById("start-recording");
    const playButton = document.getElementById("play-recording");
    const yesButton = document.getElementById("mic-yes");
    const noButton = document.getElementById("mic-no");
    const reRecordButton = document.getElementById("re-record"); // New button for re-record
    const timer = document.getElementById("mic-timer");

    dialog.style.display = "block";
    overlay.style.display = "block";

    let countdown;
    let stream;

    function resetState() {
      // Reset the buttons and timer
      startButton.style.display = "block";
      startButton.disabled = false;
      playButton.style.display = "none";
      yesButton.style.display = "none";
      noButton.style.display = "none";
      reRecordButton.style.display = "none";
      timer.textContent = "";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    }

    startButton.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          audioUrl = URL.createObjectURL(audioBlob);
          playButton.style.display = "block";
          startButton.style.display = "none";
          reRecordButton.style.display = "block"; // Show re-record button
          timer.textContent = "Recording complete";
        });

        // Start recording
        mediaRecorder.start();
        startButton.disabled = true;
        let timeLeft = 5;
        timer.textContent = `Recording: ${timeLeft} seconds`;

        countdown = setInterval(() => {
          timeLeft--;
          timer.textContent = `Recording: ${timeLeft} seconds`;
          if (timeLeft <= 0) {
            clearInterval(countdown);
            mediaRecorder.stop();
            stream.getTracks().forEach((track) => track.stop());
          }
        }, 1000);
      } catch (err) {
        resolve({
          name: "Microphone Test",
          success: false,
          details: "Microphone access denied or not available",
        });
        dialog.style.display = "none";
        overlay.style.display = "none";
      }
    });

    playButton.addEventListener("click", () => {
      const audio = new Audio(audioUrl);
      audio.play();
      yesButton.style.display = "block";
      noButton.style.display = "block";
    });

    yesButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      resolve({
        name: "Microphone Test",
        success: true,
        details: "Recording and playback successful",
      });
    });

    noButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      resolve({
        name: "Microphone Test",
        success: false,
        details: "Recording or playback failed",
      });
    });

    reRecordButton.addEventListener("click", () => {
      // Reset state for re-recording
      resetState();
    });

    // Initialize state
    resetState();
  });
}

// Event Listeners
document.getElementById("start-test").addEventListener("click", async () => {
  document.getElementById("start-test").disabled = true;
  await runTests();
  document.getElementById("start-test").disabled = false;
});

document.getElementById("restart-test").addEventListener("click", async () => {
  document.getElementById("results-section").style.display = "none";
  document.getElementById("progress").style.width = "0%";
  document
    .querySelectorAll(".status")
    .forEach((dot) => (dot.className = "status pending"));
  resetTests();
  await runTests();
});

// Initialize
getDeviceInfo();

function resetTests() {
  // Reset global variables
  audioContext = null;
  soundTestResult = null;
  mediaRecorder = null;
  audioChunks = [];
  audioBlob = null;
  audioUrl = null;

  // Clear dynamically created DOM content
  document.getElementById("device-info").innerHTML = "";
  document.getElementById("results-section").style.display = "none";
  document.getElementById("progress").style.width = "0%";
  document.querySelectorAll(".status").forEach((dot) => {
    dot.className = "status pending";
  });

  // Reset canvas for touch tracking
  const canvas = document.getElementById("touch-canvas");
  if (canvas) {
    canvas.innerHTML = ""; // Remove dynamically created quadrants
  }

  // Reset dialogs
  const dialogs = ["sound-dialog", "touch-dialog", "mic-dialog"];
  dialogs.forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.style.display = "none";
    }
  });

  // Reinitialize device information
  getDeviceInfo();
}
