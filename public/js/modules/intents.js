// intents.js — clipboard paste, share intent, app url open, app state
import { translations } from "../i18n/index.js";
import {
  Clipboard,
  App,
  triggerHaptic,
  showToast,
  stopAllMedia,
  checkWifiOnlyGuard,
} from "../utils/index.js";
import {
  isBatchMode,
  batchUrlInput,
  urlInput,
  clearBtn,
  pasteBtn,
  downloadBtn,
  closeResult,
  resultSection,
  currentLang,
  isIntentPending,
  lastHandledLinkTime,
  setIntentPending,
  setLastHandledLinkTime,
  setHistoryUnlocked,
  setSettingsUnlocked,
  updateGreeting,
} from "./core.js";

export async function handlePasteFromClipboard(isSilent = false) {
  try {
    let text = "";
    if (window.Capacitor?.isNativePlatform?.() && Clipboard) {
      try {
        const result = await Clipboard.read();
        text = result.value;
      } catch (err) {
        text = await navigator.clipboard.readText();
      }
    } else {
      text = await navigator.clipboard.readText();
    }

    if (text && text.trim()) {
      const trimmed = text.trim();
      const isUrl =
        trimmed.startsWith("http") ||
        trimmed.includes(".com") ||
        trimmed.includes(".net") ||
        trimmed.includes("youtu.be");

      if (isUrl) {
        if (isBatchMode) {
          // Guard: Do not execute silent auto-paste on app open/resume in Batch Mode
          if (isSilent) return;

          const existing = batchUrlInput.value.trim();
          if (!existing) {
            batchUrlInput.value = trimmed;
          } else if (!existing.includes(trimmed)) {
            batchUrlInput.value = existing + "\n" + trimmed;
          }
          triggerHaptic("light");
          return;
        } else {
          if (urlInput.value.trim() === trimmed) return;
          urlInput.value = trimmed;
          urlInput.dispatchEvent(new Event("input"));
          triggerHaptic("light");
        }

        const autoAnalyze =
          localStorage.getItem("mori_auto_analyze") === "true";
        if (autoAnalyze) {
          setTimeout(() => downloadBtn?.click(), 300);
        } else if (isSilent) {
          const autoDownload =
            localStorage.getItem("mori_auto_download") === "true";
          if (autoDownload) {
            // Wi-Fi check for auto-download
            const canAuto = await checkWifiOnlyGuard();
            if (canAuto) {
              setTimeout(() => downloadBtn.click(), 500);
            }
          }
        }
      } else if (!isSilent) {
        showToast(translations[currentLang]["toast-no-link"]);
      }
    } else if (!isSilent) {
      showToast(translations[currentLang]["toast-clipboard-empty"]);
    }
  } catch (e) {
    if (!isSilent)
      showToast(translations[currentLang]["toast-clipboard-empty"]);
  }
}

pasteBtn?.addEventListener("click", () => handlePasteFromClipboard());

urlInput.addEventListener("input", () => {
  if (!isBatchMode) {
    const isEmpty = urlInput.value === "";
    clearBtn.classList.toggle("hidden", isEmpty);
    pasteBtn.classList.toggle("hidden", !isEmpty);
  }
});

batchUrlInput?.addEventListener("input", () => {
  if (isBatchMode) {
    const isEmpty = batchUrlInput.value === "";
    clearBtn.classList.toggle("hidden", isEmpty);
    pasteBtn.classList.toggle("hidden", !isEmpty);
  }
});

clearBtn.addEventListener("click", () => {
  if (isBatchMode) {
    if (batchUrlInput) batchUrlInput.value = "";
  } else {
    urlInput.value = "";
  }
  clearBtn.classList.add("hidden");
  pasteBtn.classList.remove("hidden");
  if (isBatchMode && batchUrlInput) {
    batchUrlInput.focus();
  } else {
    urlInput.focus();
  }
});

closeResult?.addEventListener("click", () => {
  const slidesWrapper = document.getElementById("slidesWrapper");
  if (slidesWrapper) {
    stopAllMedia(slidesWrapper);
  }
  resultSection.classList.add("hidden");
  const supportedSection = document.querySelector(".supported-section");
  if (supportedSection) supportedSection.classList.remove("hidden");
  updateGreeting();
});

// Function to process shared text
function processSharedText(text) {
  if (!text) return;
  setIntentPending(false);
  setLastHandledLinkTime(Date.now());
  // Find a URL in the text
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const finalUrl = urlMatch ? urlMatch[0] : text;

  urlInput.value = finalUrl;
  urlInput.dispatchEvent(new Event("input"));

  // Highlight the input
  urlInput.focus();
  showToast(translations[currentLang]["toast-pasted-share"]);

  // Auto-download after a short delay
  setTimeout(() => {
    if (urlInput.value === finalUrl) {
      downloadBtn.click();
    }
  }, 800);
}

// Handle Shared Intent from Native Android
window.addEventListener("moriShareIntent", (e) => {
  try {
    let data = e.detail;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = { text: data };
      }
    }
    const text = data?.text || data;
    if (typeof text === "string") processSharedText(text);
  } catch (err) {
    console.error("Share Intent Error:", err);
  }
});

// Startup check for shared text (fallback for cold starts)
setTimeout(() => {
  if (window.moriShareText) {
    processSharedText(window.moriShareText);
    window.moriShareText = null; // Clear it
  }
}, 1500);

if (App && typeof App.addListener === "function") {
  App.addListener("appUrlOpen", (data) => {
    if (data.url) {
      setIntentPending(false);
      setLastHandledLinkTime(Date.now());
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });

  if (typeof App.getLaunchUrl === "function") {
    App.getLaunchUrl().then((data) => {
      if (data && data.url) {
        setLastHandledLinkTime(Date.now());
        urlInput.value = data.url;
        urlInput.dispatchEvent(new Event("input"));
        setTimeout(() => downloadBtn.click(), 500);
      }
    });
  }

  // App State Change (Auto-detect clipboard on resume)
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      const loopSetting = localStorage.getItem("mori_loop") !== "false";
      const autoPaste = localStorage.getItem("mori_auto_paste") !== "false";
      if (autoPaste) {
        setIntentPending(true); // Assume a share might be coming

        // Wait and see if an intent clears the flag
        setTimeout(() => {
          const timeSinceShared = Date.now() - lastHandledLinkTime;
          // Only paste if NO share intent arrived during this window
          if (isIntentPending && timeSinceShared > 2500) {
            handlePasteFromClipboard(true);
          }
          setIntentPending(false); // Reset for next time
        }, 1500);
      }
    } else {
      // App going to background, reset flags & re-lock sensitive areas
      setIntentPending(false);
      setHistoryUnlocked(false);
      setSettingsUnlocked(false);
    }
  });
}
