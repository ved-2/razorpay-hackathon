// Product Scraper Content Script
// Extracts e-commerce product metadata from the active DOM

(function () {
  function extractProductMetadata() {
    let title = "";
    let price = 0; // in paise
    let currency = "INR";
    let sku = "";
    let description = "";
    let imageUrl = "";

    // 1. Check JSON-LD (Schema.org)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.innerText);
        const item = data["@type"] === "Product" ? data : (data["@graph"]?.find((g) => g["@type"] === "Product"));
        if (item) {
          title = item.name || title;
          description = item.description || description;
          imageUrl = Array.isArray(item.image) ? item.image[0] : item.image || imageUrl;
          sku = item.sku || sku;

          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer) {
            price = Math.round(parseFloat(offer.price || 0) * 100);
            currency = offer.priceCurrency || currency;
          }
        }
      } catch {
        // Continue
      }
    }

    // 2. OpenGraph Meta Tags Fallback
    if (!title) {
      title =
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
        document.querySelector("h1")?.innerText?.trim() ||
        document.title;
    }

    if (!description) {
      description =
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        "";
    }

    if (!imageUrl) {
      imageUrl =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
        document.querySelector('img[class*="product"]')?.getAttribute("src") ||
        "";
    }

    // 3. Fallback Price Extraction from DOM
    if (!price) {
      const priceMeta =
        document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content");

      if (priceMeta) {
        price = Math.round(parseFloat(priceMeta) * 100);
      } else {
        // Scan text matching ₹ or Rs.
        const priceElement = document.querySelector(
          '[class*="price"], [id*="price"], .amount, .product-price'
        );
        if (priceElement) {
          const match = priceElement.innerText.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i);
          if (match && match[1]) {
            const raw = match[1].replace(/,/g, "");
            price = Math.round(parseFloat(raw) * 100);
          }
        }
      }
    }

    // Fallback default sample SKU if none detected
    if (!sku) {
      sku = "SKU-" + Math.abs(title.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
    }

    return {
      title: title ? title.slice(0, 100) : "Detected Store Product",
      price: price > 0 ? price : 249900, // Default ₹2,499 if unpriced in preview
      currency: currency || "INR",
      sku,
      description: description ? description.slice(0, 300) : "Product discovered on current page",
      imageUrl,
      pageUrl: window.location.href,
    };
  }

  // Listen for extraction requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SCRAPE_PRODUCT") {
      const product = extractProductMetadata();
      sendResponse({ product });
    }
    return true;
  });
})();
