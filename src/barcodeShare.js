/**
 * barcodeSharing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-device barcode result sharing for Pulsar Device Diagnostics.
 *
 * Payload format — digits only:
 *   0 = pass  |  1 = partial  |  2 = fail
 *
 * Example: 012212201
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

const STATUS_TO_DIGIT = { success: "0", partial: "1", fail: "2" };

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

export function encodeResults(results) {
  return flattenResults(results)
    .map((r) => STATUS_TO_DIGIT[r.status] ?? "1")
    .join("");
}

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

// ─── Share Section Rendering ──────────────────────────────────────────────────

export async function renderBarcodeSection(results, afterEl) {
  document.getElementById("share-section")?.remove();

  const payload = encodeResults(results);
  const decodedForModal = resultsToDecoded(results);

  const section = document.createElement("section");
  section.id = "share-section";
  section.className = "panel__inner panel share-section";

  section.innerHTML = `
    <div class="panel__head panel__head--flush">
      <div class="label">
        <i class="ri-share-line" style="font-size:14px;line-height:1"></i>
        Share Results
      </div>
    </div>

    <p class="share__hint">
      Scan this code on any device running Pulsar to load these results instantly.
    </p>

    <div class="share__tabs" role="tablist" aria-label="Barcode type">
      <button class="share__tab share__tab--active" data-tab="barcode" role="tab" aria-selected="true">
        <i class="ri-barcode-line"></i> Code 128
      </button>
      <button class="share__tab" data-tab="qr" role="tab" aria-selected="false">
        <i class="ri-qr-code-line"></i> QR Code
      </button>
    </div>

    <div class="share__stage">
      <div id="share-pane-barcode" class="share__pane share__pane--active" role="tabpanel">
        <div
          class="share__barcode"
          id="share-barcode-frame"
          role="button"
          tabindex="0"
          aria-label="Open diagnostic results"
          title="Click to open results"
        >
          <div class="share__loading" id="share-barcode-loading">
            <div class="share__spinner"></div>
            <span>Generating barcode…</span>
          </div>
          <div class="share__barcode-scroll">
            <svg id="share-barcode-svg"></svg>
          </div>
        </div>
        
      </div>

      <div id="share-pane-qr" class="share__pane" role="tabpanel" hidden>
        <div class="share__qr">
          <div class="share__loading" id="share-qr-loading">
            <div class="share__spinner"></div>
            <span>Generating QR code…</span>
          </div>
          <div id="share-qr-target"></div>
        </div>
  
      </div>
    </div>

    <details class="share__payload">
      <summary class="share__payload-toggle">
        <i class="ri-code-line"></i> Encoded payload
        <i class="ri-arrow-down-s-line share__chevron"></i>
      </summary>
      <div class="share__payload-body">
        <code id="share-payload-code">${escHtml(payload)}</code>
      </div>
    </details>
  `;

  afterEl.insertAdjacentElement("afterend", section);

  // ── Tab switching ──────────────────────────────────────────────────────────

  const tabs = section.querySelectorAll(".share__tab");
  const panes = {
    barcode: section.querySelector("#share-pane-barcode"),
    qr: section.querySelector("#share-pane-qr"),
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabs.forEach((b) => {
        b.classList.toggle("share__tab--active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      Object.entries(panes).forEach(([key, pane]) => {
        const active = key === tab;
        pane.classList.toggle("share__pane--active", active);
        active
          ? pane.removeAttribute("hidden")
          : pane.setAttribute("hidden", "");
      });
    });
  });

  // ── Barcode frame click → open local results modal ─────────────────────────

  const barcodeFrame = section.querySelector("#share-barcode-frame");
  const openLocalResults = () => showScanModal(decodedForModal);

  barcodeFrame.addEventListener("click", openLocalResults);
  barcodeFrame.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLocalResults();
    }
  });

  // ── Render barcodes ────────────────────────────────────────────────────────

  try {
    await Promise.all([
      loadScript(QRCODE_CDN, "QRCode"),
      loadScript(JSBARCODE_CDN, "JsBarcode"),
    ]);

    section.querySelector("#share-barcode-loading").style.display = "none";
    window.JsBarcode("#share-barcode-svg", payload, {
      format: "CODE128",
      lineColor: "#1b1c1f",
      width: 1.5,
      height: 80,
      displayValue: false,
      margin: 14,
      background: "#ffffff",
    });

    section.querySelector("#share-qr-loading").style.display = "none";
    new window.QRCode(section.querySelector("#share-qr-target"), {
      text: payload,
      width: 224,
      height: 224,
      colorDark: "#1b1c1f",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } catch (err) {
    console.error("[Pulsar] Barcode render failed:", err);
    section.querySelector(".share__stage").innerHTML = `
      <p class="share__error">
        <i class="ri-error-warning-line"></i>
        Barcode generation unavailable — check network connection.
      </p>
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

  return [
    "--Pulsar Device Diagnostic Results--",
    `Scanned: ${ts}`,
    "",
    ...decoded.tests.map((t) => `${t.name}: ${t.status}`),
    "",
    "--------------------------------------",
  ].join("\n");
}

function escHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

export function showScanModal(decoded) {
  document.getElementById("scan-modal")?.remove();

  const plainText = buildPlainText(decoded);
  const passed = decoded.tests.filter((t) => t.statusCode === "p").length;
  const failed = decoded.tests.filter((t) => t.statusCode === "f").length;
  const partial = decoded.tests.filter((t) => t.statusCode === "i").length;

  const modal = document.createElement("div");
  modal.id = "scan-modal";
  modal.className = "scan-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "scan-modal-title");

  modal.innerHTML = `
    <div class="scan-modal__backdrop" id="scan-modal-backdrop"></div>

    <div class="scan-modal__card" role="document">
      <button class="scan-modal__close" id="scan-modal-close" aria-label="Close results">
        <i class="ri-close-line"></i>
      </button>

      <div class="scan-modal__head">
        <div class="scan-modal__icon">
          <i class="ri-qr-scan-2-line"></i>
        </div>
        <div class="scan-modal__meta">
          <h2 class="scan-modal__title" id="scan-modal-title">Pulsar Device Diagnostic Results</h2>
          <p class="scan-modal__time">${escHtml(new Date(decoded.timestamp).toLocaleString())}</p>
        </div>
      </div>

      <div class="scan-modal__summary" role="status" aria-label="Summary">
        <div class="badge badge--pass">
          <i class="ri-checkbox-circle-line"></i>
          <strong>${passed}</strong> Passed
        </div>
        <div class="badge badge--warn">
          <i class="ri-indeterminate-circle-line"></i>
          <strong>${partial}</strong> Partial
        </div>
        <div class="badge badge--fail">
          <i class="ri-close-circle-line"></i>
          <strong>${failed}</strong> Failed
        </div>
      </div>

      <div class="scan-modal__output">
        <div class="scan-modal__output-head">
          <span class="scan-modal__output-label">
            <i class="ri-file-text-line"></i> Plain Text
          </span>
          <button class="btn-copy" id="scan-modal-copy" title="Copy to clipboard">
            <i class="ri-clipboard-line"></i>
            <span class="btn-copy__label">Copy</span>
          </button>
        </div>
        <pre class="scan-modal__text" id="scan-modal-text"
          aria-label="Copyable plain-text results">${escHtml(plainText)}</pre>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() =>
    requestAnimationFrame(() => modal.classList.add("scan-modal--open")),
  );

  modal.querySelector("#scan-modal-close")?.focus();

  function close() {
    modal.classList.remove("scan-modal--open");
    modal.addEventListener(
      "transitionend",
      () => {
        if (!modal.classList.contains("scan-modal--open")) modal.remove();
      },
      { once: true },
    );
  }

  modal.querySelector("#scan-modal-close").addEventListener("click", close);
  modal.querySelector("#scan-modal-backdrop").addEventListener("click", close);

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  modal
    .querySelector("#scan-modal-copy")
    .addEventListener("click", async () => {
      const btn = modal.querySelector("#scan-modal-copy");

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
        '<i class="ri-check-line"></i><span class="btn-copy__label">Copied!</span>';
      btn.style.background = "var(--success-dim)";
      btn.style.borderColor = "var(--success-ring)";
      btn.style.color = "var(--success)";

      setTimeout(() => {
        btn.innerHTML =
          '<i class="ri-clipboard-line"></i><span class="btn-copy__label">Copy</span>';
        btn.style.cssText = "";
      }, 2400);
    });
}

// ─── Public Init ──────────────────────────────────────────────────────────────

export async function initBarcodeSharing(results) {
  const testsSection = document.getElementById("tests-section");
  if (testsSection) await renderBarcodeSection(results, testsSection);
}
