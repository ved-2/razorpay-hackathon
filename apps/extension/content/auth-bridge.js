// Auth Bridge Content Script for CommerceOS Web App
// Intercepts external web login and securely transmits token to the Chrome Extension

(function () {
  console.log("CommerceOS Auth Bridge loaded on", window.location.href);

  // 1. Listen for explicit postMessage from the web login page
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === "COMMERCEOS_AUTH_SUCCESS") {
      console.log("CommerceOS Auth Success intercepted by Chrome Extension bridge.");

      chrome.runtime.sendMessage(
        {
          type: "AUTH_HANDOVER",
          data: {
            token: event.data.token,
            merchant: event.data.merchant,
            user: event.data.user,
          },
        },
        (response) => {
          if (response && response.success) {
            // Signal back to the web page that extension successfully stored credentials
            window.postMessage(
              { type: "COMMERCEOS_EXTENSION_CONNECTED" },
              "*"
            );
          }
        }
      );
    }
  });

  // 2. Check URL parameters for explicit callback
  const urlParams = new URLSearchParams(window.location.search);
  const isExtensionCallback = urlParams.get("callback") === "extension";

  if (isExtensionCallback) {
    // If already logged in, retrieve stored token and merchant from localStorage
    try {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        chrome.runtime.sendMessage({
          type: "AUTH_HANDOVER",
          data: {
            token: storedToken,
            merchant: JSON.parse(localStorage.getItem("merchant") || "null"),
            user: JSON.parse(localStorage.getItem("user") || "null"),
          },
        });
      }
    } catch {
      // Ignore parse error
    }
  }
})();
