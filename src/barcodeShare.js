/**
 * barcodeSharing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-device barcode result sharing for Pulsar Device Diagnostics.
 *
 * Payload format:
 *   digits only
 *
 *   0 = pass
 *   1 = partial
 *   2 = fail
 *
 * Example:
 *   012212201
 *
 * The payload is positional. The receiving device maps each digit to its own
 * local test order, so both sides must be running the same Pulsar build/config.
 */

import { TEST_CONFIGURATIONS } from "./tests/index.js";

// ─── Configuration ────────────────────────────────────────────────────────────

const CHAR_GAP_MS = 75;
const FLUSH_SILENCE_MS = 250;
const SCAN_TERMINATORS = new Set(["Enter", "Tab"]);

const QRCODE_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
const JSBARCODE_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_TO_DIGIT = {
  success: "0",
  partial: "1",
  fail: "2",
};

const DIGIT_TO_DECODED = {
  0: { statusCode: "p", status: "Functional", cssClass: "pass" },
  1: { statusCode: "i", status: "Partial", cssClass: "partial" },
  2: { statusCode: "f", status: "Failed", cssClass: "fail" },
};

const LOCAL_TEST_ORDER = buildLocalTestOrder(TEST_CONFIGURATIONS);
const MIN_SCAN_LENGTH = LOCAL_TEST_ORDER.length;

// ─── Encoding / Decoding ──────────────────────────────────────────────────────

function buildLocalTestOrder(configs) {
  const out = [];
  for (const cfg of configs) {
    if (cfg.grouped) {
      for (const sub of cfg.subtests) out.push(sub.name);
    } else {
      out.push(cfg.name);
    }
  }
  return out;
}

function flattenResults(results) {
  const out = [];
  for (const r of results) {
    if (r.grouped) {
      for (const sub of r.subtests) out.push(sub);
    } else {
      out.push(r);
    }
  }
  return out;
}

/**
 * Encode a results array into a compact positional payload.
 * Example: 012212201
 *
 * @param {Array} results
 * @returns {string}
 */
export function encodeResults(results) {
  const leaves = flattenResults(results);
  return leaves.map((r) => STATUS_TO_DIGIT[r.status] ?? "1").join("");
}

/**
 * Decode and validate a raw scan string.
 *
 * @param {string} raw
 * @returns {{ timestamp: number, tests: Array } | null}
 */
export function decodePayload(raw) {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;

  if (s.length !== LOCAL_TEST_ORDER.length) {
    console.debug("[Pulsar] Scan test-count mismatch — discarding");
    return null;
  }

  const tests = s.split("").map((digit, index) => {
    const meta = DIGIT_TO_DECODED[digit] ?? DIGIT_TO_DECODED["1"];
    return {
      name: LOCAL_TEST_ORDER[index] ?? `Test ${index + 1}`,
      statusCode: meta.statusCode,
      status: meta.status,
      cssClass: meta.cssClass,
    };
  });

  return { timestamp: Date.now(), tests };
}

/**
 * Convert the current local results into the decoded modal shape.
 *
 * @param {Array} results
 * @returns {{ timestamp: number, tests: Array }}
 */
function resultsToDecoded(results) {
  const tests = flattenResults(results).map((r, index) => {
    const meta =
      DIGIT_TO_DECODED[STATUS_TO_DIGIT[r.status] ?? "1"] ?? DIGIT_TO_DECODED[1];
    return {
      name: r.name ?? LOCAL_TEST_ORDER[index] ?? `Test ${index + 1}`,
      statusCode: meta.statusCode,
      status: meta.status,
      cssClass: meta.cssClass,
    };
  });

  return { timestamp: Date.now(), tests };
}

// ─── Library Loading ──────────────────────────────────────────────────────────

function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

// ─── Barcode Section Rendering ────────────────────────────────────────────────

/**
 * Renders the share panel containing Code 128 and QR views.
 *
 * @param {Array} results
 * @param {HTMLElement} afterEl
 */
export async function renderBarcodeSection(results, afterEl) {
  document.getElementById("pulsar-barcode-section")?.remove();

  const payload = encodeResults(results);
  const decodedForModal = resultsToDecoded(results);

  const section = document.createElement("section");
  section.id = "pulsar-barcode-section";
  section.className = "section panel pulsar-bc-section";

  section.innerHTML = `
    <div class="section-header section-header--single">
      <div class="block-label">
        <i class="ri-share-line" style="font-size:14px;line-height:1"></i>
        Share Results
      </div>
    </div>

    <p class="bc-hint">
      Scan this code on any device running Pulsar to load these results instantly.
    </p>

    <div class="bc-tabs" role="tablist" aria-label="Barcode type">
      <button class="bc-tab bc-tab--active" data-tab="c128" role="tab" aria-selected="true">
        <i class="ri-barcode-line"></i> Code 128
      </button>
      <button class="bc-tab" data-tab="qr" role="tab" aria-selected="false">
        <i class="ri-qr-code-line"></i> QR Code
      </button>
    </div>

    <div class="bc-stage">
      <div id="bc-pane-c128" class="bc-pane bc-pane--active" role="tabpanel">
        <div
          class="bc-c128-frame"
          id="bc-c128-frame"
          role="button"
          tabindex="0"
          aria-label="Open diagnostic results"
          title="Click to open results"
        >
          <div class="bc-loading" id="bc-c128-loading">
            <div class="bc-spinner"></div>
            <span>Generating barcode…</span>
          </div>
          <div class="bc-c128-scroll">
            <svg id="pulsar-c128-svg"></svg>
          </div>
        </div>
        <p class="bc-sub-label">Click or tap to view results. For hardware wedge scanners</p>
      </div>

      <div id="bc-pane-qr" class="bc-pane" role="tabpanel" hidden>
        <div class="bc-qr-frame">
          <div class="bc-loading" id="bc-qr-loading">
            <div class="bc-spinner"></div>
            <span>Generating QR code…</span>
          </div>
          <div id="pulsar-qr-target"></div>
        </div>
        <p class="bc-sub-label">Scan with any camera app</p>
      </div>
    </div>

    <details class="bc-payload-details">
      <summary class="bc-payload-summary">
        <i class="ri-code-line"></i> Encoded payload
        <i class="ri-arrow-down-s-line bc-chevron"></i>
      </summary>
      <div class="bc-payload-body">
        <code id="pulsar-payload-code">${escHtml(payload)}</code>
      </div>
    </details>
  `;

  afterEl.insertAdjacentElement("afterend", section);

  const tabs = section.querySelectorAll(".bc-tab");
  const panes = {
    c128: section.querySelector("#bc-pane-c128"),
    qr: section.querySelector("#bc-pane-qr"),
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabs.forEach((b) => {
        b.classList.toggle("bc-tab--active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      Object.entries(panes).forEach(([key, pane]) => {
        const active = key === tab;
        pane.classList.toggle("bc-pane--active", active);
        active
          ? pane.removeAttribute("hidden")
          : pane.setAttribute("hidden", "");
      });
    });
  });

  const c128Frame = section.querySelector("#bc-c128-frame");
  const openLocalResultsModal = () => showScanModal(decodedForModal);

  c128Frame.addEventListener("click", openLocalResultsModal);
  c128Frame.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLocalResultsModal();
    }
  });

  try {
    await Promise.all([
      loadScript(QRCODE_CDN, "QRCode"),
      loadScript(JSBARCODE_CDN, "JsBarcode"),
    ]);

    section.querySelector("#bc-c128-loading").style.display = "none";
    window.JsBarcode("#pulsar-c128-svg", payload, {
      format: "CODE128",
      lineColor: "#1b1c1f",
      width: 1.5,
      height: 80,
      displayValue: false,
      margin: 14,
      background: "#ffffff",
    });

    section.querySelector("#bc-qr-loading").style.display = "none";
    new window.QRCode(section.querySelector("#pulsar-qr-target"), {
      text: payload,
      width: 224,
      height: 224,
      colorDark: "#1b1c1f",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } catch (err) {
    console.error("[Pulsar] Barcode render failed:", err);
    section.querySelector(".bc-stage").innerHTML = `
      <p class="bc-error"><i class="ri-error-warning-line"></i>
      Barcode generation unavailable — check network connection.</p>
    `;
  }
}

// ─── Keyboard Wedge Scanner Listener ─────────────────────────────────────────

export function initScanListener() {
  let buf = "";
  let lastCharAt = 0;
  let silenceTimer = null;

  function flush() {
    clearTimeout(silenceTimer);
    const captured = buf;
    buf = "";

    if (captured.length < MIN_SCAN_LENGTH) return;

    const data = decodePayload(captured);
    if (data) showScanModal(data);
  }

  document.addEventListener(
    "keydown",
    (e) => {
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (active.isContentEditable) return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (SCAN_TERMINATORS.has(e.key)) {
        if (buf.length >= MIN_SCAN_LENGTH) e.preventDefault();
        flush();
        return;
      }

      if (e.key.length !== 1) return;

      const now = Date.now();
      const gap = now - lastCharAt;
      lastCharAt = now;

      if (buf.length > 0 && gap > CHAR_GAP_MS) buf = "";

      buf += e.key;

      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(flush, FLUSH_SILENCE_MS);
    },
    { capture: true, passive: false },
  );

  console.debug(
    "[Pulsar] Barcode scan listener active (gap threshold:",
    CHAR_GAP_MS,
    "ms)",
  );
}

// ─── Scan Results Modal ───────────────────────────────────────────────────────

function buildPlainText(decoded) {
  const ts = new Date(decoded.timestamp).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = [
    "--Pulsar Device Diagnostic Results--",
    `Scanned: ${ts}`,
    "",
    ...decoded.tests.map((t) => `${t.name}: ${t.status}`),
    "",
    "--------------------------------------",
  ];

  return lines.join("\n");
}

function escHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

/**
 * Opens the scan-results modal.
 */
export function showScanModal(decoded) {
  document.getElementById("pulsar-scan-modal")?.remove();

  const plainText = buildPlainText(decoded);
  const passed = decoded.tests.filter((t) => t.statusCode === "p").length;
  const failed = decoded.tests.filter((t) => t.statusCode === "f").length;
  const partial = decoded.tests.filter((t) => t.statusCode === "i").length;

  const modal = document.createElement("div");
  modal.id = "pulsar-scan-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "psm-title");

  modal.innerHTML = `
    <div class="psm-backdrop" id="psm-backdrop"></div>

    <div class="psm-sheet" role="document">
      <button class="psm-close" id="psm-close" aria-label="Close results">
        <i class="ri-close-line"></i>
      </button>

      <div class="psm-header">
        <div class="psm-header-icon-wrap">
          <i class="ri-qr-scan-2-line"></i>
        </div>
        <div class="psm-header-text">
          <h2 class="psm-title" id="psm-title">Pulsar Device Diagnostic Results</h2>
          <p class="psm-timestamp">${escHtml(new Date(decoded.timestamp).toLocaleString())}</p>
        </div>
      </div>

      <div class="psm-summary" role="status" aria-label="Summary">
        <div class="psm-badge psm-badge--pass">
          <i class="ri-checkbox-circle-line"></i>
          <strong>${passed}</strong> Passed
        </div>
        <div class="psm-badge psm-badge--warn">
          <i class="ri-indeterminate-circle-line"></i>
          <strong>${partial}</strong> Partial
        </div>
        <div class="psm-badge psm-badge--fail">
          <i class="ri-close-circle-line"></i>
          <strong>${failed}</strong> Failed
        </div>
      </div>

      <div class="psm-plain-panel">
        <div class="psm-plain-header">
          <span class="psm-plain-label">
            <i class="ri-file-text-line"></i> Plain Text
          </span>
          <button class="psm-copy-btn" id="psm-copy-btn" title="Copy to clipboard">
            <i class="ri-clipboard-line"></i>
            <span class="psm-copy-label">Copy</span>
          </button>
        </div>
        <pre class="psm-plain-body" id="psm-plain-body"
          aria-label="Copyable plain-text results">${escHtml(plainText)}</pre>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add("psm--visible"));
  });

  modal.querySelector("#psm-close")?.focus();

  function close() {
    modal.classList.remove("psm--visible");
    modal.addEventListener(
      "transitionend",
      () => {
        if (!modal.classList.contains("psm--visible")) modal.remove();
      },
      { once: true },
    );
  }

  modal.querySelector("#psm-close").addEventListener("click", close);
  modal.querySelector("#psm-backdrop").addEventListener("click", close);

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  modal.querySelector("#psm-copy-btn").addEventListener("click", async () => {
    const btn = modal.querySelector("#psm-copy-btn");

    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      const ta = Object.assign(document.createElement("textarea"), {
        value: plainText,
        readOnly: true,
      });
      Object.assign(ta.style, {
        position: "fixed",
        top: "0",
        left: "0",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }

    btn.innerHTML =
      '<i class="ri-check-line"></i><span class="psm-copy-label">Copied!</span>';
    btn.style.background = "var(--success-dim)";
    btn.style.borderColor = "var(--success-ring)";
    btn.style.color = "var(--success)";

    setTimeout(() => {
      btn.innerHTML =
        '<i class="ri-clipboard-line"></i><span class="psm-copy-label">Copy</span>';
      btn.style.cssText = "";
    }, 2400);
  });
}

// ─── Public Init ──────────────────────────────────────────────────────────────

export async function initBarcodeSharing(results) {
  const testsSection = document.getElementById("tests-section");
  if (testsSection) {
    await renderBarcodeSection(results, testsSection);
  }
}
