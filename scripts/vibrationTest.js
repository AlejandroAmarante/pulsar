// Vibrate the phone with a given pattern
function vibrateTest(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  } else {
    console.warn("Vibration API not supported by this browser.");
  }
}

// Test short vibration
export async function testShortVibration() {
  const result = await testSingleVibration("Short Vibration", [200]);
  return {
    name: "Short Vibration Test",
    success: result.success,
    details: result.details,
  };
}

// Test medium vibration
export async function testMediumVibration() {
  const result = await testSingleVibration("Medium Vibration", [500]);
  return {
    name: "Medium Vibration Test",
    success: result.success,
    details: result.details,
  };
}

// Test long vibration
export async function testLongVibration() {
  const result = await testSingleVibration("Long Vibration", [1000]);
  return {
    name: "Long Vibration Test",
    success: result.success,
    details: result.details,
  };
}

// Test a single vibration pattern
async function testSingleVibration(name, pattern) {
  return new Promise((resolve) => {
    if (!navigator.vibrate) {
      resolve({
        name: name,
        success: false,
        details: "Vibration API not supported.",
      });
      return;
    }

    const dialog = document.getElementById("vibration-dialog");
    const overlay = document.getElementById("overlay");
    dialog.style.display = "flex";

    // Update dialog content for current vibration test
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    title.textContent = `Vibration Test - ${name}`;
    description.textContent = `A ${name} vibration will activate when you click the button below. Did you feel it?`;

    const testButton = document.getElementById("vibrate-test");
    const yesButton = document.getElementById("vibration-yes");
    const noButton = document.getElementById("vibration-no");

    // Disable "Yes" and "No" buttons initially
    yesButton.disabled = true;
    noButton.disabled = true;

    // Remove existing event listeners
    const newTestButton = testButton.cloneNode(true);
    testButton.parentNode.replaceChild(newTestButton, testButton);

    newTestButton.addEventListener("click", () => {
      vibrateTest(pattern);

      // Enable "Yes" and "No" buttons after vibrating
      yesButton.disabled = false;
      noButton.disabled = false;
    });

    function handleResponse(felt) {
      dialog.style.display = "none";
      overlay.style.display = "none";
      resolve({
        name: name,
        success: felt,
        details: `${name}: ${felt ? "Felt" : "Not felt"}`,
      });
    }

    yesButton.onclick = () => handleResponse(true);
    noButton.onclick = () => handleResponse(false);
  });
}
