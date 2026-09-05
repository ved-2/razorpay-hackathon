# CommerceOS — Autonomous AI Buyer Chrome Extension (Manifest V3)

Voice-enabled autonomous buyer agent powered by CommerceOS and ultra-fast Groq LPU inference.

## Features

1. **Mute / Unmute Voice Control & Speech Recognition**:
   - Explicit **Unmute (Start Speaking)** and **Mute (Finished Speaking)** buttons.
   - Continuous recognition (`continuous = true`) so speech is not prematurely cut off during natural pauses.
   - The AI evaluation process **starts only once you finish speaking and click Mute** (or click Start AI Evaluation).
2. **Live Spoken Transcript Area**:
   - Real-time display streaming your spoken words and interim phrases as you speak.
   - Editable box so you can review, modify amounts, or clear the transcript.
3. **Microphone Permission Helper (`permission.html`)**:
   - Solves the Chrome popup `not-allowed` mic error via a dedicated one-click permission prompt.
4. **Real-time Product Scraping**:
   - Automatically parses OpenGraph metadata, JSON-LD schemas, prices, titles, and currency from whatever e-commerce or store tab you are currently viewing.
5. **Groq LPU Intelligence**:
   - Sends the scraped product and user voice prompt to the backend evaluation engine (`/buyer/evaluate`), running inference with sub-second response times.
6. **External Web Login Handover**:
   - Secure authentication redirect: login happens on the web portal (`http://localhost:3000/login?callback=extension`), preserving security policies and synchronizing session tokens to `chrome.storage.local`.
7. **Autonomous Razorpay Checkout**:
   - Executes policy-compliant autonomous orders (`/buyer/checkout`) directly settled through Razorpay.

## How to Install or Reload in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. If previously loaded, click the **Reload icon** on `CommerceOS — Autonomous AI Buyer`.
4. Otherwise, click **Load unpacked** and select `D:\razorpay-hackathon\apps\extension`.
5. Pin the extension to your toolbar.

## Voice Workflow

1. Open the popup.
2. Click **Unmute (Start Speaking)**.
3. Speak your purchase instruction (e.g., *"Buy this item if the price is under 4000 rupees"*).
4. Watch your words appear in real-time in the **Live Spoken Transcript** area.
5. Click **Mute (Finished Speaking)** when done.
6. Groq LLM evaluates the prompt, renders the approval decision, and unlocks **Execute Autonomous Checkout**.
