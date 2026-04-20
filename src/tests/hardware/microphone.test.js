/**
 * Microphone Test
 *
 *   Permission denied → partial
 *   Other error       → fail
 *   Playback confirmed → success
 *   Playback denied   → fail
 */
export async function testMicrophone() {
  return new Promise((resolve) => {
    const dialog = document.getElementById("mic-dialog");
    const startButton = document.getElementById("start-recording");
    const playButton = document.getElementById("play-recording");
    const yesButton = document.getElementById("mic-yes");
    const noButton = document.getElementById("mic-no");
    const reRecordButton = document.getElementById("re-record");
    const timerEl = document.getElementById("mic-timer");
    const canvas = document.getElementById("waveform");
    const canvasCtx = canvas.getContext("2d");

    dialog.style.display = "flex";

    let mediaRecorder = null;
    let audioChunks = [];
    let audioUrl = null;
    let audioContext = null;
    let animationId = null;
    let countdown = null;
    let stream = null;

    function resetUI() {
      startButton.style.display = "block";
      startButton.disabled = false;
      playButton.style.display = "none";
      yesButton.style.display = "none";
      noButton.style.display = "none";
      reRecordButton.style.display = "none";
      canvas.style.display = "none";
      timerEl.textContent = "";
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      cancelAnimationFrame(animationId);
    }

    function drawWaveform(analyser) {
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const sliceWidth = canvas.width / bufferLength;

      function draw() {
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = "rgb(240,240,240)";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "#8223d2";
        canvasCtx.beginPath();

        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const y = ((dataArray[i] / 128) * canvas.height) / 2;
          i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
          x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        animationId = requestAnimationFrame(draw);
      }
      draw();
    }

    function done(status, details) {
      clearInterval(countdown);
      cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContext) audioContext.close();
      dialog.style.display = "none";
      resolve({ name: "Microphone", status, details });
    }

    startButton.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        audioContext.createMediaStreamSource(stream).connect(analyser);

        canvas.style.display = "block";
        drawWaveform(analyser);

        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable", (e) =>
          audioChunks.push(e.data),
        );
        mediaRecorder.addEventListener("stop", () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });
          audioUrl = URL.createObjectURL(blob);

          cancelAnimationFrame(animationId);
          canvas.style.display = "none";
          startButton.style.display = "none";
          playButton.style.display = "block";
          reRecordButton.style.display = "block";
          timerEl.textContent = "Recording complete — press Play to review";

          stream.getTracks().forEach((t) => t.stop());
        });

        mediaRecorder.start();
        startButton.disabled = true;

        let timeLeft = 5;
        timerEl.textContent = `Recording: ${timeLeft}s`;
        countdown = setInterval(() => {
          timeLeft--;
          timerEl.textContent = `Recording: ${timeLeft}s`;
          if (timeLeft <= 0) {
            clearInterval(countdown);
            if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
          }
        }, 1000);
      } catch (err) {
        const isPermission =
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError";
        done(
          isPermission ? "partial" : "fail",
          isPermission
            ? "Microphone permission denied — cannot verify hardware"
            : `Microphone error: ${err.message}`,
        );
      }
    });

    playButton.addEventListener("click", () => {
      const audio = new Audio(audioUrl);
      audio.play();
      yesButton.style.display = "block";
      noButton.style.display = "block";
    });

    yesButton.addEventListener("click", () =>
      done("success", "Recording and playback confirmed by user"),
    );
    noButton.addEventListener("click", () =>
      done("fail", "Recording or playback quality unacceptable"),
    );
    reRecordButton.addEventListener("click", resetUI);

    resetUI();
  });
}
