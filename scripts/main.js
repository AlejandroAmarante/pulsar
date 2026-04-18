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
// Each entry is either a single test or a grouped test.
// Grouped tests run their subtests sequentially and show sub-rows.
const TEST_CONFIGURATIONS = [
  { name: "Gyroscope", testFunction: testGyroscope },
  { name: "Color Screen", testFunction: testColorScreens },
  { name: "Touch Tracking", testFunction: testTouchTracking },
  {
    name: "Vibration",
    grouped: true,
    subtests: [
      { name: "Short", testFunction: testShortVibration },
      { name: "Medium", testFunction: testMediumVibration },
      { name: "Long", testFunction: testLongVibration },
    ],
  },
  { name: "Geolocation", testFunction: testGeolocation },
  { name: "Bluetooth", testFunction: testBluetooth },
  {
    name: "Frequency",
    grouped: true,
    subtests: [
      { name: "Low", testFunction: testLowFrequency },
      { name: "Mid", testFunction: testMidFrequency },
      { name: "High", testFunction: testHighFrequency },
    ],
  },
  { name: "Microphone", testFunction: testMicrophone },
  {
    name: "Camera",
    grouped: true,
    subtests: [
      { name: "Front", testFunction: testFrontCamera },
      { name: "Rear", testFunction: testRearCamera },
    ],
  },
];

// Total leaf-test count (subtests count individually, single tests count as 1)
const TOTAL_LEAF_COUNT = TEST_CONFIGURATIONS.reduce(
  (sum, cfg) => sum + (cfg.grouped ? cfg.subtests.length : 1),
  0,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toStatusClass(status) {
  if (status === "success") return "success";
  if (status === "fail") return "failure";
  return "inconclusive";
}

/**
 * Derives an aggregate status from an array of subtest results.
 * All pass → success | any fail → fail | otherwise → inconclusive
 */
function aggregateStatus(subtestResults) {
  if (subtestResults.every((r) => r.status === "success")) return "success";
  if (subtestResults.some((r) => r.status === "fail")) return "fail";
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

    // Event delegation — clicking any row (or grouped row) triggers its test
    this.els.testsContainer.addEventListener("click", (e) => {
      const row = e.target.closest("[data-test-index]");
      if (!row || this.els.startButton.disabled) return;
      const index = parseInt(row.dataset.testIndex, 10);
      if (!isNaN(index)) this.runSingleTestByIndex(index);
    });
  }

  // ── Button state ────────────────────────────────────────────────────────────

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

  // ── Progress timer ──────────────────────────────────────────────────────────

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

  // ── Full test run ────────────────────────────────────────────────────────────

  async startTests() {
    this.els.overlay.style.display = "flex";
    const results = await this.executeAllTests();
    this.displayResults(results);
  }

  async executeAllTests() {
    const results = [];
    let completedLeafs = 0;

    for (const [index, cfg] of TEST_CONFIGURATIONS.entries()) {
      const row = () =>
        this.els.testsContainer.querySelector(`[data-test-index="${index}"]`);

      if (cfg.grouped) {
        const subtestResults = [];

        for (const subtest of cfg.subtests) {
          this.updateButtonState(true, `${cfg.name} — ${subtest.name}`);
          this.hideAllDialogs();
          this.progressTimer.start();

          const result = await this.executeSingleTest(
            subtest.testFunction,
            subtest.name,
          );
          this.progressTimer.stop();
          subtestResults.push(result);
          completedLeafs++;

          // Ensure the subtest-rows container exists, creating it on first subtest
          const rowEl = row();
          let subRowsContainer = rowEl?.querySelector(".subtest-rows");
          if (!subRowsContainer && rowEl) {
            subRowsContainer = document.createElement("div");
            subRowsContainer.className = "subtest-rows";
            rowEl
              .querySelector(".grouped-row-content")
              .appendChild(subRowsContainer);
          }

          // Append this subtest's row
          if (subRowsContainer) {
            const subRow = document.createElement("div");
            subRow.className = "subtest-row";
            subRow.dataset.subtestName = subtest.name;
            subRow.innerHTML = `
    <div class="status ${toStatusClass(result.status)}"></div>
    <span>${subtest.name}</span>
  `;
            subRowsContainer.appendChild(subRow);
          }

          // Update the group's aggregate dot
          const aggNow = aggregateStatus(subtestResults);
          const mainDot = row()?.querySelector(".grouped-row-header .status");
          if (mainDot) mainDot.className = `status ${toStatusClass(aggNow)}`;

          this.updateLeafCount(completedLeafs);
        }

        const aggStatus = aggregateStatus(subtestResults);
        results.push({
          name: cfg.name,
          grouped: true,
          status: aggStatus,
          subtests: subtestResults,
        });
      } else {
        this.updateButtonState(true, cfg.name);
        this.hideAllDialogs();
        this.progressTimer.start();

        const result = await this.executeSingleTest(cfg.testFunction, cfg.name);
        this.progressTimer.stop();
        completedLeafs++;

        const mainDot = row()?.querySelector(".grouped-row-header .status");
        if (mainDot)
          mainDot.className = `status ${toStatusClass(result.status)}`;

        results.push(result);
        this.updateLeafCount(completedLeafs);
      }
    }

    this.els.overlay.style.display = "none";
    this.hideAllDialogs();
    return results;
  }

  /**
   * Runs one test function, normalises the result to the three-state system,
   * and catches timeouts / thrown errors as inconclusive.
   * testName is always taken from the caller (config), not the test function's
   * own return value, so display names stay consistent.
   */
  async executeSingleTest(testFunction, testName) {
    try {
      const result = await Promise.race([
        testFunction(),
        this.createTimeoutPromise(),
      ]);

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

  // ── Re-run a single test by row index ───────────────────────────────────────

  async runSingleTestByIndex(index) {
    const cfg = TEST_CONFIGURATIONS[index];
    if (!cfg) return;

    this.els.overlay.style.display = "flex";
    this.updateButtonState(true, cfg.name);
    this.hideAllDialogs();

    let result;

    if (cfg.grouped) {
      const subtestResults = [];

      for (const subtest of cfg.subtests) {
        this.updateButtonState(true, `${cfg.name} — ${subtest.name}`);
        this.progressTimer.start();

        const r = await this.executeSingleTest(
          subtest.testFunction,
          subtest.name,
        );
        this.progressTimer.stop();
        subtestResults.push(r);

        // Live-update dots on the existing row (before it's replaced)
        const row = this.els.testsContainer.querySelector(
          `[data-test-index="${index}"]`,
        );
        const subDot = row?.querySelector(
          `.subtest-row[data-subtest-name="${subtest.name}"] .status`,
        );
        if (subDot) subDot.className = `status ${toStatusClass(r.status)}`;

        const mainDot = row?.querySelector(".grouped-row-header .status");
        if (mainDot)
          mainDot.className = `status ${toStatusClass(aggregateStatus(subtestResults))}`;
      }

      result = {
        name: cfg.name,
        grouped: true,
        status: aggregateStatus(subtestResults),
        subtests: subtestResults,
      };
    } else {
      this.progressTimer.start();
      result = await this.executeSingleTest(cfg.testFunction, cfg.name);
      this.progressTimer.stop();
    }

    this.els.overlay.style.display = "none";
    this.hideAllDialogs();
    this.updateButtonState(false);

    // Replace the row in-place
    const oldRow = this.els.testsContainer.querySelector(
      `[data-test-index="${index}"]`,
    );
    if (oldRow) {
      const tmp = document.createElement("div");
      tmp.innerHTML = this.createResultHTML(result, index);
      oldRow.replaceWith(tmp.firstElementChild);
    }

    this.recalculateCounts();
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

  // ── Progress bar / counters ─────────────────────────────────────────────────

  /**
   * Updates the "N / Total" label during a sequential run.
   */
  updateLeafCount(completedLeafs) {
    if (this.els.testCount) {
      this.els.testCount.textContent = `${completedLeafs} / ${TOTAL_LEAF_COUNT}`;
    }
    this.syncProgressBar();
  }

  /**
   * Re-derives pass/fail/inconclusive counts from live DOM leaf statuses
   * and syncs the gradient progress bar.
   * "Leaf" statuses = subtest-row dots + single-test (non-grouped) dots.
   * The aggregate dot on a grouped row is intentionally excluded.
   */
  syncProgressBar() {
    const leafSel = [
      "#tests .subtest-row .status",
      "#tests .list-item-row:not(.grouped-row) > .status",
    ].join(", ");

    const leafDots = [...document.querySelectorAll(leafSel)];
    const passed = leafDots.filter((el) =>
      el.classList.contains("success"),
    ).length;
    const failed = leafDots.filter((el) =>
      el.classList.contains("failure"),
    ).length;
    const inconclusive = leafDots.filter((el) =>
      el.classList.contains("inconclusive"),
    ).length;
    const total = TOTAL_LEAF_COUNT;

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

  /**
   * Recalculates everything from DOM after a single-test re-run.
   */
  recalculateCounts() {
    const leafSel = [
      "#tests .subtest-row .status",
      "#tests .list-item-row:not(.grouped-row) > .status",
    ].join(", ");

    const leafDots = [...document.querySelectorAll(leafSel)];
    const completed = leafDots.filter(
      (el) =>
        el.classList.contains("success") ||
        el.classList.contains("failure") ||
        el.classList.contains("inconclusive"),
    ).length;

    if (this.els.testCount) {
      this.els.testCount.textContent = `${completed} / ${TOTAL_LEAF_COUNT}`;
    }

    this.els.testsLabel.classList.add("active");
    this.syncProgressBar();
  }

  // ── Results display ─────────────────────────────────────────────────────────

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
    if (btnIcon) btnIcon.className = "ri-loop-right-line btn-icon";

    // Summary line counts leaf-level tests only
    const passed = this.countLeafsByStatus(results, "success");
    const inconclusive = this.countLeafsByStatus(results, "inconclusive");
    const failed = this.countLeafsByStatus(results, "fail");

    if (this.els.testCount) {
      this.els.testCount.textContent = `${passed} passed · ${inconclusive} inconclusive · ${failed} failed`;
    }

    this.syncProgressBar();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  countLeafsByStatus(results, status) {
    return results.reduce((sum, r) => {
      if (r.grouped) {
        return sum + r.subtests.filter((s) => s.status === status).length;
      }
      return sum + (r.status === status ? 1 : 0);
    }, 0);
  }

  // ── HTML factories ──────────────────────────────────────────────────────────

  createResultHTML(result, index) {
    if (result.grouped) {
      const subtestRows = result.subtests
        .map(
          (sub) => `
      <div class="subtest-row" data-subtest-name="${sub.name}">
        <div class="subtest-row-header">
          <div class="status ${toStatusClass(sub.status)}"></div>
          <strong>${sub.name}</strong>
        </div>
        <span class="result-detail">${sub.details}</span>
      </div>`,
        )
        .join("");

      return `
  <div class="list-item-row result-row grouped-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Re-run ${result.name}">
    <div class="grouped-row-content">
      <div class="grouped-row-header">
        <div class="status ${toStatusClass(result.status)}"></div>
        <strong>${result.name}</strong>
        <i class="ri-loop-right-line row-icon"></i>
      </div>
      <div class="subtest-rows">${subtestRows}</div>
    </div>
  </div>`;
    }

    return `
  <div class="list-item-row result-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Re-run ${result.name}">
    <div class="result-row-content">
      <div class="result-row-header">
        <div class="status ${toStatusClass(result.status)}"></div>
        <strong>${result.name}</strong>
        <i class="ri-loop-right-line row-icon"></i>
      </div>
      <span class="result-detail">${result.details}</span>
    </div>
  </div>`;
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

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
    this.els.testsContainer.innerHTML = TEST_CONFIGURATIONS.map(
      (cfg, index) => {
        if (cfg.grouped) {
          return `
  <div class="list-item-row grouped-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Run ${cfg.name}">
    <div class="grouped-row-content">
      <div class="grouped-row-header">
        <div class="status pending"></div>
        <span>${cfg.name}</span>
        <i class="ri-play-fill row-icon"></i>
      </div>
    </div>
  </div>`;
        }

        return `
        <div class="list-item-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Run ${cfg.name}">
          <div class="status pending"></div>
          <span>${cfg.name}</span>
          <i class="ri-play-fill row-icon"></i>
        </div>`;
      },
    ).join("");

    if (this.els.testCount) {
      this.els.testCount.textContent = `0 / ${TOTAL_LEAF_COUNT}`;
    }

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
  window.scrollTo(0, 0);
  getDeviceInfo();
  const runner = new TestRunner();
  runner.initializeTestElements();
});
