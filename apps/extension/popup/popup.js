// CommerceOS Autonomous AI Buyer - Popup Controller
const API_BASE = "http://localhost:4000";
const WEB_BASE = "http://localhost:3000";

let authToken = null;
let currentProduct = null;
let currentEvaluation = null;
let recognition = null;
let isMuted = true;
let finalTranscript = "";

// DOM Elements
const btnConnect = document.getElementById("btnConnect");
const userProfile = document.getElementById("userProfile");
const merchantName = document.getElementById("merchantName");
const btnLogout = document.getElementById("btnLogout");

const voiceStatusBadge = document.getElementById("voiceStatusBadge");
const btnGrantMic = document.getElementById("btnGrantMic");
const btnToggleMute = document.getElementById("btnToggleMute");
const micIcon = document.getElementById("micIcon");
const micToggleText = document.getElementById("micToggleText");
const voiceStatusText = document.getElementById("voiceStatusText");

const transcriptInput = document.getElementById("transcriptInput");
const interimDisplay = document.getElementById("interimDisplay");
const btnClearTranscript = document.getElementById("btnClearTranscript");
const btnStartProcess = document.getElementById("btnStartProcess");

// Product Card Elements
const productTitle = document.getElementById("productTitle");
const productDesc = document.getElementById("productDesc");
const productSku = document.getElementById("productSku");
const productPrice = document.getElementById("productPrice");
const productStock = document.getElementById("productStock");
const btnQuickCheckout = document.getElementById("btnQuickCheckout");

// In-Stock Options Elements
const optionsSection = document.getElementById("optionsSection");
const optionsCount = document.getElementById("optionsCount");
const optionsList = document.getElementById("optionsList");

// Analysis & Checkout Elements
const analysisSection = document.getElementById("analysisSection");
const decisionCard = document.getElementById("decisionCard");
const decisionBadge = document.getElementById("decisionBadge");
const confidenceScore = document.getElementById("confidenceScore");
const decisionReason = document.getElementById("decisionReason");
const btnExecuteCheckout = document.getElementById("btnExecuteCheckout");

// Receipt & Payment Elements
const receiptSection = document.getElementById("receiptSection");
const receiptItemName = document.getElementById("receiptItemName");
const receiptOrderId = document.getElementById("receiptOrderId");
const receiptAmount = document.getElementById("receiptAmount");
const receiptRzpId = document.getElementById("receiptRzpId");
const btnOpenPayment = document.getElementById("btnOpenPayment");
const btnInstantSettle = document.getElementById("btnInstantSettle");
const btnViewInDashboard = document.getElementById("btnViewInDashboard");

// 1. Initialize Auth & State
function checkAuthStatus() {
  chrome.storage.local.get(["token", "merchant", "user"], (result) => {
    if (result.token) {
      authToken = result.token;
      btnConnect.classList.add("hidden");
      userProfile.classList.remove("hidden");
      merchantName.innerText = result.merchant?.name || result.user?.name || "Connected";
    } else {
      authToken = null;
      btnConnect.classList.remove("hidden");
      userProfile.classList.add("hidden");
    }
  });
}

// Connect Account Redirect to External Web Page
btnConnect.addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_BASE}/login?callback=extension` });
});

btnLogout.addEventListener("click", () => {
  chrome.storage.local.remove(["token", "merchant", "user"], () => {
    checkAuthStatus();
  });
});

// Grant Mic Permission Helper Page
btnGrantMic.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
});

// 2. Active Tab Product Discovery
function detectActiveProduct() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) {
      fallbackProduct();
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PRODUCT" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.product) {
        fallbackProduct();
      } else {
        setProduct(response.product);
      }
    });
  });
}

function fallbackProduct() {
  setProduct({
    title: "CloudStrider Carbon Runner (Stealth Black / UK 9)",
    price: 349900,
    currency: "INR",
    sku: "CS-BLK-09",
    description: "Next-generation ultralight carbon-plated marathon road racing shoe.",
    variantId: "var_cs_blk_09",
    availableStock: 35,
  });
}

function setProduct(product) {
  currentProduct = product;
  if (productTitle) productTitle.innerText = product.title || product.fullName || product.name || "Store Item";
  if (productDesc && product.description) {
    productDesc.innerText = product.description;
  }
  if (productSku) productSku.innerText = product.sku || "CS-BLK-09";
  if (productPrice) {
    productPrice.innerText = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: product.currency || "INR",
      maximumFractionDigits: 0,
    }).format((product.price || 0) / 100);
  }
  if (productStock) {
    const stockNum = product.availableStock !== undefined ? product.availableStock : 35;
    productStock.innerText = `● In Stock (${stockNum} available)`;
    productStock.style.color = stockNum > 0 ? "#10b981" : "#ef4444";
  }
}

// 3. Web Speech API with Mute / Unmute and Live Transcript Display
function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatusText.innerText = "Speech recognition is not supported in this browser.";
    btnToggleMute.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN";

  recognition.onstart = () => {
    voiceStatusBadge.innerText = "● Listening";
    voiceStatusBadge.className = "status-pill active";
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcriptPiece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += (finalTranscript.length && !finalTranscript.endsWith(" ") ? " " : "") + transcriptPiece.trim();
      } else {
        interim += transcriptPiece;
      }
    }

    transcriptInput.value = finalTranscript.trim();
    interimDisplay.innerText = interim ? `Speaking: "${interim}"` : "";

    const hasText = Boolean(finalTranscript.trim() || interim.trim());
    btnStartProcess.disabled = !hasText;
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition event:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      btnGrantMic.classList.remove("hidden");
      voiceStatusText.innerHTML = "Microphone blocked. Click <b>Enable Mic Access</b> above.";
      muteAndStop(false);
    } else if (event.error !== "no-speech") {
      voiceStatusText.innerText = `Note: ${event.error}. Click Unmute to resume.`;
    }
  };

  recognition.onend = () => {
    if (!isMuted) {
      try {
        recognition.start();
      } catch (err) {}
    }
  };
}

function unmuteAndRecord() {
  if (!recognition) return;
  isMuted = false;

  btnToggleMute.classList.remove("muted");
  btnToggleMute.classList.add("unmuted");
  micIcon.innerText = "🔇";
  micToggleText.innerText = "Mute (Finished Speaking)";
  voiceStatusBadge.innerText = "● Listening";
  voiceStatusBadge.className = "status-pill active";
  voiceStatusText.innerText = "Listening live... Speak your condition. Click Mute when finished.";

  try {
    recognition.start();
  } catch (err) {}
}

function muteAndStop(autoTriggerAi = true) {
  isMuted = true;

  btnToggleMute.classList.remove("unmuted");
  btnToggleMute.classList.add("muted");
  micIcon.innerText = "🎙️";
  micToggleText.innerText = "Unmute (Speak Condition)";
  voiceStatusBadge.innerText = "Muted";
  voiceStatusBadge.className = "status-pill muted";

  if (recognition) {
    try {
      recognition.stop();
    } catch (err) {}
  }

  interimDisplay.innerText = "";

  const command = transcriptInput.value.trim();
  if (command && command.length > 2) {
    btnStartProcess.disabled = false;
    if (autoTriggerAi) {
      voiceStatusText.innerText = "Finished speaking! Finding matching in-stock items...";
      triggerAiEvaluation(command);
    } else {
      voiceStatusText.innerText = "Muted. Click 'Find Options' or select an item below.";
    }
  } else {
    voiceStatusText.innerText = "Muted. Click Unmute to speak your condition.";
  }
}

// Toggle Mute / Unmute Button
btnToggleMute.addEventListener("click", () => {
  if (isMuted) {
    unmuteAndRecord();
  } else {
    muteAndStop(true);
  }
});

// Clear Transcript Button
btnClearTranscript.addEventListener("click", () => {
  finalTranscript = "";
  transcriptInput.value = "";
  interimDisplay.innerText = "";
  btnStartProcess.disabled = true;
  voiceStatusText.innerText = "Transcript cleared. Click Unmute to speak.";
});

// Direct typing in transcript input
transcriptInput.addEventListener("input", () => {
  finalTranscript = transcriptInput.value;
  btnStartProcess.disabled = !finalTranscript.trim();
});

// Start Process Button (manual trigger)
btnStartProcess.addEventListener("click", () => {
  if (!isMuted) {
    muteAndStop(true);
  } else {
    const command = transcriptInput.value.trim();
    if (command) {
      voiceStatusText.innerText = "Finding in-stock items matching condition...";
      triggerAiEvaluation(command);
    }
  }
});

// Quick voice chip clicks
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const cmd = chip.getAttribute("data-command");
    finalTranscript = cmd;
    transcriptInput.value = cmd;
    interimDisplay.innerText = "";
    btnStartProcess.disabled = false;
    voiceStatusText.innerText = "Searching in-stock items...";
    triggerAiEvaluation(cmd);
  });
});

// 4. In-Stock Options Search & AI Evaluation
async function triggerAiEvaluation(voiceCommand) {
  voiceStatusText.innerText = "Querying live catalog & Groq LLM...";

  try {
    const response = await fetch(`${API_BASE}/buyer/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceCommand }),
    });

    const data = await response.json();

    if (data.options && data.options.length > 0) {
      optionsSection.classList.remove("hidden");
      optionsCount.innerText = `${data.options.length} in stock`;
      optionsList.innerHTML = "";

      data.options.forEach((opt, idx) => {
        const card = document.createElement("div");
        card.className = idx === 0 ? "option-card selected" : "option-card";
        card.innerHTML = `
          <div class="option-top">
            <span class="option-name">${opt.fullName}</span>
            <span class="option-price">₹${(opt.price / 100).toFixed(0)}</span>
          </div>
          <div class="option-bottom">
            <span class="option-meta">SKU: ${opt.sku} • In Stock: ${opt.availableStock}</span>
            <span class="option-reason">${opt.matchReason || "In stock"}</span>
          </div>
        `;

        card.onclick = () => {
          document.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
          selectProductOption(opt);
        };

        optionsList.appendChild(card);
      });

      // Default select top pick
      const topPick = data.options[0];
      selectProductOption(topPick);

      // Render AI Evaluation Card
      analysisSection.classList.remove("hidden");
      decisionCard.className = "decision-card buy";
      decisionBadge.innerText = "BUY APPROVED";
      confidenceScore.innerText = "96% Confidence";
      decisionReason.innerText = data.aiSummary || `In-stock option "${topPick.fullName}" matches your criteria.`;
      btnExecuteCheckout.disabled = false;
      voiceStatusText.innerText = `Selected "${topPick.productName}". Click Checkout below or pick another option.`;
    } else {
      voiceStatusText.innerText = "No in-stock items found under that criteria. Showing default product.";
    }
  } catch (err) {
    console.error("Options fetch error:", err);
    voiceStatusText.innerText = "Could not reach catalog. Using default item.";
  }
}

function selectProductOption(opt) {
  currentProduct = {
    title: opt.fullName,
    price: opt.price,
    currency: opt.currency || "INR",
    sku: opt.sku,
    description: opt.description,
    variantId: opt.variantId,
    availableStock: opt.availableStock,
  };
  setProduct(currentProduct);
  decisionReason.innerText = `Selected: "${opt.fullName}" • Price: ₹${(opt.price / 100).toFixed(0)} • Stock Available: ${opt.availableStock} units.`;
}

// 5. Checkout Handlers
// 1-Click Buy for user "who just sees the product and then checkout"
if (btnQuickCheckout) {
  btnQuickCheckout.addEventListener("click", () => {
    executeCheckout(currentProduct);
  });
}

// Autonomous Checkout for voice-evaluated items
btnExecuteCheckout.addEventListener("click", () => {
  executeCheckout(currentProduct);
});

async function executeCheckout(targetProduct) {
  const product = targetProduct || currentProduct;
  if (!product) return;

  btnExecuteCheckout.disabled = true;
  btnExecuteCheckout.innerText = "⚡ Reserving Stock & Creating Checkout...";
  if (btnQuickCheckout) {
    btnQuickCheckout.disabled = true;
    btnQuickCheckout.innerText = "⚡ Reserving Stock...";
  }

  try {
    const response = await fetch(`${API_BASE}/buyer/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: product.variantId || "var_cs_blk_09",
        quantity: 1,
        customer: {
          name: "Autonomous Voice Buyer",
          email: "voice-agent@commerceos.ai",
          phone: "+919999911111",
        },
        policy: {
          maxPrice: 1000000,
          currency: "INR",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Checkout failed: Insufficient stock or policy rejection");
      btnExecuteCheckout.disabled = false;
      btnExecuteCheckout.innerText = "⚡ Execute Autonomous Checkout";
      if (btnQuickCheckout) {
        btnQuickCheckout.disabled = false;
        btnQuickCheckout.innerText = "⚡ Buy Active Item (1-Click Checkout)";
      }
      return;
    }

    const { order, payment } = data;

    // Render receipt
    analysisSection.classList.add("hidden");
    if (optionsSection) optionsSection.classList.add("hidden");
    receiptSection.classList.remove("hidden");

    if (receiptItemName) receiptItemName.innerText = product.title || product.fullName || "Selected Product";
    receiptOrderId.innerText = `#${order.id.slice(-8)}`;
    receiptAmount.innerText = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: order.currency || "INR",
      maximumFractionDigits: 0,
    }).format((order.total || 0) / 100);
    receiptRzpId.innerText = payment.providerOrderId;

    const checkoutUrl = `${WEB_BASE}/checkout?orderId=${order.id}&pay=true`;

    btnOpenPayment.onclick = () => {
      chrome.tabs.create({ url: checkoutUrl });
    };

    btnInstantSettle.onclick = async () => {
      btnInstantSettle.disabled = true;
      btnInstantSettle.innerText = "⚡ Settling...";
      try {
        const verifyRes = await fetch(`${API_BASE}/buyer/orders/${order.id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: payment.providerOrderId,
            razorpayPaymentId: `pay_ext_${Date.now()}`,
            razorpaySignature: "demo_sig_verified_via_extension",
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          btnInstantSettle.innerText = "✓ Settled via Demo";
          const statusElem = document.querySelector("#receiptSection strong[style*='color']");
          if (statusElem) statusElem.innerText = "PAID & SETTLED";
          btnOpenPayment.classList.add("hidden");
        } else {
          alert("Settlement error: " + verifyData.error);
          btnInstantSettle.disabled = false;
          btnInstantSettle.innerText = "⚡ Instant Settle (Demo)";
        }
      } catch (err) {
        alert("Settlement failed: " + err.message);
        btnInstantSettle.disabled = false;
        btnInstantSettle.innerText = "⚡ Instant Settle (Demo)";
      }
    };

    btnViewInDashboard.onclick = () => {
      chrome.tabs.create({ url: `${WEB_BASE}/orders/${order.id}` });
    };

    // Auto-open checkout portal in new tab
    chrome.tabs.create({ url: checkoutUrl });
  } catch (err) {
    alert("Checkout error: " + err.message);
    btnExecuteCheckout.disabled = false;
    btnExecuteCheckout.innerText = "⚡ Execute Autonomous Checkout";
    if (btnQuickCheckout) {
      btnQuickCheckout.disabled = false;
      btnQuickCheckout.innerText = "⚡ Buy Active Item (1-Click Checkout)";
    }
  }
}

// Initialize on popup open
document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();
  detectActiveProduct();
  setupSpeechRecognition();
});
