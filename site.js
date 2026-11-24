// Video playback is user-initiated; no analytics, accounts, or external scripts.
let reported = false;
function mediaUnavailable() {
  if (reported) return;
  reported = true;
  const message = document.createElement("p");
  message.textContent =
    "This browser could not play the walkthrough. The poster still shows the product. ";
  const screenshot = document.createElement("a");
  screenshot.href = "assets/cosmosbuild.png";
  screenshot.textContent = "Open the full screenshot";
  message.append(screenshot);
  message.setAttribute("role", "alert");
  document.querySelector(".screen")?.after(message);
}
const video = document.querySelector("video");
video?.addEventListener("error", mediaUnavailable);
video?.querySelector("source")?.addEventListener("error", mediaUnavailable);
if (video && !video.canPlayType("video/webm")) mediaUnavailable();
