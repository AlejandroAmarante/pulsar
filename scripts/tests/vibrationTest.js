/**
 * Vibration Tests
 *
 *   API absent  → inconclusive (device may lack a motor; browser may just not expose it)
 *   User felt   → success
 *   User not felt → fail
 */

function vibrate(pattern) {
  return navigator.vibrate(pattern);
}

async function testSingleVibration(label, pattern) {
  if (!navigator.vibrate) {
    return {
      name: label,
      status: "inconclusive",
      details:
        "Vibration API not supported — cannot determine hardware capability",
    };
  }

  return new Promise((resolve) => {
    const dialog = document.getElementById("vibration-dialog");
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    const testButton = document.getElementById("vibrate-test");
    const yesButton = document.getElementById("vibration-yes");
    const noButton = document.getElementById("vibration-no");

    dialog.style.display = "flex";
    title.textContent = `Vibration Test — ${label}`;
    description.textContent =
      `Tap the button below to trigger a ${label.toLowerCase()} pulse. ` +
      `Ensure Silent / Do Not Disturb mode is off. Did you feel it?`;

    yesButton.disabled = true;
    noButton.disabled = true;

    // Clone to remove stale listeners
    const freshBtn = testButton.cloneNode(true);
    testButton.parentNode.replaceChild(freshBtn, testButton);

    freshBtn.addEventListener("click", () => {
      vibrate(pattern);
      yesButton.disabled = false;
      noButton.disabled = false;
    });

    function respond(felt) {
      dialog.style.display = "none";
      yesButton.onclick = null;
      noButton.onclick = null;
      resolve({
        name: label,
        status: felt ? "success" : "fail",
        details: felt ? `${label} felt` : `${label} not felt`,
      });
    }

    yesButton.onclick = () => respond(true);
    noButton.onclick = () => respond(false);
  });
}

export async function testShortVibration() {
  return testSingleVibration("Short Vibration", [200]);
}

export async function testMediumVibration() {
  return testSingleVibration("Medium Vibration", [500]);
}

export async function testLongVibration() {
  return testSingleVibration("Long Vibration", [1000]);
}
