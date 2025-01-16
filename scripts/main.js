import { getDeviceInfo } from "./deviceInfo.js";
import { testGeolocation } from "./geolocationTest.js";
import {
  testLowFrequency,
  testMidFrequency,
  testHighFrequency,
} from "./soundTest.js";
import { testMicrophone } from "./microphoneTest.js";
import { testTouchTracking } from "./touchTest.js";

// Event Listeners
document.getElementById("start-test").addEventListener("click", async () => {
  document.getElementById("start-test").disabled = true;
  await runTests();
  document.getElementById("start-test").disabled = false;
});

document.getElementById("restart-test").addEventListener("click", async () => {
  document.getElementById("results-section").style.display = "none";
  document.getElementById("progress").style.width = "0%";
  document
    .querySelectorAll(".status")
    .forEach((dot) => (dot.className = "status pending"));
  resetTests();
  await runTests();
});

getDeviceInfo();

async function runTests() {
  const tests = [
    testVibration,
    testTouchTracking,
    testGeolocation,
    testLowFrequency, // Separate test for low frequency
    testMidFrequency, // Separate test for mid frequency
    testHighFrequency, // Separate test for high frequency
    testMicrophone,
  ];

  let results = [];
  const progress = document.getElementById("progress");
  const testResults = document.getElementById("test-results");
  const statusDots = document.querySelectorAll(".status");

  for (let i = 0; i < tests.length; i++) {
    const result = await tests[i]();
    results.push(result);

    // Update progress bar
    progress.style.width = `${((i + 1) / tests.length) * 100}%`;

    // Update status dot
    statusDots[i].className = `status ${
      result.success ? "success" : "failure"
    }`;
  }

  // Display results
  document.getElementById("results-section").style.display = "block";
  testResults.innerHTML = results
    .map(
      (r) =>
        `<div class="result">
           <div class="status ${r.success ? "success" : "failure"}"></div>
           <div>
             <strong>${r.name}</strong><br>
             ${r.details}
           </div>
         </div>`
    )
    .join("");

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

function resetTests() {
  // Reset global variables
  audioContext = null;
  mediaRecorder = null;
  audioChunks = [];
  audioBlob = null;
  audioUrl = null;

  // Clear dynamically created DOM content
  document.getElementById("device-info").innerHTML = "";
  document.getElementById("results-section").style.display = "none";
  document.getElementById("progress").style.width = "0%";

  // Reset all status dots to pending
  document.querySelectorAll(".status").forEach((dot) => {
    dot.className = "status pending";
  });

  // Properly cleanup touch test
  cleanupTouchTest();

  // Reset dialogs
  const dialogs = ["sound-dialog", "touch-dialog", "mic-dialog"];
  dialogs.forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.style.display = "none";
    }
  });

  // Reset overlay
  document.getElementById("overlay").style.display = "none";

  // Reinitialize device information
  getDeviceInfo();
}

async function testVibration() {
  navigator.vibrate(200);
  return {
    name: "Vibration",
    success: "vibrate" in navigator,
    details:
      "vibrate" in navigator
        ? "Vibration API supported"
        : "Vibration API not supported",
  };
}
