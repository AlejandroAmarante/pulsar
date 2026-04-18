import { getDeviceInfo } from "./deviceInfo.js";
import { testGyroscope } from "./tests/testGyroscope.js";
import { testColorScreens } from "./tests/testScreenColor.js";
import { testTouchTracking, cleanupTouchTest } from "./tests/testTouch.js";
import {
  testShortVibration,
  testMediumVibration,
  testLongVibration,
} from "./tests/vibrationTest.js";
import { testGeolocation } from "./tests/testGeolocation.js";
import { testBluetooth } from "./tests/testBluetooth.js";
import {
  testLowFrequency,
  testMidFrequency,
  testHighFrequency,
} from "./tests/testSound.js";
import { testFrontCamera } from "./tests/testFrontCamera.js";
import { testRearCamera } from "./tests/testRearCamera.js";
import { testMicrophone } from "./tests/testMicrophone.js";

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── Test registry ────────────────────────────────────────────────────────────
const TEST_CATEGORIES = {
  sensors: {
    gyroscope: { name: "Gyroscope", testFunction: testGyroscope },
    colorScreen: { name: "Color Screen", testFunction: testColorScreens },
    touch: { name: "Touch Tracking", testFunction: testTouchTracking },
  },
  vibration: {
    short: { name: "Short Vibration", testFunction: testShortVibration },
    medium: { name: "Medium Vibration", testFunction: testMediumVibration },
    long: { name: "Long Vibration", testFunction: testLongVibration },
  },
  connectivity: {
    geolocation: { name: "Geolocation", testFunction: testGeolocation },
    bluetooth: { name: "Bluetooth", testFunction: testBluetooth },
  },
  audio: {
    lowFreq: { name: "Low Frequency", testFunction: testLowFrequency },
    midFreq: { name: "Mid Frequency", testFunction: testMidFrequency },
    highFreq: { name: "High Frequency", testFunction: testHighFrequency },
    microphone: { name: "Microphone", testFunction: testMicrophone },
  },
  camera: {
    front: { name: "Front Camera", testFunction: testFrontCamera },
    rear: { name: "Rear Camera", testFunction: testRearCamera },
  },
};

const TEST_CONFIGURATIONS = Object.values(TEST_CATEGORIES).flatMap((cat) =>
  Object.values(cat),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a result status to the CSS class used on .status dots.
 * @param {'success'|'fail'|'inconclusive'} status
 */
function toStatusClass(status) {
  if (status === "success") return "success";
  if (status === "fail") return "failure";
  return "inconclusive";
}

// ─── TestRunner ───────────────────────────────────────────────────────────────
class TestRunner {
  constructor() {
    this.els = this.cacheDOMElements();
    this.progressTimer = this.createProgressTimer();
    this.bindEventListeners();
  }

  cacheDOMElements() {
    return {
      startButton: document.getElementById("start-test"),
      btnLabel: document.querySelector("#start-test .btn-label"),
      testsContainer: document.getElementById("tests"),
      testsLabel: document.getElementById("tests-label"),
      testCount: document.getElementById("test-count"),
      overlay: document.getElementById("overlay"),
      timerBar: document.getElementById("timer-bar"),
    };
  }

  bindEventListeners() {
    this.els.startButton.addEventListener("click", () =>
      this.handleStartClick(),
    );

    // Clicking anywhere on a row triggers that test
    this.els.testsContainer.addEventListener("click", (e) => {
      const row = e.target.closest("[data-test-index]");
      if (!row || this.els.startButton.disabled) return;
      const index = parseInt(row.dataset.testIndex, 10);
      if (!isNaN(index)) this.runSingleTest(index);
    });
  }
  // ── Button state ──────────────────────────────────────────────────────────

  handleStartClick() {
    this.resetTestEnvironment();
    this.startTests();
  }

  updateButtonState(isRunning, testName = "") {
    const { startButton, btnLabel } = this.els;
    startButton.disabled = isRunning;
    if (isRunning) {
      startButton.classList.add("btn--loading");
      btnLabel.textContent = testName || "Running…";
    } else {
      startButton.classList.remove("btn--loading");
      btnLabel.textContent = "Run Tests";
    }
  }

  // ── Progress timer ────────────────────────────────────────────────────────

  createProgressTimer() {
    let startTime = null;
    let rafId = null;

    const tick = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = (ts - startTime) / 1000;
      const pct = Math.min((elapsed / TEST_DURATION) * 100, 100);
      this.els.timerBar.style.width = `${pct}%`;
      if (elapsed < TEST_DURATION) rafId = requestAnimationFrame(tick);
    };

    return {
      start: () => {
        this.els.timerBar.style.width = "0%";
        startTime = null;
        rafId = requestAnimationFrame(tick);
      },
      stop: () => {
        cancelAnimationFrame(rafId);
        this.els.timerBar.style.width = "0%";
      },
    };
  }

  // ── Test flow ─────────────────────────────────────────────────────────────

  async startTests() {
    this.els.overlay.style.display = "flex";
    const results = await this.executeAllTests();
    this.displayResults(results);
  }

  async executeAllTests() {
    const results = [];
    const total = TEST_CONFIGURATIONS.length;

    for (const [
      index,
      { name, testFunction },
    ] of TEST_CONFIGURATIONS.entries()) {
      this.updateButtonState(true, name);
      this.hideAllDialogs();
      this.progressTimer.start();

      const result = await this.executeSingleTest(testFunction, name);
      this.progressTimer.stop();

      results.push(result);
      this.updateTestCount(index + 1, total);

      const statusDots = document.querySelectorAll("#tests .status");
      if (statusDots[index]) {
        statusDots[index].className = `status ${toStatusClass(result.status)}`;
      }
    }

    this.els.overlay.style.display = "none";
    this.hideAllDialogs();
    return results;
  }

  /**
   * Runs one test function, normalises the result to the three-state system,
   * and catches timeouts / thrown errors as inconclusive.
   */
  async executeSingleTest(testFunction, testName) {
    try {
      const result = await Promise.race([
        testFunction(),
        this.createTimeoutPromise(),
      ]);

      // Support legacy boolean `success` field from any un-migrated tests
      const status =
        result?.status ??
        (result?.success === true
          ? "success"
          : result?.success === false
            ? "fail"
            : "inconclusive");

      return {
        name: testName,
        status,
        details: result?.details || "Test completed",
      };
    } catch (error) {
      return {
        name: testName,
        status: "inconclusive",
        details: this.formatErrorMessage(error),
      };
    }
  }

  async runSingleTest(index) {
    const { name, testFunction } = TEST_CONFIGURATIONS[index];

    this.els.overlay.style.display = "flex";
    this.updateButtonState(true, name);
    this.hideAllDialogs();
    this.progressTimer.start();

    const result = await this.executeSingleTest(testFunction, name);

    this.progressTimer.stop();
    this.els.overlay.style.display = "none";
    this.hideAllDialogs();
    this.updateButtonState(false);

    const row = this.els.testsContainer.querySelector(
      `[data-test-index="${index}"]`,
    );
    if (!row) return;

    row.classList.add("result-row");
    row.setAttribute("aria-label", `Re-run ${result.name}`);
    row.innerHTML = `
  <div class="status ${toStatusClass(result.status)}"></div>
  <div>
    <strong>${result.name}</strong>
    <span class="result-detail">${result.details}</span>
  </div>
  <i class="ri-restart-line row-icon"></i>
`;

    const completed = document.querySelectorAll(
      "#tests .status.success, #tests .status.failure, #tests .status.inconclusive",
    ).length;
    this.els.testsLabel.classList.add("active");
    this.updateTestCount(completed, TEST_CONFIGURATIONS.length);
    this.els.btnLabel.textContent = "Run Tests";
  }

  createTimeoutPromise() {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Test timed out")),
        TEST_DURATION * 1000,
      ),
    );
  }

  formatErrorMessage(error) {
    return error.message === "Test timed out"
      ? `Timed out after ${TEST_DURATION}s — result inconclusive`
      : `Error: ${error.message}`;
  }

  // ── Progress bar ──────────────────────────────────────────────────────────

  updateTestCount(completed, total) {
    if (this.els.testCount) {
      this.els.testCount.textContent = `${completed} / ${total}`;
    }

    const passed = document.querySelectorAll("#tests .status.success").length;
    const failed = document.querySelectorAll("#tests .status.failure").length;
    const inconclusive = document.querySelectorAll(
      "#tests .status.inconclusive",
    ).length;

    // Progress bar: green | yellow | red | grey
    const successPct = (passed / total) * 100;
    const inconclusivePct = ((passed + inconclusive) / total) * 100;
    const completedPct = ((passed + failed + inconclusive) / total) * 100;

    this.els.testsLabel.style.setProperty(
      "--success-progress",
      `${successPct}%`,
    );
    this.els.testsLabel.style.setProperty(
      "--inconclusive-progress",
      `${inconclusivePct}%`,
    );
    this.els.testsLabel.style.setProperty(
      "--completed-progress",
      `${completedPct}%`,
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────

  displayResults(results) {
    const { testsLabel, testsContainer } = this.els;
    if (testsLabel) testsLabel.textContent = "Results";
    this.els.testsLabel.classList.add("active");

    testsContainer.innerHTML = results
      .map((result, index) => this.createResultHTML(result, index))
      .join("");

    this.updateButtonState(false);
    this.els.btnLabel.textContent = "Re-run Tests";
    const btnIcon = this.els.startButton.querySelector(".btn-icon");
    if (btnIcon) btnIcon.className = "ri-restart-line btn-icon";

    const passed = results.filter((r) => r.status === "success").length;
    const inconclusive = results.filter(
      (r) => r.status === "inconclusive",
    ).length;
    if (this.els.testCount) {
      this.els.testCount.textContent = `${passed} passed · ${inconclusive} inconclusive · ${results.length - passed - inconclusive} failed`;
    }

    // Sync the progress bar to final tallies
    this.updateTestCount(results.length, results.length);

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  createResultHTML(result, index) {
    return `
    <div class="list-item-row result-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Re-run ${result.name}">
      <div class="status ${toStatusClass(result.status)}"></div>
      <div>
        <strong>${result.name}</strong>
        <span class="result-detail">${result.details}</span>
      </div>
      <i class="ri-restart-line row-icon"></i>
    </div>
  `;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  resetTestEnvironment() {
    const { testsLabel, testCount } = this.els;
    if (testsLabel) testsLabel.textContent = "Tests";
    if (testCount) testCount.textContent = "";

    this.initializeTestElements();
    this.cleanupTests();
    this.hideAllDialogs();
    this.els.testsLabel.classList.remove("active");
    getDeviceInfo();
  }

  initializeTestElements() {
    const total = TEST_CONFIGURATIONS.length;
    this.els.testsContainer.innerHTML = TEST_CONFIGURATIONS.map(
      ({ name }, index) => `
      <div class="list-item-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Run ${name}">
        <div class="status pending"></div>
        <span>${name}</span>
        <i class="ri-play-fill row-icon"></i>
      </div>
    `,
    ).join("");

    if (this.els.testCount) this.els.testCount.textContent = `0 / ${total}`;

    this.els.testsLabel.style.setProperty("--success-progress", "0%");
    this.els.testsLabel.style.setProperty("--inconclusive-progress", "0%");
    this.els.testsLabel.style.setProperty("--completed-progress", "0%");
  }

  cleanupTests() {
    cleanupTouchTest();
  }

  hideAllDialogs() {
    DIALOG_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  getDeviceInfo();
  const runner = new TestRunner();
  runner.initializeTestElements();
});
