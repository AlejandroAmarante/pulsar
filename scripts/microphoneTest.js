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
    const reRecordButton = document.getElementById("re-record");
    const timer = document.getElementById("mic-timer");
    const canvas = document.getElementById("waveform");
    const canvasCtx = canvas.getContext("2d");

    dialog.style.display = "flex";
    overlay.style.display = "block";

    let countdown;
    let stream;
    let analyser;
    let audioContext;
    let animationId;

    function resetState() {
      startButton.style.display = "block";
      startButton.disabled = false;
      playButton.style.display = "none";
      yesButton.style.display = "none";
      noButton.style.display = "none";
      reRecordButton.style.display = "none";
      canvas.style.display = "none";
      timer.textContent = "";
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContext) {
        audioContext.close();
      }
      cancelAnimationFrame(animationId);
    }

    function drawWaveform() {
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      function draw() {
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = "rgb(240, 240, 240)";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "#8223d2";
        canvasCtx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();

        animationId = requestAnimationFrame(draw);
      }

      draw();
    }

    startButton.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 2048;
        source.connect(analyser);

        canvas.style.display = "block";
        drawWaveform();

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
          reRecordButton.style.display = "block";
          timer.textContent = "Recording complete";
          stream.getTracks().forEach((track) => track.stop());
          cancelAnimationFrame(animationId);
          canvas.style.display = "none";
        });

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
