let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;

export async function testMicrophone() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("mic-dialog");
    const overlay = document.getElementById("overlay");
    const startButton = document.getElementById("start-recording");
    const playButton = document.getElementById("play-recording");
    const yesButton = document.getElementById("mic-yes");
    const noButton = document.getElementById("mic-no");
    const reRecordButton = document.getElementById("re-record"); // New button for re-record
    const timer = document.getElementById("mic-timer");

    dialog.style.display = "flex";
    overlay.style.display = "block";

    let countdown;
    let stream;

    function resetState() {
      // Reset the buttons and timer
      startButton.style.display = "block";
      startButton.disabled = false;
      playButton.style.display = "none";
      yesButton.style.display = "none";
      noButton.style.display = "none";
      reRecordButton.style.display = "none";
      timer.textContent = "";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    }

    startButton.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          audioUrl = URL.createObjectURL(audioBlob);
          playButton.style.display = "block";
          startButton.style.display = "none";
          reRecordButton.style.display = "block"; // Show re-record button
          timer.textContent = "Recording complete";
        });

        // Start recording
        mediaRecorder.start();
        startButton.disabled = true;
        let timeLeft = 5;
        timer.textContent = `Recording: ${timeLeft} seconds`;

        countdown = setInterval(() => {
          timeLeft--;
          timer.textContent = `Recording: ${timeLeft} seconds`;
          if (timeLeft <= 0) {
            clearInterval(countdown);
            mediaRecorder.stop();
            stream.getTracks().forEach((track) => track.stop());
          }
        }, 1000);
      } catch (err) {
        resolve({
          name: "Microphone Test",
          success: false,
          details: "Microphone access denied or not available",
        });
        dialog.style.display = "none";
        overlay.style.display = "none";
      }
    });

    playButton.addEventListener("click", () => {
      const audio = new Audio(audioUrl);
      audio.play();
      yesButton.style.display = "block";
      noButton.style.display = "block";
    });

    yesButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      resolve({
        name: "Microphone Test",
        success: true,
        details: "Recording and playback successful",
      });
    });

    noButton.addEventListener("click", () => {
      dialog.style.display = "none";
      overlay.style.display = "none";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      resolve({
        name: "Microphone Test",
        success: false,
        details: "Recording or playback failed",
      });
    });

    reRecordButton.addEventListener("click", () => {
      // Reset state for re-recording
      resetState();
    });

    // Initialize state
    resetState();
  });
}
