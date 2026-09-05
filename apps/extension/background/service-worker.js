// Background Service Worker for CommerceOS Autonomous AI Buyer Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("CommerceOS AI Buyer Extension installed successfully.");
  chrome.action.setBadgeText({ text: "AI" });
  chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
});

// Message hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_HANDOVER") {
    chrome.storage.local.set(
      {
        token: message.data.token,
        merchant: message.data.merchant,
        user: message.data.user,
        connectedAt: new Date().toISOString(),
      },
      () => {
        console.log("CommerceOS auth token saved in chrome.storage.local.");
        chrome.action.setBadgeText({ text: "LIVE" });
        chrome.action.setBadgeBackgroundColor({ color: "#059669" });
        sendResponse({ success: true });
      }
    );
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_ACTIVE_PRODUCT") {
    chrome.storage.local.get(["activeProduct"], (result) => {
      sendResponse({ product: result.activeProduct || null });
    });
    return true;
  }

  if (message.type === "SET_ACTIVE_PRODUCT") {
    chrome.storage.local.set({ activeProduct: message.product }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "LOGOUT") {
    chrome.storage.local.remove(["token", "merchant", "user", "connectedAt"], () => {
      chrome.action.setBadgeText({ text: "AI" });
      chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
      sendResponse({ success: true });
    });
    return true;
  }
});
