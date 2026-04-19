/**
 * Vibration Tests
 *
 *   API absent    → inconclusive
 *   User felt     → success
 *   User not felt → fail
 */

function vibrate(pattern) {
  return navigator.vibrate(pattern);
}

async function testSingleVibration(label, pattern) {
  if (!navigator.vibrate) {
    return {
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
    title.textContent = `Vibration — ${label}`;
    description.textContent =
      `Tap the button to trigger a ${label.toLowerCase()} pulse. ` +
      `Make sure Silent / Do Not Disturb is off. Did you feel it?`;

    yesButton.disabled = true;
    noButton.disabled = true;

    // Clone to shed any stale listeners
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
        status: felt ? "success" : "fail",
        details: felt ? "Felt" : "Not felt",
      });
    }

    yesButton.onclick = () => respond(true);
    noButton.onclick = () => respond(false);
  });
}

export async function testShortVibration() {
  return testSingleVibration("Short", [200]);
}
export async function testMediumVibration() {
  return testSingleVibration("Medium", [500]);
}
export async function testLongVibration() {
  return testSingleVibration("Long", [1000]);
}
