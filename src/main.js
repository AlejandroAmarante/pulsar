/**
 * main.js
 * Bootstraps the app and owns all UI/runner logic.
 * Test data (configurations, helpers) lives in ./tests/index.js.
 */

import { getDeviceInfo } from "./deviceInfo.js";
import { initBrowserNotice } from "./browserNotice.js";
import {
  TEST_CONFIGURATIONS,
  TOTAL_LEAF_COUNT,
  aggregateStatus,
  cleanupTouchTest,
} from "./tests/index.js";

// ── BARCODE SHARING ───────────────────────────────────────────────────────────
import { initBarcodeSharing, initScanListener } from "./barcodeShare.js";

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

// ─── Status Icon Helpers ──────────────────────────────────────────────────────

const STATUS_ICON_MAP = {
  success: { icon: "ri-checkbox-circle-line", mod: "status-icon--pass" },
  fail: { icon: "ri-close-circle-line", mod: "status-icon--fail" },
  partial: {
    icon: "ri-indeterminate-circle-line",
    mod: "status-icon--partial",
  },
  _pending: { icon: "ri-record-circle-line", mod: "status-icon--pending" },
};

function statusIconEl(status) {
  const { icon, mod } = STATUS_ICON_MAP[status] ?? STATUS_ICON_MAP._pending;
  return `<i class="status-icon ${icon} ${mod}" aria-hidden="true"></i>`;
}

function applyStatusIcon(el, status) {
  if (!el) return;
  const { icon, mod } = STATUS_ICON_MAP[status] ?? STATUS_ICON_MAP._pending;
  el.className = `status-icon ${icon} ${mod}`;
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

    this.els.testsContainer.addEventListener("click", (e) => {
      const row = e.target.closest("[data-test-index]");
      if (!row || this.els.startButton.disabled) return;
      const index = parseInt(row.dataset.testIndex, 10);
      if (!isNaN(index)) this.runSingleTestByIndex(index);
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

  // ── Full test run ─────────────────────────────────────────────────────────

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

          const rowEl = row();
          let subRowsContainer = rowEl?.querySelector(".subtest-rows");
          if (!subRowsContainer && rowEl) {
            subRowsContainer = document.createElement("div");
            subRowsContainer.className = "subtest-rows";
            rowEl
              .querySelector(".grouped-row-content")
              .appendChild(subRowsContainer);
          }

          if (subRowsContainer) {
            const subRow = document.createElement("div");
            subRow.className = "subtest-row";
            subRow.dataset.subtestName = subtest.name;
            subRow.innerHTML = `
              ${statusIconEl(result.status)}
              <span>${subtest.name}</span>
            `;
            subRowsContainer.appendChild(subRow);
          }

          const aggNow = aggregateStatus(subtestResults);
          const mainIcon = row()?.querySelector(
            ".grouped-row-header .status-icon",
          );
          applyStatusIcon(mainIcon, aggNow);

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

        const statusIcon = row()?.querySelector(".status-icon");
        applyStatusIcon(statusIcon, result.status);

        results.push(result);
        this.updateLeafCount(completedLeafs);
      }
    }

    this.els.overlay.style.display = "none";
    this.hideAllDialogs();
    return results;
  }

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
            : "partial");

      return {
        name: testName,
        status,
        details: result?.details || "Test completed",
      };
    } catch (error) {
      return {
        name: testName,
        status: "partial",
        details: this.formatErrorMessage(error),
      };
    }
  }

  // ── Re-run a single test by row index ─────────────────────────────────────

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

        const row = this.els.testsContainer.querySelector(
          `[data-test-index="${index}"]`,
        );
        const subIcon = row?.querySelector(
          `.subtest-row[data-subtest-name="${subtest.name}"] .status-icon`,
        );
        applyStatusIcon(subIcon, r.status);

        const mainIcon = row?.querySelector(".grouped-row-header .status-icon");
        applyStatusIcon(mainIcon, aggregateStatus(subtestResults));
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
      ? `Timed out after ${TEST_DURATION}s — result partial`
      : `Error: ${error.message}`;
  }

  // ── Progress / counters ───────────────────────────────────────────────────

  updateLeafCount(completedLeafs) {
    if (this.els.testCount) {
      this.els.testCount.textContent = `${completedLeafs} / ${TOTAL_LEAF_COUNT}`;
    }
  }

  recalculateCounts() {
    const leafSel = [
      "#tests .subtest-row .status-icon",
      "#tests .list-item-row:not(.grouped-row) > .status-icon",
    ].join(", ");

    const leafIcons = [...document.querySelectorAll(leafSel)];
    const completed = leafIcons.filter(
      (el) =>
        el.classList.contains("status-icon--pass") ||
        el.classList.contains("status-icon--fail") ||
        el.classList.contains("status-icon--partial"),
    ).length;

    if (this.els.testCount) {
      this.els.testCount.textContent = `${completed} / ${TOTAL_LEAF_COUNT}`;
    }
  }

  // ── Results display ───────────────────────────────────────────────────────

  displayResults(results) {
    const { testsLabel, testsContainer } = this.els;
    if (testsLabel) testsLabel.textContent = "Results";

    testsContainer.innerHTML = results
      .map((result, index) => this.createResultHTML(result, index))
      .join("");

    this.updateButtonState(false);
    this.els.btnLabel.textContent = "Re-run Tests";

    const btnIcon = this.els.startButton.querySelector(".btn-icon");
    if (btnIcon) btnIcon.className = "ri-loop-right-line btn-icon";

    const passed = this.countLeafsByStatus(results, "success");
    const partial = this.countLeafsByStatus(results, "partial");
    const failed = this.countLeafsByStatus(results, "fail");

    if (this.els.testCount) {
      this.els.testCount.innerHTML = `
        <div class="results-summary">
          <div class="psm-badge psm-badge--pass">
            <i class="ri-checkbox-circle-line"></i>
            <strong>${passed}</strong> Passed
          </div>
          <div class="psm-badge psm-badge--warn">
            <i class="ri-indeterminate-circle-line"></i>
            <strong>${partial}</strong> partial
          </div>
          <div class="psm-badge psm-badge--fail">
            <i class="ri-close-circle-line"></i>
            <strong>${failed}</strong> Failed
          </div>
        </div>
      `;
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

    initBarcodeSharing(results);
  }

  countLeafsByStatus(results, status) {
    return results.reduce((sum, r) => {
      if (r.grouped)
        return sum + r.subtests.filter((s) => s.status === status).length;
      return sum + (r.status === status ? 1 : 0);
    }, 0);
  }

  // ── HTML factories ────────────────────────────────────────────────────────

  createResultHTML(result, index) {
    if (result.grouped) {
      const subtestRows = result.subtests
        .map(
          (sub) => `
          <div class="subtest-row" data-subtest-name="${sub.name}">
            <div class="subtest-row-header">
              ${statusIconEl(sub.status)}
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
            ${statusIconEl(result.status)}
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
          ${statusIconEl(result.status)}
          <strong>${result.name}</strong>
          <i class="ri-loop-right-line row-icon"></i>
        </div>
        <span class="result-detail">${result.details}</span>
      </div>
    </div>`;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  resetTestEnvironment() {
    const { testsLabel, testCount } = this.els;
    if (testsLabel) testsLabel.textContent = "Tests";
    if (testCount) testCount.innerHTML = "";

    this.initializeTestElements();
    this.cleanupTests();
    this.hideAllDialogs();

    document.getElementById("pulsar-barcode-section")?.remove();

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
              ${statusIconEl("_pending")}
              <span>${cfg.name}</span>
              <i class="ri-play-fill row-icon"></i>
            </div>
          </div>
        </div>`;
        }

        return `
      <div class="list-item-row" data-test-index="${index}" role="button" tabindex="0" aria-label="Run ${cfg.name}">
        ${statusIconEl("_pending")}
        <span>${cfg.name}</span>
        <i class="ri-play-fill row-icon"></i>
      </div>`;
      },
    ).join("");

    if (this.els.testCount) {
      this.els.testCount.textContent = `0 / ${TOTAL_LEAF_COUNT}`;
    }
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
  initBrowserNotice();
  const runner = new TestRunner();
  runner.initializeTestElements();
});
