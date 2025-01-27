import { getDeviceInfo } from "./deviceInfo.js";
import { testGyroscope } from "./gyroscopeSensorTest.js";
import { testColorScreens } from "./colorScreenTest.js";
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
import { testMicrophone } from "./microphoneTest.js";

// Define test configurations
const testConfigurations = [
  { name: "Gyroscope", testFunction: testGyroscope },
  { name: "Color Screen Test", testFunction: testColorScreens },
  { name: "Touch Tracking", testFunction: testTouchTracking },
  { name: "Short Vibration", testFunction: testShortVibration },
  { name: "Medium Vibration", testFunction: testMediumVibration },
  { name: "Long Vibration", testFunction: testLongVibration },
  { name: "Geolocation", testFunction: testGeolocation },
  { name: "Bluetooth", testFunction: testBluetooth },
  { name: "Low Frequency Sound", testFunction: testLowFrequency },
  { name: "Mid Frequency Sound", testFunction: testMidFrequency },
  { name: "High Frequency Sound", testFunction: testHighFrequency },
  { name: "Front Camera", testFunction: testFrontCamera },
  { name: "Rear Camera", testFunction: testRearCamera },
  { name: "Microphone", testFunction: testMicrophone },
];

async function runTests() {
  // Button elements
  const startTestButton = document.getElementById("start-test");
  const startTestButtonText =
    startTestButton.getElementsByClassName("button-text")[0];
  const buttonLoading =
    startTestButton.getElementsByClassName("button-loading")[0];
  const testsCard = document.getElementById("tests-card");
  const testsContainer = document.getElementById("tests");
  const redoTestButton = document.getElementById("redo-test");

  redoTestButton.style.display = "none";

  const overlay = document.getElementById("overlay");
  overlay.style.display = "flex";

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
  const duration = 30;

  // Dynamically create test status elements if not already present
  if (testsContainer.children.length === 0) {
    testConfigurations.forEach((test) => {
      const resultElement = document.createElement("div");
      resultElement.className = "list-item-row";
      resultElement.innerHTML = `
        <div class="status pending"></div>
        <span>${test.name}</span>
      `;
      testsContainer.appendChild(resultElement);
    });
  }

  const statusDots = document.querySelectorAll(".status");

  // Change card heading and style during testing
  testsCard.querySelector("h2").textContent = "Available Tests";
  testsCard.classList.remove("test-results");

  for (let i = 0; i < testConfigurations.length; i++) {
    const { name, testFunction } = testConfigurations[i];

    // Update button text with current test name
    updateButtonState(true, name);

    // Cleanup dialogs
    const dialogs = [
      "camera-dialog",
      "touch-dialog",
      "sound-dialog",
      "mic-dialog",
      "color-dialog",
      "vibration-dialog",
    ];
    dialogs.forEach((dialog) => {
      document.getElementById(dialog).style.display = "none";
    });

    // Start timer for current test
    progressTimer.start();

    const result = await Promise.race([
      testFunction(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Test timed out")), duration * 1000);
      }),
    ]).catch((error) => ({
      name: name,
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
    progress.style.width = `${((i + 1) / testConfigurations.length) * 100}%`;
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
    "color-dialog",
    "vibration-dialog",
  ];
  dialogs.forEach((dialog) => {
    document.getElementById(dialog).style.display = "none";
  });

  // Transform the tests card into results view
  testsCard.querySelector("h2").textContent = "Test Results";
  testsCard.classList.add("test-results");
  testsContainer.innerHTML = results
    .map(
      (r) => `
      <div class="list-item-row">
        <div class="status ${r.success ? "success" : "failure"}"></div>
        <div>
          <strong>${r.name}</strong><br>
          ${r.details || (r.success ? "Test Passed" : "Test Failed")}
        </div>
      </div>
    `
    )
    .join("");

  // Reset button state
  updateButtonState(false);
  redoTestButton.style.display = "block";

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

function resetTests() {
  // Reset tests card
  const testsCard = document.getElementById("tests-card");
  const testsContainer = document.getElementById("tests");
  const progress = document.getElementById("progress");
  const redoTestButton = document.getElementById("redo-test");

  redoTestButton.style.display = "none";

  // Restore available tests view
  testsCard.querySelector("h2").textContent = "Available Tests";
  testsCard.classList.remove("test-results");

  // Recreate test status elements
  testsContainer.innerHTML = "";
  testConfigurations.forEach((test) => {
    const resultElement = document.createElement("div");
    resultElement.className = "list-item-row";
    resultElement.innerHTML = `
      <div class="status pending"></div>
      <span>${test.name}</span>
    `;
    testsContainer.appendChild(resultElement);
  });

  // Clear progress
  progress.style.width = "0%";

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

  // Reinitialize device information
  getDeviceInfo();
}

// Event Listeners
document.getElementById("start-test").addEventListener("click", async () => {
  document.getElementById("start-test").disabled = true;
  await runTests();
  document.getElementById("start-test").disabled = false;
});

document.getElementById("redo-test").addEventListener("click", async () => {
  resetTests();
  await runTests();
});

function initializeTests() {
  const testsContainer = document.getElementById("tests");

  // Clear any existing content
  testsContainer.innerHTML = "";

  // Dynamically create test status elements
  testConfigurations.forEach((test) => {
    const resultElement = document.createElement("div");
    resultElement.className = "list-item-row";
    resultElement.innerHTML = `
      <div class="status pending"></div>
      <span>${test.name}</span>
    `;
    testsContainer.appendChild(resultElement);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize device info and tests
  getDeviceInfo();
  initializeTests();
});
