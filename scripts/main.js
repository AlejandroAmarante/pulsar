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

// Constants at the top for better maintainability
const TEST_DURATION = 30; // seconds
const DIALOG_IDS = [
  "camera-dialog",
  "touch-dialog",
  "sound-dialog",
  "mic-dialog",
  "color-dialog",
  "vibration-dialog",
  "gyro-dialog",
];

// Group related imports
const sensorTests = {
  gyroscope: { name: "Gyroscope", testFunction: testGyroscope },
  colorScreen: { name: "Color Screen Test", testFunction: testColorScreens },
  touch: { name: "Touch Tracking", testFunction: testTouchTracking },
};

const vibrationTests = {
  short: { name: "Short Vibration", testFunction: testShortVibration },
  medium: { name: "Medium Vibration", testFunction: testMediumVibration },
  long: { name: "Long Vibration", testFunction: testLongVibration },
};

const connectivityTests = {
  geolocation: { name: "Geolocation", testFunction: testGeolocation },
  bluetooth: { name: "Bluetooth", testFunction: testBluetooth },
};

const audioTests = {
  lowFreq: { name: "Low Frequency Sound", testFunction: testLowFrequency },
  midFreq: { name: "Mid Frequency Sound", testFunction: testMidFrequency },
  highFreq: { name: "High Frequency Sound", testFunction: testHighFrequency },
  microphone: { name: "Microphone", testFunction: testMicrophone },
};

const cameraTests = {
  front: { name: "Front Camera", testFunction: testFrontCamera },
  rear: { name: "Rear Camera", testFunction: testRearCamera },
};

// Combine all tests
const testConfigurations = [
  ...Object.values(sensorTests),
  ...Object.values(vibrationTests),
  ...Object.values(connectivityTests),
  ...Object.values(audioTests),
  ...Object.values(cameraTests),
];

class TestUI {
  constructor() {
    this.elements = {
      startButton: document.getElementById("start-test"),
      startButtonText: document.querySelector("#start-test .button-text"),
      buttonLoading: document.querySelector("#start-test .button-loading"),
      testsCard: document.getElementById("tests-card"),
      testsContainer: document.getElementById("tests"),
      redoButton: document.getElementById("redo-test"),
      overlay: document.getElementById("overlay"),
      progressBar: document.getElementById("progress-bar"),
      timerBar: document.getElementById("timer-bar"),
    };

    this.bindEvents();
    this.progressTimer = this.createProgressBarTimer();
  }

  bindEvents() {
    this.elements.startButton.addEventListener("click", async () => {
      console.log("Start button clicked"); // Debug log
      this.elements.startButton.disabled = true;
      await this.runTests();
      this.elements.startButton.disabled = false;
    });

    this.elements.redoButton.addEventListener("click", async () => {
      this.resetTests();
      await this.runTests();
    });
  }

  updateButtonState(isRunning, testName = "") {
    const { startButton, startButtonText, buttonLoading } = this.elements;
    startButton.disabled = isRunning;
    startButtonText.textContent = isRunning ? `Testing ${testName}` : "Start";
    buttonLoading.style.display = isRunning ? "block" : "none";
  }

  createProgressBarTimer() {
    let startTime = null;
    let animationFrameId = null;

    const updateProgressBar = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min((elapsed / TEST_DURATION) * 100, 100);

      this.elements.timerBar.style.display = "block";
      this.elements.timerBar.style.width = `${progress}%`;

      if (elapsed < TEST_DURATION) {
        animationFrameId = requestAnimationFrame(updateProgressBar);
      }
    };

    return {
      start: () => {
        this.elements.timerBar.style.display = "block";
        this.elements.timerBar.style.width = "0%";
        startTime = null;
        animationFrameId = requestAnimationFrame(updateProgressBar);
      },
      stop: () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        this.elements.timerBar.style.display = "none";
        this.elements.timerBar.style.width = "0%";
      },
    };
  }

  async runTests() {
    console.log("Running tests..."); // Debug log
    const results = [];

    this.elements.redoButton.style.display = "none";
    this.elements.overlay.style.display = "flex";

    initializeTestElements(this.elements.testsContainer);

    const statusDots = document.querySelectorAll(".status");

    for (let i = 0; i < testConfigurations.length; i++) {
      const { name, testFunction } = testConfigurations[i];

      this.updateButtonState(true, name);
      hideAllDialogs();
      this.progressTimer.start();

      const result = await this.runSingleTest(testFunction, name);
      this.progressTimer.stop();
      results.push(result);

      this.elements.progressBar.style.width = `${
        ((i + 1) / testConfigurations.length) * 100
      }%`;
      statusDots[i].className = `status ${
        result.success ? "success" : "failure"
      }`;
    }

    this.elements.overlay.style.display = "none";
    hideAllDialogs();
    this.displayTestResults(results);
  }

  async runSingleTest(testFunction, name) {
    try {
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Test timed out")),
            TEST_DURATION * 1000
          )
        ),
      ]);
      return { name, success: true, details: result?.details || "Test Passed" };
    } catch (error) {
      return {
        name,
        success: false,
        details:
          error.message === "Test timed out"
            ? `Test timed out after ${TEST_DURATION} seconds`
            : error.message,
      };
    }
  }

  displayTestResults(results) {
    const { testsCard, testsContainer, redoButton } = this.elements;

    testsCard.querySelector("h2").textContent = "TEST RESULTS";
    testsCard.classList.add("test-results");

    testsContainer.innerHTML = results
      .map(
        (r) => `
    <div class="list-item-row">
      <div class="status ${r.success ? "success" : "failure"}"></div>
      <div>
        <strong>${r.name}</strong><br>
        ${r.details}
      </div>
    </div>
  `
      )
      .join("");

    ui.updateButtonState(false);
    redoButton.style.display = "block";

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  resetTests() {
    const { testsCard, testsContainer, progressBar, redoButton } =
      this.elements;

    redoButton.style.display = "none";
    testsCard.querySelector("h2").textContent = "Available Tests";
    testsCard.classList.remove("test-results");

    initializeTestElements(testsContainer);
    progressBar.style.width = "0%";

    if (typeof cleanupTouchTest === "function") {
      cleanupTouchTest();
    }

    hideAllDialogs();
    getDeviceInfo();
  }
}

function hideAllDialogs() {
  DIALOG_IDS.forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog) dialog.style.display = "none";
  });
}

function initializeTestElements(container) {
  container.innerHTML = testConfigurations
    .map(
      (test) => `
    <div class="list-item-row">
      <div class="status pending"></div>
      <span>${test.name}</span>
    </div>
  `
    )
    .join("");
}

let ui;
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded"); // Debug log
  getDeviceInfo();
  ui = new TestUI();
  initializeTestElements(document.getElementById("tests"));
});
