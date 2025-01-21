import { getDeviceInfo } from "./deviceInfo.js";
import { testMicrophone } from "./microphoneTest.js";
import { testTouchTracking } from "./touchTest.js";
import {
  testShortVibration,
  testMediumVibration,
  testLongVibration,
} from "./vibrationTest.js";
import { testGeolocation } from "./geolocationTest.js";
import { testBluetooth } from "./testBluetooth.js";
import {
  testLowFrequency,
  testMidFrequency,
  testHighFrequency,
} from "./soundTest.js";
import { testFrontCamera } from "./frontCameraTest.js";
import { testRearCamera } from "./rearCameraTest.js";

async function runTests() {
  const tests = [
    testTouchTracking,
    testShortVibration,
    testMediumVibration,
    testLongVibration,
    testGeolocation,
    testBluetooth,
    testLowFrequency,
    testMidFrequency,
    testHighFrequency,
    testFrontCamera,
    testRearCamera,
    testMicrophone,
  ];

  // Button elements
  const startTestButton = document.getElementById("start-test");
  const startTestButtonText =
    startTestButton.getElementsByClassName("button-text")[0];
  const buttonLoading =
    startTestButton.getElementsByClassName("button-loading")[0];

  // Update button state
  function updateButtonState(isRunning, testName = "") {
    startTestButton.disabled = isRunning;
    startTestButtonText.textContent = isRunning
      ? `Testing ${testName}`
      : "Start All Tests";
    buttonLoading.style.display = isRunning ? "block" : "none";
  }

  // Timer progress bar management
  function createProgressBarTimer() {
    const timerProgressBar = document.getElementById("timer-bar");
    let startTime = null;
    let animationFrameId = null;

    function updateProgressBar(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min((elapsed / duration) * 100, 100);

      timerProgressBar.style.display = "block";
      timerProgressBar.style.width = `${progress}%`;

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(updateProgressBar);
      }
    }

    return {
      start: () => {
        timerProgressBar.style.display = "block";
        timerProgressBar.style.width = "0%";
        startTime = null;
        animationFrameId = requestAnimationFrame(updateProgressBar);
      },
      stop: () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        timerProgressBar.style.display = "none";
        timerProgressBar.style.width = "0%";
      },
    };
  }

  // Initialize
  updateButtonState(true);
  const progressTimer = createProgressBarTimer();
  let results = [];
  const progress = document.getElementById("progress");
  const testResults = document.getElementById("test-results");
  const statusDots = document.querySelectorAll(".status");
  const duration = 30;

  for (let i = 0; i < tests.length; i++) {
    // Update button text with current test name
    const currentTestName = tests[i].name
      .replace("test", "")
      .replace(/([A-Z])/g, " $1")
      .trim();
    updateButtonState(true, currentTestName);

    // Cleanup dialogs
    const dialogs = [
      "camera-dialog",
      "touch-dialog",
      "sound-dialog",
      "mic-dialog",
    ];
    dialogs.forEach((dialog) => {
      document.getElementById(dialog).style.display = "none";
    });

    // Start timer for current test
    progressTimer.start();

    const result = await Promise.race([
      tests[i](),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Test timed out")), duration * 1000);
      }),
    ]).catch((error) => ({
      name: tests[i].name || `Test ${i + 1}`,
      success: false,
      details:
        error.message === "Test timed out"
          ? `Test timed out after ${duration} seconds`
          : error.message,
    }));

    // Stop timer after test completion
    progressTimer.stop();

    results.push(result);

    // Update progress and status
    progress.style.width = `${((i + 1) / tests.length) * 100}%`;
    statusDots[i].className = `status ${
      result.success ? "success" : "failure"
    }`;
  }

  // Cleanup dialogs
  const dialogs = [
    "camera-dialog",
    "touch-dialog",
    "sound-dialog",
    "mic-dialog",
    "overlay",
  ];
  dialogs.forEach((dialog) => {
    document.getElementById(dialog).style.display = "none";
  });

  // Display final results
  document.getElementById("results-section").style.display = "block";
  testResults.innerHTML = results
    .map(
      (r) => `
      <div class="result">
        <div class="status ${r.success ? "success" : "failure"}"></div>
        <div>
          <strong>${r.name}</strong><br>
          ${r.details}
        </div>
      </div>
    `
    )
    .join("");

  // Reset button state
  updateButtonState(false);

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

function resetTests() {
  // Reset global variables
  audioContext = null;
  mediaRecorder = null;
  audioChunks = [];
  audioBlob = null;
  audioUrl = null;

  // Clear dynamically created DOM content
  document.getElementById("device-info").innerHTML = "";
  document.getElementById("results-section").style.display = "none";
  document.getElementById("progress").style.width = "0%";

  // Reset all status dots to pending
  document.querySelectorAll(".status").forEach((dot) => {
    dot.className = "status pending";
  });

  // Properly cleanup touch test
  cleanupTouchTest();

  // Reset dialogs
  const dialogs = ["sound-dialog", "touch-dialog", "mic-dialog"];
  dialogs.forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.style.display = "none";
    }
  });

  // Reset overlay
  document.getElementById("overlay").style.display = "none";

  // Reinitialize device information
  getDeviceInfo();
}

getDeviceInfo();

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
