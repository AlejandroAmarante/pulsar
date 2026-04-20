/**
 * Sound Tests
 *
 *   AudioContext unavailable → partial
 *   User confirms hearing    → success
 *   User denies hearing      → fail
 */

let audioContext = null;

function getAudioContext() {
  if (!audioContext || audioContext.state === "closed") {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

function playTone(frequency, durationSec = 1.2) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  // Resume context if suspended (autoplay policy)
  if (ctx.state === "suspended") ctx.resume();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Smooth ramp to avoid clicks
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationSec);

  return true;
}

async function testSingleFrequency(label, frequency) {
  if (!(window.AudioContext || window.webkitAudioContext)) {
    return {
      name: label,
      status: "partial",
      details: "Web Audio API not supported — cannot play test tone",
    };
  }

  return new Promise((resolve) => {
    const dialog = document.getElementById("sound-dialog");
    const title = dialog.querySelector("h3");
    const description = dialog.querySelector("p");
    const playButton = document.getElementById("play-sound");
    const yesButton = document.getElementById("sound-yes");
    const noButton = document.getElementById("sound-no");

    dialog.style.display = "flex";
    title.textContent = `Sound Test — ${label}`;
    description.textContent = `Press Play to hear the ${label.toLowerCase()} tone, then confirm whether you heard it.`;

    yesButton.disabled = true;
    noButton.disabled = true;

    // Clone play button to clear any previous listeners
    const freshPlay = playButton.cloneNode(true);
    playButton.parentNode.replaceChild(freshPlay, playButton);

    freshPlay.addEventListener("click", () => {
      const played = playTone(frequency);
      if (played) {
        yesButton.disabled = false;
        noButton.disabled = false;
      } else {
        // AudioContext failed at runtime
        resolve({
          name: label,
          status: "partial",
          details: "Audio context could not be created",
        });
        dialog.style.display = "none";
      }
    });

    function respond(heard) {
      dialog.style.display = "none";
      yesButton.onclick = null;
      noButton.onclick = null;
      resolve({
        name: label,
        status: heard ? "success" : "fail",
        details: heard ? `${label} tone heard` : `${label} tone not heard`,
      });
    }

    yesButton.onclick = () => respond(true);
    noButton.onclick = () => respond(false);
  });
}

export async function testLowFrequency() {
  return testSingleFrequency("Low Frequency (200 Hz)", 200);
}

export async function testMidFrequency() {
  return testSingleFrequency("Mid Frequency (1 kHz)", 1000);
}

export async function testHighFrequency() {
  return testSingleFrequency("High Frequency (4 kHz)", 4000);
}
