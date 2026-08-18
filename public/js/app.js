// app.js — entry point: boot, guide, nav, hardware back
import { translations } from "./i18n/index.js";
import {
  triggerHaptic,
  showToast,
  stopAllMedia,
  pauseAllMedia,
  App,
} from "./utils/index.js";

import { setUIState, renderHistory, updateSliderUI } from "./ui.js";
import { initAuthListeners, verifyLock } from "./modules/authManager.js";
import {
  autoClearOldHistory,
  autoClearOldCache,
  onHistoryItemClick,
  onHistoryDeleteClick,
} from "./modules/history.js";
import { handlePasteFromClipboard } from "./modules/intents.js";
import {
  APP_VERSION,
  currentLang,
  isEditingHistory,
  isBatchMode,
  setBatchMode,
  batchToggleBtn,
  batchCloseBtn,
  batchModalOverlay,
  batchUrlInput,
  urlInput,
  inputWrapper,
  downloadBtn,
  clearBtn,
  pasteBtn,
  isHistoryUnlocked,
  isSettingsUnlocked,
  setHistoryUnlocked,
  setSettingsUnlocked,
  setCurrentSlideIndex,
  slideData,
  currentSlideIndex,
  slidePrevBtn,
  slideNextBtn,
  guideOverlay,
  hideGuideCheckbox,
  closeGuideBtn,
  guideToSettingsBtn,
  settingsMainMenu,
  settingsSubPages,
} from "./modules/core.js";

// imports for side effects (settings UI, history, modals, update, intents, download)
import "./modules/settings.js";
import "./modules/history.js";
import "./modules/modals.js";
import "./modules/update.js";
import "./modules/intents.js";
import "./modules/download.js";

// Batch Mode Toggle
if (batchToggleBtn) {
  batchToggleBtn.addEventListener("click", () => {
    setBatchMode(!isBatchMode);
    const lang = translations[currentLang];
    if (isBatchMode) {
      batchToggleBtn.classList.add("active");
      inputWrapper?.classList.add("batch-active");
      urlInput.classList.add("hidden");
      batchUrlInput.classList.remove("hidden");
      downloadBtn.textContent = lang["btn-analyze-batch"] || "ANALYZE BATCH";
      const isEmpty = batchUrlInput ? batchUrlInput.value === "" : true;
      clearBtn.classList.toggle("hidden", isEmpty);
      pasteBtn.classList.toggle("hidden", !isEmpty);
    } else {
      batchToggleBtn.classList.remove("active");
      inputWrapper?.classList.remove("batch-active");
      urlInput.classList.remove("hidden");
      batchUrlInput.classList.add("hidden");
      downloadBtn.textContent = lang["btn-analyze"] || "ANALYZE";
      const isEmpty = urlInput.value === "";
      clearBtn.classList.toggle("hidden", isEmpty);
      pasteBtn.classList.toggle("hidden", !isEmpty);
    }
  });
}

if (batchCloseBtn) {
  batchCloseBtn.addEventListener("click", () => {
    batchModalOverlay?.classList.add("hidden");
  });
}

const appVersionVal = document.querySelector("#checkUpdateBtn .info-val");
if (appVersionVal) appVersionVal.textContent = " " + APP_VERSION;

// Run guide check on startup
function initUserGuide() {
  const isHidden = localStorage.getItem("mori_hide_guide") === "true";
  if (!isHidden) {
    guideOverlay?.classList.remove("hidden");
  }
}

closeGuideBtn?.addEventListener("click", () => {
  if (hideGuideCheckbox?.checked) {
    localStorage.setItem("mori_hide_guide", "true");
  }
  guideOverlay?.classList.add("hidden");
});

guideToSettingsBtn?.addEventListener("click", () => {
  if (hideGuideCheckbox?.checked) {
    localStorage.setItem("mori_hide_guide", "true");
  }
  guideOverlay?.classList.add("hidden");
  switchPage("settings");
});

// Run guide check on startup
document.addEventListener("DOMContentLoaded", initUserGuide);

// Global document click (dropdown close + haptic)
document.addEventListener("click", (e) => {
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.add("hidden"));

  const interactive = e.target.closest(
    "button, .nav-item, .settings-item, .toggle-switch, .dropdown-item, .paste-btn, .clear-btn, .chip",
  );
  if (interactive) {
    triggerHaptic("medium");
  }
});

// Slider Navigation (Delegated to UI module)
slidePrevBtn?.addEventListener("click", () => {
  if (currentSlideIndex > 0) {
    setCurrentSlideIndex(currentSlideIndex - 1);
    setUIState({ currentSlideIndex });
    updateSliderUI();
  }
});

slideNextBtn?.addEventListener("click", () => {
  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  if (currentSlideIndex < sliderItems.length - 1) {
    setCurrentSlideIndex(currentSlideIndex + 1);
    setUIState({ currentSlideIndex });
    updateSliderUI();
  }
});

// Initialize App
autoClearOldHistory();
autoClearOldCache();
initAuthListeners(currentLang);
setUIState({ currentLang, isEditingHistory });
renderHistory(onHistoryItemClick, onHistoryDeleteClick);

const pages = ["home", "history", "settings"];

async function switchPage(pageId) {
  const isNative = window.Capacitor?.isNativePlatform?.();
  const isPrivacyOn = localStorage.getItem("mori_privacy_lock") === "true";
  const lockType = localStorage.getItem("mori_lock_type") || "none";

  if (!isNative) {
    setHistoryUnlocked(true);
    setSettingsUnlocked(true);
  }

  if (pageId === "history" && !isHistoryUnlocked) {
    if (isPrivacyOn && lockType !== "none") {
      const verified = await verifyLock("label-biometric-reason", currentLang);
      if (verified) {
        setHistoryUnlocked(true);
      } else {
        return;
      }
    } else {
      setHistoryUnlocked(true);
    }
  }

  if (pageId === "settings" && !isSettingsUnlocked) {
    if (isPrivacyOn && lockType !== "none") {
      const verified = await verifyLock("label-biometric-reason", currentLang);
      if (verified) {
        setSettingsUnlocked(true);
      } else {
        return;
      }
    } else {
      setSettingsUnlocked(true);
    }
  }

  const currentNavItems = document.querySelectorAll(".nav-item");
  const item = Array.from(currentNavItems).find(
    (i) => i.getAttribute("data-page") === pageId,
  );
  if (!item) return;

  const targetPageId = pageId + "Page";
  currentNavItems.forEach((i) => i.classList.remove("active"));
  item.classList.add("active");

  document
    .querySelectorAll(".page-content")
    .forEach((page) => page.classList.add("hidden"));
  pauseAllMedia(document);

  const targetPage = document.getElementById(targetPageId);
  if (targetPage) targetPage.classList.remove("hidden");

  // Reset settings to main menu when entering settings page
  if (pageId === "settings") {
    settingsSubPages?.forEach((p) => p.classList.add("hidden"));
    if (settingsMainMenu) settingsMainMenu.classList.remove("hidden");
  }

  // Refresh history if entering history page
  if (pageId === "history") {
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  }
}

// Global Event Delegation for Navigation Items
document.addEventListener("click", (e) => {
  const navItem = e.target.closest(".nav-item");
  if (navItem) {
    e.preventDefault();
    const pageId = navItem.getAttribute("data-page");
    if (pageId) {
      switchPage(pageId);
    }
  }
});

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    if (Math.abs(diffY) > Math.abs(diffX)) return;

    if (Math.abs(diffX) < 100) return;

    const target = e.target;
    if (
      target.closest("#slidesWrapper") ||
      target.closest(".slider-container") ||
      target.closest(".media-slide") ||
      target.closest(".slider-wrapper") ||
      target.closest(".mori-player-container") ||
      target.closest(".modal-overlay") ||
      target.closest(".history-item-actions") ||
      target.closest("input") ||
      target.closest("button")
    ) {
      return;
    }

    const activeNavItem = document.querySelector(".nav-item.active");
    if (!activeNavItem) return;

    const currentPage = activeNavItem.getAttribute("data-page");
    const currentIndex = pages.indexOf(currentPage);

    if (diffX > 0 && currentIndex < pages.length - 1) {
      switchPage(pages[currentIndex + 1]);
    } else if (diffX < 0 && currentIndex > 0) {
      switchPage(pages[currentIndex - 1]);
    }
  },
  { passive: true },
);

// Initial Auto-Download Check
setTimeout(() => {
  const autoDownload = localStorage.getItem("mori_auto_download") === "true";
  if (autoDownload) {
    if (typeof handlePasteFromClipboard === "function") {
      handlePasteFromClipboard(true);
    }
  }
}, 2000);

// Hardware Back Button Handler for Mobile
let lastBackPressTime = 0;
if (
  window.Capacitor?.isNativePlatform?.() &&
  App &&
  typeof App.addListener === "function"
) {
  App.addListener("backButton", () => {
    const openModal = document.querySelector(".modal-overlay:not(.hidden)");
    if (openModal) {
      openModal.classList.add("hidden");
      return;
    }

    const activeSubPage = document.querySelector(
      ".settings-sub-page:not(.hidden)",
    );
    if (activeSubPage) {
      activeSubPage.classList.add("hidden");
      document.getElementById("settingsMainMenu")?.classList.remove("hidden");
      return;
    }

    const activeNavItem = document.querySelector(".nav-item.active");
    const currentPage = activeNavItem
      ? activeNavItem.getAttribute("data-page")
      : "home";
    if (currentPage !== "home") {
      switchPage("home");
      return;
    }

    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      App.exitApp();
    } else {
      lastBackPressTime = now;
      const lang = translations[currentLang] || translations.en;
      showToast(lang["toast-press-back-exit"] || "Press back again to exit");
    }
  });
}
