const btnGrant = document.getElementById("btnGrant");
const statusDiv = document.getElementById("status");

async function requestMic() {
  statusDiv.innerText = "Prompting browser for permission...";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Permission granted! Stop all tracks
    stream.getTracks().forEach((track) => track.stop());
    statusDiv.innerText = "✓ Permission granted! Closing tab...";
    setTimeout(() => {
      window.close();
    }, 1200);
  } catch (err) {
    statusDiv.innerText = "Microphone access denied: " + err.message;
  }
}

btnGrant.addEventListener("click", requestMic);

// Auto trigger prompt on load
document.addEventListener("DOMContentLoaded", () => {
  requestMic();
});
