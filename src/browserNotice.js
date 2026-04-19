const DISMISS_KEY = "pulsar-browser-notice-dismissed";

function isChromiumFamilyBrowser() {
  const brands = navigator.userAgentData?.brands || [];

  if (brands.length) {
    return brands.some(({ brand }) =>
      /Chrom(e|ium)|Opera|Brave|Edge/i.test(brand),
    );
  }

  const ua = navigator.userAgent || "";
  return /Chrome|Chromium|Edg|OPR|Brave/i.test(ua);
}

export function initBrowserNotice() {
  const notice = document.getElementById("browser-notice");
  if (!notice) return;

  const closeBtn = notice.querySelector("[data-browser-notice-close]");

  if (localStorage.getItem(DISMISS_KEY) === "1" || isChromiumFamilyBrowser()) {
    notice.hidden = true;
    return;
  }

  notice.hidden = false;
  requestAnimationFrame(() => notice.classList.add("is-visible"));

  closeBtn?.addEventListener("click", () => {
    notice.classList.remove("is-visible");
    localStorage.setItem(DISMISS_KEY, "1");

    window.setTimeout(() => {
      notice.hidden = true;
    }, 220);
  });
}
