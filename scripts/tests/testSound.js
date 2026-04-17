// Sound Test Setup
let audioContext;

// Initialize the audio context
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Play a test sound at a given frequency
function playTestSound(frequency) {
  if (!audioContext) initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 1
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 1);
}

// Test low frequency
export async function testLowFrequency() {
  const result = await testSingleFrequency("Low Frequency", 200);
  return {
    name: "Low Frequency Sound Test",
    success: result.success,
    details: result.details,
  };
}

// Test mid frequency
export async function testMidFrequency() {
  const result = await testSingleFrequency("Mid Frequency", 1000);
  return {
    name: "Mid Frequency Sound Test",
    success: result.success,
    details: result.details,
  };
}

// Test high frequency
export async function testHighFrequency() {
  const result = await testSingleFrequency("High Frequency", 4000);
  return {
    name: "High Frequency Sound Test",
    success: result.success,
    details: result.details,
  };
}

// Test a single frequency
async function testSingleFrequency(name, frequency) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("sound-dialog");
    const overlay = document.getElementById("overlay");
    dialog.style.display = "flex";

    // Update dialog content for current frequency test
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    title.textContent = `Sound Test - ${name}`;
    description.textContent = `A ${name} sound will play when you click the button below. Did you hear it?`;

    const playButton = document.getElementById("play-sound");
    const yesButton = document.getElementById("sound-yes");
    const noButton = document.getElementById("sound-no");

    // Disable "Yes" and "No" buttons initially
    yesButton.disabled = true;
    noButton.disabled = true;

    // Remove existing event listeners
    const newPlayButton = playButton.cloneNode(true);
    playButton.parentNode.replaceChild(newPlayButton, playButton);

    newPlayButton.addEventListener("click", () => {
      playTestSound(frequency);

      // Enable "Yes" and "No" buttons after playing the sound
      yesButton.disabled = false;
      noButton.disabled = false;
    });

    function handleResponse(heard) {
      dialog.style.display = "none";
      resolve({
        name: name,
        success: heard,
        details: `${name}: ${heard ? "Heard" : "Not heard"}`,
      });
    }

    yesButton.onclick = () => handleResponse(true);
    noButton.onclick = () => handleResponse(false);
  });
}
