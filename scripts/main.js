import { getDeviceInfo } from "./deviceInfo.js";
import { testGeolocation } from "./geolocationTest.js";
import {
  testLowFrequency,
  testMidFrequency,
  testHighFrequency,
} from "./soundTest.js";
import { testMicrophone } from "./microphoneTest.js";
import { testTouchTracking } from "./touchTest.js";
import {
  testShortVibration,
  testMediumVibration,
  testLongVibration,
} from "./vibrationTest.js";
import { testFrontCamera } from "./frontCameraTest.js";
import { testRearCamera } from "./rearCameraTest.js";

async function runTests() {
  const tests = [
    testShortVibration,
    testMediumVibration,
    testLongVibration,
    testFrontCamera,
    testRearCamera,
    testTouchTracking,
    testGeolocation,
    testLowFrequency,
    testMidFrequency,
    testHighFrequency,
    testMicrophone,
  ];

  let startTestButton = document.getElementById("start-test");
  startTestButton.disabled = true;
  let startTestButtonText =
    startTestButton.getElementsByClassName("button-text")[0];
  startTestButtonText.textContent = "Running Tests...";
  let buttonLoading =
    startTestButton.getElementsByClassName("button-loading")[0];
  buttonLoading.style.display = "block";

  let results = [];
  const progress = document.getElementById("progress");
  const testResults = document.getElementById("test-results");
  const statusDots = document.querySelectorAll(".status");
  const duration = 30; // Timer duration in seconds

  for (let i = 0; i < tests.length; i++) {
    // Create a promise that resolves with the test result or rejects after timeout
    const testWithTimeout = async () => {
      let timeoutId;
      // Cleanup any previous tests
      const cameraDialog = document.getElementById("camera-dialog");
      cameraDialog.style.display = "none";
      const touchDialog = document.getElementById("touch-dialog");
      touchDialog.style.display = "none";

      try {
        const result = await Promise.race([
          tests[i](),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error("Test timed out"));
            }, duration * 1000);
          }),
        ]);

        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        // Get the test name from the function or generate a default
        const testName = tests[i].name || `Test ${i + 1}`;
        return {
          name: testName,
          success: false,
          details:
            error.message === "Test timed out"
              ? `Test timed out after ${duration} seconds`
              : error.message,
        };
      }
    };

    const result = await testWithTimeout();
    results.push(result);

    let nextTestIndex = i + 1 < tests.length ? i + 1 : i;
    startTestButtonText.textContent = `Testing ${tests[nextTestIndex].name
      .replace("test", " ")
      .replace(/([A-Z])/g, " $1")
      .trim()}`;

    // Reference to the progress bar
    const progressBar = document.getElementById("timer-bar");
    // Update progress bar width
    let startTime = null;

    function updateProgressBar(timestamp) {
      progressBar.style.display = "block";
      if (!startTime) startTime = timestamp;
      // Calculate elapsed time
      const elapsed = (timestamp - startTime) / 1000;
      // Calculate progress percentage
      const progress = Math.min((elapsed / duration) * 100, 100);
      progressBar.style.width = `${progress}%`;
      // Continue updating if the timer is not complete
      if (elapsed < duration) {
        requestAnimationFrame(updateProgressBar);
      }
    }

    // Start the progress bar animation
    requestAnimationFrame(updateProgressBar);

    // Update progress bar
    progress.style.width = `${((i + 1) / tests.length) * 100}%`;

    // Update status dot
    statusDots[i].className = `status ${
      result.success ? "success" : "failure"
    }`;
  }

  const progressBarContainer = document.getElementById("timer-container");
  progressBarContainer.style.display = "none"; // Hide the progress bar
  // Display results
  document.getElementById("results-section").style.display = "block";
  testResults.innerHTML = results
    .map(
      (r) =>
        `<div class="result">
           <div class="status ${r.success ? "success" : "failure"}"></div>
           <div>
             <strong>${r.name}</strong><br>
             ${r.details}
           </div>
         </div>`
    )
    .join("");

  startTestButton.disabled = false;
  startTestButtonText.textContent = "Start All Tests";
  buttonLoading.style.display = "none";

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
