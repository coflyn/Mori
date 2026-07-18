import {
  scrapeRedNote,
  scrapeDouyin,
  scrapeBilibili,
  scrapeThreads,
  scrapeTikTok,
  scrapeTikTokV2,
  scrapeInstagram,
  scrapeYouTube,
  scrapeTwitter,
  scrapeSpotify,
  scrapePinterest,
  scrapeAppleMusic,
  scrapeFacebook,
  scrapeBandcamp,
  scrapePixiv,
} from "./scrapers.js";

import { translations } from "./i18n.js";
import {
  setUIState,
  renderResult,
  renderHistory,
  showModal,
  updateSliderUI,
} from "./ui.js";

import {
  CapacitorHttp as CapacitorHttpNative,
  Filesystem,
  Toast,
  Clipboard,
  App,
  NativeBiometric,
  CHROME_UA,
  cleanUrl,
  truncate,
  showToast,
  copyToClipboard,
  handleScrapeError,
  getVideoThumbnail,
  setUtilsState,
  Share,
  CapacitorHttpWeb,
} from "./utils.js";

const APP_VERSION = "3.7.0";
const GITHUB_REPO = "coflyn/Mori";
const UPDATE_CHECK_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const REPO_URL = `https://github.com/${GITHUB_REPO}`;

const CapacitorHttp = CapacitorHttpNative ?? CapacitorHttpWeb;

const urlInput = document.getElementById("urlInput");
const clearBtn = document.getElementById("clearBtn");
const pasteBtn = document.getElementById("pasteBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loader = document.getElementById("loader");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const downloadList = document.getElementById("downloadList");
const closeResult = document.getElementById("closeResult");
const appVersionVal = document.querySelector("#checkUpdateBtn .info-val");
if (appVersionVal) appVersionVal.textContent = " " + APP_VERSION;

// Slider Elements
const slidesWrapper = document.getElementById("slidesWrapper");
const sliderNav = document.getElementById("sliderNav");
const slidePrevBtn = document.getElementById("slidePrevBtn");
const slideNextBtn = document.getElementById("slideNextBtn");
const slideIndicator = document.getElementById("slideIndicator");
let currentSlideIndex = 0;
let slideData = [];
let lastHandledLinkTime = 0; // To prevent clipboard overwriting shared links
let isIntentPending = false; // Flag to block auto-paste during resume share

// History Edit Elements
const editHistoryBtn = document.getElementById("editHistoryBtn");
const historyActions = document.getElementById("historyActions");
const clearAllBtn = document.getElementById("clearAllBtn");
const doneEditBtn = document.getElementById("doneEditBtn");
let isEditingHistory = false;

// Modal Elements
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const modalThumb = document.getElementById("modalThumb");
const modalTitle = document.getElementById("modalTitle");
const modalUrl = document.getElementById("modalUrl");
const redownloadBtn = document.getElementById("redownloadBtn");

// Confirm Modal Elements
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const okConfirmBtn = document.getElementById("okConfirmBtn");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

// Settings Elementsblur
const clearCacheBtn = document.getElementById("clearCacheBtn");
const wipeDataBtn = document.getElementById("wipeDataBtn");
const reportBugBtn = document.getElementById("reportBugBtn");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const platformVal = document.getElementById("platformVal");
const languageDropdown = document.getElementById("languageDropdown");
const languageTrigger = document.getElementById("languageTrigger");
const languageOptions = document.getElementById("languageOptions");
const currentLangDisplay = document.getElementById("currentLangDisplay");
const darkModeToggle = document.getElementById("darkModeToggle");
const autoClearToggle = document.getElementById("autoClearToggle");
const howToUseBtn = document.getElementById("howToUseBtn");
const aboutAppBtn = document.getElementById("aboutAppBtn");
const incognitoToggle = document.getElementById("incognitoToggle");
const autoPasteToggle = document.getElementById("autoPasteToggle");
const dataSaverToggle = document.getElementById("dataSaverToggle");
const reduceAnimationToggle = document.getElementById("reduceAnimationToggle");
const shareAppBtn = document.getElementById("shareAppBtn");
const changePathBtn = document.getElementById("changePathBtn");
const pathVal = document.getElementById("pathVal");
const changeMusicPathBtn = document.getElementById("changeMusicPathBtn");
const musicPathVal = document.getElementById("musicPathVal");
const wifiOnlyToggle = document.getElementById("wifiOnlyToggle");
const autoDownloadToggle = document.getElementById("autoDownloadToggle");
const filenameSelect = document.getElementById("filenameSelect");
const colorAccentSelect = document.getElementById("colorAccentSelect");
const fontSelect = document.getElementById("fontSelect");
const autoPlayToggle = document.getElementById("autoPlayToggle");
const autoLoopToggle = document.getElementById("autoLoopToggle");

const quickDarkMode = document.getElementById("quickDarkMode");
const quickIncognito = document.getElementById("quickIncognito");
const quickAutoPaste = document.getElementById("quickAutoPaste");
const quickDataSaver = document.getElementById("quickDataSaver");
const settingsMainMenu = document.getElementById("settingsMainMenu");
const settingsSubPages = document.querySelectorAll(".settings-sub-page");
const settingsMenuItems = document.querySelectorAll(".settings-menu-item");
const settingsBackBtns = document.querySelectorAll(".back-btn-settings");

const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");
const loaderText = document.getElementById("loaderText");

let currentLang = localStorage.getItem("mori_lang") || "en";

// Init Theme
const savedTheme = localStorage.getItem("mori_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
if (darkModeToggle) darkModeToggle.checked = savedTheme === "dark";

darkModeToggle?.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mori_theme", theme);
  applyColorAccent();
});

// Color Accent Logic
const accentColors = {
  black: { light: "#1a1917", dark: "#fffbf2" },
  white: { light: "#f5f5f5", dark: "#e5e5e5" },
  gray: { light: "#5f6368", dark: "#bdc1c6" },

  red: { light: "#d93025", dark: "#f28b82" },
  crimson: { light: "#b00020", dark: "#ff8a80" },
  pink: { light: "#d81b60", dark: "#f48fb1" },
  rose: { light: "#e11d48", dark: "#fda4af" },
  magenta: { light: "#c2185b", dark: "#f06292" },

  purple: { light: "#9334e6", dark: "#c58af9" },
  violet: { light: "#7c3aed", dark: "#c4b5fd" },
  indigo: { light: "#4f46e5", dark: "#a5b4fc" },
  lavender: { light: "#8b5cf6", dark: "#c4b5fd" },

  blue: { light: "#1a73e8", dark: "#8ab4f8" },
  sky: { light: "#0284c7", dark: "#7dd3fc" },
  cyan: { light: "#0891b2", dark: "#67e8f9" },
  teal: { light: "#0f766e", dark: "#5eead4" },
  turquoise: { light: "#0ea5a4", dark: "#99f6e4" },

  green: { light: "#1e8e3e", dark: "#81c995" },
  emerald: { light: "#059669", dark: "#6ee7b7" },
  mint: { light: "#10b981", dark: "#a7f3d0" },
  lime: { light: "#65a30d", dark: "#bef264" },
  olive: { light: "#556b2f", dark: "#c5e1a5" },

  yellow: { light: "#f9ab00", dark: "#fde293" },
  amber: { light: "#d97706", dark: "#fcd34d" },
  gold: { light: "#b8860b", dark: "#f6e58d" },

  orange: { light: "#e8710a", dark: "#fcad70" },
  coral: { light: "#ff7043", dark: "#ffab91" },
  peach: { light: "#fb8c00", dark: "#ffcc80" },

  brown: { light: "#795548", dark: "#bcaaa4" },
  chocolate: { light: "#5d4037", dark: "#d7ccc8" },
  coffee: { light: "#6d4c41", dark: "#bcaaa4" },

  navy: { light: "#1e3a8a", dark: "#93c5fd" },
  sapphire: { light: "#1565c0", dark: "#90caf9" },
  royal: { light: "#3949ab", dark: "#9fa8da" },

  aqua: { light: "#00acc1", dark: "#80deea" },
  seafoam: { light: "#26a69a", dark: "#80cbc4" },

  maroon: { light: "#800000", dark: "#ef9a9a" },
  burgundy: { light: "#7b1e3d", dark: "#f48fb1" },
  wine: { light: "#722f37", dark: "#ef9a9a" },

  slate: { light: "#475569", dark: "#cbd5e1" },
  steel: { light: "#607d8b", dark: "#b0bec5" },
  charcoal: { light: "#374151", dark: "#d1d5db" },

  forest: { light: "#2e7d32", dark: "#a5d6a7" },
  moss: { light: "#558b2f", dark: "#c5e1a5" },
  jade: { light: "#009688", dark: "#80cbc4" },

  raspberry: { light: "#c2185b", dark: "#f48fb1" },
  plum: { light: "#6a1b9a", dark: "#ce93d8" },
  orchid: { light: "#ab47bc", dark: "#e1bee7" },

  sunset: { light: "#ef6c00", dark: "#ffcc80" },
  tangerine: { light: "#f57c00", dark: "#ffb74d" },
  apricot: { light: "#fb8c00", dark: "#ffd180" },
};

function applyColorAccent() {
  const accent = localStorage.getItem("mori_accent") || "black";
  const theme = localStorage.getItem("mori_theme") || "light";
  const color = accentColors[accent][theme];
  document.documentElement.style.setProperty("--primary", color);

  const accentText = document.getElementById("colorAccentText");
  if (accentText) {
    const lang = translations[currentLang];
    accentText.textContent = lang[`accent-${accent}`] || accent;
  }
}

applyColorAccent();

// Incognito Mode Logic
const isIncognito = localStorage.getItem("mori_incognito") === "true";
if (incognitoToggle) {
  incognitoToggle.checked = isIncognito;
  incognitoToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_incognito", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-incognito-on"]
        : lang["toast-incognito-off"],
    );
  });
}

// Data Saver Mode Logic
const isDataSaver = localStorage.getItem("mori_data_saver") === "true";
const isReduceAnimation = localStorage.getItem("mori_reduce_animation") === "true";

if (autoPasteToggle) {
  autoPasteToggle.checked = localStorage.getItem("mori_auto_paste") !== "false";
  autoPasteToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_paste", e.target.checked);
  });
}

if (dataSaverToggle) {
  dataSaverToggle.checked = isDataSaver;
  dataSaverToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_data_saver", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-datasaver-on"]
        : lang["toast-datasaver-off"],
    );
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  });
}

function reduceAnimation() {
  const isReduceAnimationCurrent = localStorage.getItem("mori_reduce_animation") === "true";
  const pageContents = document.querySelectorAll(".page-content");
  const modalContents = document.querySelectorAll(".modal-content");

  if (isReduceAnimationCurrent) {
    pageContents.forEach((pageContent) => {
      pageContent.classList.remove("animation")
    })
    modalContents.forEach((modalContent) => {
      modalContent.classList.remove("animation")
    })
  } else {
    pageContents.forEach((pageContent) => {
      pageContent.classList.add("animation")
    })
    modalContents.forEach((modalContent) => {
      modalContent.classList.add("animation")
    })
  }
}
reduceAnimation()

if (reduceAnimationToggle) {
  reduceAnimationToggle.checked = isReduceAnimation;
  reduceAnimationToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_reduce_animation", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-reduce-animation-on"]
        : lang["toast-reduce-animation-off"],
    );
    reduceAnimation()
  });
}

const autoClearHistoryToggle = document.getElementById(
  "autoClearHistoryToggle",
);
const lockTypeSelect = document.getElementById("lockTypeSelect");
const setPinBtn = document.getElementById("setPinBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");

let isHistoryUnlocked = false; // Session-based unlock state

if (autoClearHistoryToggle) {
  autoClearHistoryToggle.checked =
    localStorage.getItem("mori_autoclear_history") === "true";
  autoClearHistoryToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_autoclear_history", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-autoclear-history-on"]
        : lang["toast-autoclear-history-off"],
    );
  });
}

if (lockTypeSelect) {
  const lockTypeMenu = document.getElementById("lockTypeMenu");
  const lockTypeText = document.getElementById("lockTypeText");
  const currentLock = localStorage.getItem("mori_lock_type") || "none";

  // Initial state
  lockTypeText.textContent =
    translations[currentLang][`lock-type-${currentLock}`];

  lockTypeSelect.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpening = lockTypeMenu.classList.contains("hidden");
    lockTypeMenu.classList.toggle("hidden");

    // Manage z-index to prevent clipping by other sections
    const section = lockTypeSelect.closest(".settings-section");
    if (section) {
      section.classList.toggle("active-section", isOpening);
    }
  });

  document.addEventListener("click", () => {
    lockTypeMenu.classList.add("hidden");
    document
      .querySelectorAll(".settings-section")
      .forEach((s) => s.classList.remove("active-section"));
  });

  lockTypeMenu.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const type = item.getAttribute("data-value");
      const currentType = localStorage.getItem("mori_lock_type") || "none";

      // If turning OFF security, require biometric
      if (currentType === "biometric") {
        try {
          const { NativeBiometric } = Capacitor.Plugins;
          if (NativeBiometric) {
            await NativeBiometric.verifyIdentity({
              reason: translations[currentLang]["label-biometric-reason"],
              title: "Mori Privacy",
              subtitle: "",
              description: "",
            });
          }
        } catch (err) {
          // Cancelled or failed
          return;
        }
      }

      localStorage.setItem("mori_lock_type", type);
      lockTypeText.textContent = item.textContent;
      isHistoryUnlocked = type === "none";

      const lang = translations[currentLang];
      showToast(
        type === "none" ? lang["toast-privacy-off"] : lang["toast-privacy-on"],
      );
    });
  });
}

exportDataBtn?.addEventListener("click", exportMoriData);
importDataBtn?.addEventListener("click", importMoriData);

// User Guide Logic
const guideOverlay = document.getElementById("guideOverlay");
const hideGuideCheckbox = document.getElementById("hideGuideCheckbox");
const closeGuideBtn = document.getElementById("closeGuideBtn");
const guideToSettingsBtn = document.getElementById("guideToSettingsBtn");

// Settings Navigation Logic
settingsMenuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.getAttribute("data-target");
    settingsMainMenu.classList.add("hidden");
    const targetPage = document.getElementById(targetId);
    if (targetPage) targetPage.classList.remove("hidden");
  });
});

settingsBackBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    settingsSubPages.forEach((p) => p.classList.add("hidden"));
    settingsMainMenu.classList.remove("hidden");
  });
});

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

// Wi-Fi Only Toggle
if (wifiOnlyToggle) {
  wifiOnlyToggle.checked = localStorage.getItem("mori_wifi_only") === "true";
  wifiOnlyToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_wifi_only", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked ? lang["toast-wifi-on"] : lang["toast-wifi-off"],
    );
  });
}

// Auto-Download Toggle
if (autoDownloadToggle) {
  autoDownloadToggle.checked =
    localStorage.getItem("mori_auto_download") === "true";
  autoDownloadToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_download", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-autodownload-on"]
        : lang["toast-autodownload-off"],
    );
  });
}

// Custom Select Handler for New Settings
function setupCustomSelect(selectId, storageKey, textId, menuId) {
  const select = document.getElementById(selectId);
  const text = document.getElementById(textId);
  const menu = document.getElementById(menuId);
  if (!select || !text || !menu) return;

  const currentVal = localStorage.getItem(storageKey) || "default";

  // Update display on load
  const item = menu.querySelector(`[data-value="${currentVal}"]`);
  if (item) {
    text.textContent = item.textContent;
  }

  select.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpening = menu.classList.contains("hidden");

    // Close other dropdowns
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      if (m !== menu) m.classList.add("hidden");
    });

    menu.classList.toggle("hidden");

    if (!menu.classList.contains("hidden")) {
      // Reset to natural downward position for calculation
      menu.classList.remove("open-up");

      const rect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // If it would overflow the bottom in its natural state, flip it
      if (rect.bottom > viewportHeight - 20) {
        menu.classList.add("open-up");
      }
    } else {
      // Clean up when closing
      menu.classList.remove("open-up");
    }
  });

  menu.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", () => {
      const val = item.getAttribute("data-value");
      localStorage.setItem(storageKey, val);
      text.textContent = item.textContent;
      // menu.classList.add("hidden");
      // menu.classList.remove("open-up"); // Clean up on selection

      if (storageKey === "mori_accent") applyColorAccent();
      if (storageKey === "mori_font") applyFont();
    });
  });
}

// Initialize Dropdowns
setupCustomSelect(
  "filenameSelect",
  "mori_filename",
  "filenameText",
  "filenameMenu",
);
setupCustomSelect(
  "colorAccentSelect",
  "mori_accent",
  "colorAccentText",
  "colorAccentMenu",
);
setupCustomSelect("fontSelect", "mori_font", "fontText", "fontMenu");

// Font Switching Logic
function applyFont() {
  const font = localStorage.getItem("mori_font") || "default";
  document.body.className = document.body.className.replace(/\bfont-\S+/g, "");
  document.body.classList.add(`font-${font}`);
}

// Initial Font apply
applyFont();

// Auto-Play Toggle
if (autoPlayToggle) {
  autoPlayToggle.checked = localStorage.getItem("mori_autoplay") !== "false";
  autoPlayToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_autoplay", e.target.checked);
  });
}

if (autoLoopToggle) {
  autoLoopToggle.checked = localStorage.getItem("mori_loop") !== "false";
  autoLoopToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_loop", e.target.checked);
  });
}

// Close dropdowns on outside click
document.addEventListener("click", () => {
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.add("hidden"));
});

// Download Path Logic (Video)
let customPath = localStorage.getItem("mori_download_path") || "Mori";
if (pathVal) pathVal.textContent = `/Download/${customPath}`;

changePathBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showConfirm(
    lang["label-path-video"],
    `<div class="path-picker-ui">
       <div class="path-input-wrapper">
         <span class="path-label-sm">Subfolder in Downloads</span>
         <div class="mori-input-with-icon">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
           <input type="text" id="customPathInput" class="mori-input-noborder" value="${customPath}" placeholder="e.g. Mori">
         </div>
       </div>
       <span class="path-label-sm">${lang["label-path-presets"]}</span>
       <div class="path-presets-container">
         <button class="path-preset-chip" data-path="Mori">Mori</button>
         <button class="path-preset-chip" data-path="Mori/Videos">Mori/Videos</button>
       </div>
       <button id="resetPathBtn" class="reset-path-btn">${lang["btn-reset-default"]}</button>
     </div>`,
    () => {
      const input = document.getElementById("customPathInput");
      if (input && input.value.trim()) {
        const newPath = input.value.trim().replace(/[\\:*?"<>|]/g, "");
        customPath = newPath;
        localStorage.setItem("mori_download_path", newPath);
        if (pathVal) pathVal.textContent = `/Download/${newPath}`;
        showToast(lang["toast-path-updated"]);
      }
    },
  );
  setTimeout(() => {
    const input = document.getElementById("customPathInput");
    document.querySelectorAll(".path-preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (input) input.value = chip.getAttribute("data-path");
      });
    });
    document.getElementById("resetPathBtn")?.addEventListener("click", () => {
      if (input) input.value = "Mori";
    });
  }, 100);
  okConfirmBtn.textContent = "SAVE";
});

// Download Path Logic (Music)
let customMusicPath = localStorage.getItem("mori_music_path") || "Mori/Music";
if (musicPathVal) musicPathVal.textContent = `/Download/${customMusicPath}`;

changeMusicPathBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showConfirm(
    lang["label-path-music"],
    `<div class="path-picker-ui">
       <div class="path-input-wrapper">
         <span class="path-label-sm">Subfolder in Downloads</span>
         <div class="mori-input-with-icon">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
           <input type="text" id="customMusicPathInput" class="mori-input-noborder" value="${customMusicPath}" placeholder="e.g. Mori/Music">
         </div>
       </div>
       <span class="path-label-sm">${lang["label-path-presets"]}</span>
       <div class="path-presets-container">
         <button class="path-preset-chip" data-path="Mori/Music">Mori/Music</button>
         <button class="path-preset-chip" data-path="Music">Music</button>
       </div>
       <button id="resetMusicPathBtn" class="reset-path-btn">${lang["btn-reset-default"]}</button>
     </div>`,
    () => {
      const input = document.getElementById("customMusicPathInput");
      if (input && input.value.trim()) {
        const newPath = input.value.trim().replace(/[\\:*?"<>|]/g, "");
        customMusicPath = newPath;
        localStorage.setItem("mori_music_path", newPath);
        if (musicPathVal) musicPathVal.textContent = `/Download/${newPath}`;
        showToast(lang["toast-path-updated"]);
      }
    },
  );
  setTimeout(() => {
    const input = document.getElementById("customMusicPathInput");
    document.querySelectorAll(".path-preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (input) input.value = chip.getAttribute("data-path");
      });
    });
    document
      .getElementById("resetMusicPathBtn")
      ?.addEventListener("click", () => {
        if (input) input.value = "Mori/Music";
      });
  }, 100);
  okConfirmBtn.textContent = "SAVE";
});

// Auto Clear Cache Logic
const isAutoClear = localStorage.getItem("mori_auto_clear_cache") === "true";
if (autoClearToggle) {
  autoClearToggle.checked = isAutoClear;
  autoClearToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_clear_cache", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-autoclear-cache-on"]
        : lang["toast-autoclear-cache-off"],
    );
    if (e.target.checked) {
      clearCacheSilently();
    }
  });
}

// Run Auto Clear if enabled
if (isAutoClear) {
  setTimeout(() => {
    clearCacheSilently();
  }, 2000);
}

async function clearCacheSilently() {
  if (!Filesystem) return;
  try {
    const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    const activeThumbs = new Set(
      history
        .map((item) => item.thumbnail)
        .filter((t) => t && t.startsWith("thumb_")),
    );
    // Also check localThumbnail field
    history.forEach((item) => {
      if (item.localThumbnail && item.localThumbnail.startsWith("thumb_")) {
        activeThumbs.add(item.localThumbnail);
      }
    });

    const cacheSize = await getFolderSize("", "CACHE");
    const sizeInMB = cacheSize / (1024 * 1024);

    // Only clear if cache is more than 50MB
    if (sizeInMB > 50) {
      const files = await Filesystem.readdir({ path: "", directory: "CACHE" });
      let clearedCount = 0;
      for (const file of files.files) {
        const isThumb = file.name.startsWith("thumb_");
        // Delete if it's an orphaned thumbnail OR if it's not a thumbnail at all
        if (!isThumb || !activeThumbs.has(file.name)) {
          try {
            if (file.type === "directory") {
              await Filesystem.rmdir({
                path: file.name,
                directory: "CACHE",
                recursive: true,
              });
            } else {
              await Filesystem.deleteFile({
                path: file.name,
                directory: "CACHE",
              });
            }
            clearedCount++;
          } catch (err) {}
        }
      }
      if (clearedCount > 0) {
        updateStorageInfo();
        console.log(`Auto-cleared ${clearedCount} items from cache.`);
      }
    }
  } catch (e) {
    console.error("Silent cache clear failed:", e);
  }
}

// Language Logic

function updateLanguageUI() {
  const lang = translations[currentLang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (lang[key]) el.textContent = lang[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (lang[key]) el.placeholder = lang[key];
  });

  if (currentLangDisplay) {
    const langNames = { en: "English", id: "Indonesia", ja: "日本語" };
    currentLangDisplay.textContent = langNames[currentLang] || "English";
  }

  // Highlight selected option
  document.querySelectorAll(".dropdown-options .option").forEach((opt) => {
    opt.classList.toggle(
      "selected",
      opt.getAttribute("data-value") === currentLang,
    );
  });

  document.documentElement.lang = currentLang;

  updateGreeting();
  setUtilsState({ currentLang });
}

const dynamicGreeting = document.getElementById("dynamicGreeting");
function updateGreeting() {
  const greetingText = document.getElementById("greetingText");
  const greetingStats = document.getElementById("greetingStats");
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const lang = translations[currentLang];

  if (!greetingText || !greetingStats) return;

  const hours = new Date().getHours();
  let greeting = lang["greeting-ready"];
  if (hours >= 5 && hours < 12) greeting = lang["greeting-morning"];
  else if (hours >= 12 && hours < 15) greeting = lang["greeting-afternoon"];
  else if (hours >= 15 && hours < 18)
    greeting = lang["greeting-sore"] || lang["greeting-afternoon"];
  else if (hours >= 18 && hours < 21) greeting = lang["greeting-evening"];
  else greeting = lang["greeting-night"] || lang["greeting-evening"];

  greetingText.textContent = greeting;
  greetingStats.textContent = `${history.length} ${lang["items-history"]}`;
}

// Initial calls
updateLanguageUI();
updateStorageInfo();

async function getFolderSize(path, directory) {
  let size = 0;
  try {
    const readdir = await Filesystem.readdir({ path, directory });
    for (const file of readdir.files) {
      const filePath = path ? `${path}/${file.name}` : file.name;
      if (file.type === "file") {
        const stats = await Filesystem.stat({ path: filePath, directory });
        size += stats.size;
      } else if (file.type === "directory") {
        size += await getFolderSize(filePath, directory);
      }
    }
  } catch (e) {}
  return size;
}

async function updateStorageInfo() {
  const storageVal = document.getElementById("storageSizeVal");
  if (!storageVal || !Filesystem) return;

  try {
    let totalSize = 0;
    totalSize += await getFolderSize("", "CACHE");
    totalSize += await getFolderSize("Download/Mori", "EXTERNAL_STORAGE");
    // Also check old location for compatibility
    totalSize += await getFolderSize("Download/Mori", "EXTERNAL");

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    storageVal.textContent = `${sizeInMB} MB`;
  } catch (e) {
    console.error("Storage size error:", e);
    storageVal.textContent = "0.00 MB";
  }
}

languageTrigger?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isActive = languageDropdown?.classList.toggle("active");
  languageOptions?.classList.toggle("hidden");

  // Manage parent z-index
  const parentItem = languageDropdown?.closest(".settings-item");
  const parentSection = languageDropdown?.closest(".settings-section");
  if (parentItem) {
    parentItem.classList.toggle("active-dropdown", isActive);
  }
  if (parentSection) {
    parentSection.classList.toggle("active-section", isActive);
  }
});

function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("mori_lang", lang);
  setUIState({ currentLang });
  setUtilsState({ currentLang });
  updateLanguageUI();
  updateGreeting();
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);

  let msg = "Language updated";
  if (currentLang === "id") msg = "Bahasa diperbarui";
  if (currentLang === "ja") msg = "言語を更新しました";
  showToast(msg);
}

document.querySelectorAll(".dropdown-options .option").forEach((opt) => {
  opt.addEventListener("click", (e) => {
    e.stopPropagation();
    switchLanguage(opt.getAttribute("data-value"));
    languageOptions?.classList.add("hidden");
    languageDropdown?.classList.remove("active");
    languageDropdown
      ?.closest(".settings-item")
      ?.classList.remove("active-dropdown");
    languageDropdown
      ?.closest(".settings-section")
      ?.classList.remove("active-section");
  });
});

document.addEventListener("click", () => {
  languageOptions?.classList.add("hidden");
  languageDropdown?.classList.remove("active");
  languageDropdown
    ?.closest(".settings-item")
    ?.classList.remove("active-dropdown");
  languageDropdown
    ?.closest(".settings-section")
    ?.classList.remove("active-section");
});

async function handlePasteFromClipboard(isSilent = false) {
  try {
    let text = "";
    if (window.Capacitor?.isNativePlatform() && Clipboard) {
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
        if (urlInput.value.trim() === trimmed) return;

        urlInput.value = trimmed;
        urlInput.dispatchEvent(new Event("input"));
        if (isSilent) {
          const autoDownload =
            localStorage.getItem("mori_auto_download") === "true";
          if (autoDownload) {
            // Wi-Fi check for auto-download
            const isWifiOnly =
              localStorage.getItem("mori_wifi_only") === "true";
            let canAuto = true;
            if (isWifiOnly && window.Capacitor?.getPlatform() !== "web") {
              const conn =
                navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection;
              if (conn) {
                const type = (conn.type || "").toLowerCase();
                const isCell =
                  type === "cellular" ||
                  type === "mobile" ||
                  type.includes("2g") ||
                  type.includes("3g") ||
                  type.includes("4g") ||
                  type.includes("5g");

                if (isCell) {
                  canAuto = false;
                  showToast(translations[currentLang]["toast-wifi-needed"]);
                }
              }
            }

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
  const isEmpty = urlInput.value === "";
  clearBtn.classList.toggle("hidden", isEmpty);
  pasteBtn.classList.toggle("hidden", !isEmpty);
});

clearBtn.addEventListener("click", () => {
  urlInput.value = "";
  clearBtn.classList.add("hidden");
  pasteBtn.classList.remove("hidden");
  urlInput.focus();
});

closeResult?.addEventListener("click", () => {
  document.querySelectorAll(".preview-slide video").forEach((v) => {
    v.pause();
    v.src = "";
  });
  resultSection.classList.add("hidden");
  const supportedSection = document.querySelector(".supported-section");
  if (supportedSection) supportedSection.classList.remove("hidden");
  if (dynamicGreeting) dynamicGreeting.classList.remove("hidden");
  updateGreeting();
});

// Function to process shared text
function processSharedText(text) {
  if (!text) return;
  isIntentPending = false;
  lastHandledLinkTime = Date.now();
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

if (App) {
  App.addListener("appUrlOpen", (data) => {
    if (data.url) {
      isIntentPending = false;
      lastHandledLinkTime = Date.now();
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });

  App.getLaunchUrl().then((data) => {
    if (data && data.url) {
      lastHandledLinkTime = Date.now();
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });

  // App State Change (Auto-detect clipboard on resume)
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      const loopSetting = localStorage.getItem("mori_loop") !== "false";
      const autoPaste = localStorage.getItem("mori_auto_paste") !== "false";
      if (autoPaste) {
        isIntentPending = true; // Assume a share might be coming

        // Wait and see if an intent clears the flag
        setTimeout(() => {
          const timeSinceShared = Date.now() - lastHandledLinkTime;
          // Only paste if NO share intent arrived during this window
          if (isIntentPending && timeSinceShared > 2500) {
            handlePasteFromClipboard(true);
          }
          isIntentPending = false; // Reset for next time
        }, 1500);
      }
    } else {
      // App going to background, reset flags
      isIntentPending = false;
    }
  });
}

// Custom Confirm Function
function showConfirm(title, message, onConfirm) {
  confirmTitle.innerHTML = title;
  confirmMessage.innerHTML = message;
  confirmOverlay.classList.remove("hidden");

  okConfirmBtn.onclick = () => {
    onConfirm();
    confirmOverlay.classList.add("hidden");
  };

  cancelConfirmBtn.onclick = () => {
    confirmOverlay.classList.add("hidden");
  };

  // Reset button states when showing
  cancelConfirmBtn.classList.remove("hidden");
  okConfirmBtn.textContent = "CONFIRM";
}

// History Edit Handlers
editHistoryBtn?.addEventListener("click", () => {
  isEditingHistory = true;
  setUIState({ isEditingHistory });
  editHistoryBtn.classList.add("hidden");
  historyActions.classList.remove("hidden");
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);
});

doneEditBtn?.addEventListener("click", () => {
  isEditingHistory = false;
  setUIState({ isEditingHistory });
  editHistoryBtn.classList.remove("hidden");
  historyActions.classList.add("hidden");
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);
});

clearAllBtn?.addEventListener("click", () => {
  showConfirm(
    "Clear All",
    "Are you sure you want to delete all download history?",
    async () => {
      // Clean up physical thumbnail files
      const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
      for (const item of history) {
        if (
          item.thumbnail &&
          item.thumbnail.startsWith("thumb_") &&
          Filesystem
        ) {
          try {
            await Filesystem.deleteFile({
              path: item.thumbnail,
              directory: "CACHE",
            });
          } catch (e) {}
        }
      }

      localStorage.removeItem("mori_history");
      isEditingHistory = false;
      setUIState({ isEditingHistory });
      editHistoryBtn.classList.remove("hidden");
      historyActions.classList.add("hidden");
      renderHistory(onHistoryItemClick, onHistoryDeleteClick);
    },
  );
});

if (platformVal) {
  platformVal.textContent = window.Capacitor?.isNativePlatform()
    ? "Android"
    : "Web Browser";
}

clearCacheBtn?.addEventListener("click", () => {
  showConfirm(
    translations[currentLang]["label-clearcache"],
    translations[currentLang]["desc-clearcache"],
    async () => {
      try {
        if (Filesystem) {
          try {
            const files = await Filesystem.readdir({
              path: "",
              directory: "CACHE",
            });
            for (const file of files.files) {
              if (file.type === "directory") {
                await Filesystem.rmdir({
                  path: file.name,
                  directory: "CACHE",
                  recursive: true,
                });
              } else {
                await Filesystem.deleteFile({
                  path: file.name,
                  directory: "CACHE",
                });
              }
            }
          } catch (e) {}
        }
        await updateStorageInfo();
        showToast(translations[currentLang]["label-cache-cleared"]);
      } catch (e) {
        showToast(translations[currentLang]["toast-cache-error"]);
      }
    },
  );
});

wipeDataBtn?.addEventListener("click", () => {
  showConfirm(
    translations[currentLang]["label-wipedata"],
    translations[currentLang]["desc-wipedata"],
    async () => {
      try {
        // Preserve some settings
        const lang = localStorage.getItem("mori_lang");
        const theme = localStorage.getItem("mori_theme");
        const vPath = localStorage.getItem("mori_download_path");
        const mPath = localStorage.getItem("mori_music_path");

        localStorage.clear();

        if (lang) localStorage.setItem("mori_lang", lang);
        if (theme) localStorage.setItem("mori_theme", theme);
        if (vPath) localStorage.setItem("mori_download_path", vPath);
        if (mPath) localStorage.setItem("mori_music_path", mPath);

        if (Filesystem) {
          try {
            const cacheFiles = await Filesystem.readdir({
              path: "",
              directory: "CACHE",
            });
            for (const file of cacheFiles.files) {
              await Filesystem.deleteFile({
                path: file.name,
                directory: "CACHE",
              });
            }
          } catch (e) {}
        }
        await updateStorageInfo();
        renderHistory(onHistoryItemClick, onHistoryDeleteClick);
        showToast(translations[currentLang]["label-data-wiped"]);
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        localStorage.clear();
        location.reload();
      }
    },
  );
});

reportBugBtn?.addEventListener("click", () => {
  const deviceInfo = `Model: ${navigator.userAgent}\nPlatform: ${platformVal?.textContent || "Unknown"}\nVersion: ${APP_VERSION}`;
  const text = encodeURIComponent(
    `Hi coflyn, I found a bug in Mori App:\n\n[BUG DESCRIPTION HERE]\n\n---\nDevice Info:\n${deviceInfo}`,
  );
  const whatsappUrl = `https://wa.me/6285194858996?text=${text}`;
  showToast(translations[currentLang]["label-opening-wa"]);
  window.open(whatsappUrl, "_blank");
});

async function checkUpdate() {
  const actionLabel = checkUpdateBtn.querySelector(".action-label");
  actionLabel.textContent = translations[currentLang]["btn-processing"];

  try {
    const res = await CapacitorHttp.get({
      url: UPDATE_CHECK_URL,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mori-App",
      },
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const latest = (data.tag_name || "").replace(/^v/i, "");

    if (latest && latest !== APP_VERSION) {
      actionLabel.textContent = translations[currentLang]["btn-update"];
      const lang = translations[currentLang];
      const title = lang["label-update-available"];
      const msg = `${lang["label-update-available"]} (v${latest})<br><br><span id="manualUpdateLink" style="color:var(--primary);text-decoration:underline;font-weight:600;">${lang["btn-update"] || "Open Repository"}</span>`;
      showInfoModal(title, msg);
      setTimeout(() => {
        const el = document.getElementById("manualUpdateLink");
        if (el)
          el.onclick = () => {
            window.location.href = REPO_URL;
          };
      }, 50);
    } else {
      actionLabel.textContent = translations[currentLang]["btn-check"];
      const lang = translations[currentLang];
      showInfoModal(lang["label-update"], `${lang["label-up-to-date"]}`);
    }
  } catch (e) {
    console.error("Update check failed:", e);
    actionLabel.textContent = translations[currentLang]["btn-check"];
    const lang = translations[currentLang];
    showInfoModal(
      lang["label-check-failed"] || "Check Failed",
      lang["label-check-failed-msg"] ||
        "Unable to reach GitHub. Check your connection and try again.",
    );
  }
}

async function autoCheckUpdate() {
  // Respect user skip
  if (localStorage.getItem("mori_skip_auto_update")) return;

  try {
    const res = await CapacitorHttp.get({
      url: UPDATE_CHECK_URL,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mori-App",
      },
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const latest = (data.tag_name || "").replace(/^v/i, "");

    if (latest && latest !== APP_VERSION) {
      const lang = translations[currentLang];
      const title = lang["label-update-available"];
      const msg = `<div style="text-align:center;padding:8px 0;"><span style="font-size:2rem;display:block;margin-bottom:8px;">🎉</span>${lang["label-update-available"]} <strong>v${latest}</strong><br><br><span id="autoUpdateLink" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">${lang["btn-update"] || "Open Repository"}</span></div>`;
      showInfoModal(title, msg, {
        showDontShow: true,
        dontShowKey: "mori_skip_auto_update",
        dontShowLabel: lang["label-dont-show-again"] || "Don't show again",
      });
      setTimeout(() => {
        const el = document.getElementById("autoUpdateLink");
        if (el)
          el.onclick = () => {
            window.location.href = REPO_URL;
          };
      }, 50);
    }
  } catch (e) {
    // Silent fail on startup
  }
}

checkUpdateBtn?.addEventListener("click", checkUpdate);
autoCheckUpdate();

// Custom Info Modal
const infoOverlay = document.getElementById("infoOverlay");
const infoTitle = document.getElementById("infoTitle");
const infoMessage = document.getElementById("infoMessage");
const closeInfoModal = document.getElementById("closeInfoModal");
const infoDontShowAgain = document.getElementById("infoDontShowAgain");
const infoDontShowCheckbox = document.getElementById("infoDontShowCheckbox");
const infoDontShowLabel = document.getElementById("infoDontShowLabel");

function showInfoModal(title, message, options = {}) {
  if (!infoOverlay) return;
  infoTitle.textContent = title;
  infoMessage.innerHTML = message;

  // Handle "Don't show again" checkbox
  if (options.showDontShow) {
    infoDontShowAgain?.classList.remove("hidden");
    infoDontShowCheckbox.checked = false;
    if (infoDontShowLabel) {
      infoDontShowLabel.textContent =
        options.dontShowLabel || "Don't show again";
    }
    // Store flag on close if checked
    const origClose = () => infoOverlay.classList.add("hidden");
    const closeWithCheck = () => {
      if (infoDontShowCheckbox.checked && options.dontShowKey) {
        localStorage.setItem(options.dontShowKey, "true");
      }
      origClose();
    };
    closeInfoModal.onclick = closeWithCheck;
  } else {
    infoDontShowAgain?.classList.add("hidden");
    closeInfoModal.onclick = () => infoOverlay.classList.add("hidden");
  }

  infoOverlay.classList.remove("hidden");
}

// The close handler is now managed inside showInfoModal via options.
// Clicking the overlay background still dismisses.
infoOverlay?.addEventListener("click", (e) => {
  if (e.target === infoOverlay) infoOverlay.classList.add("hidden");
});

howToUseBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  const steps = lang["howtouse-steps"]
    .map((s, i) => `${i + 1}. ${s}`)
    .join("<br><br>");
  showInfoModal(lang["label-howtouse"], steps);
});

aboutAppBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showInfoModal(lang["label-about"], lang["about-text"]);
});

shareAppBtn?.addEventListener("click", async () => {
  const lang = translations[currentLang];
  if (window.Capacitor?.isNativePlatform() && Share) {
    await Share.share({
      title: "Mori App",
      text: lang["share-msg"],
      url: "https://github.com/coflyn/Mori",
      dialogTitle: "Share Mori",
    });
  } else {
    // Fallback for web
    if (navigator.share) {
      navigator.share({
        title: "Mori App",
        text: lang["share-msg"],
        url: "https://github.com/coflyn/Mori",
      });
    } else {
      showToast("Sharing not supported on this browser.");
    }
  }
});

downloadBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  // Wi-Fi Only Check
  const isWifiOnly = localStorage.getItem("mori_wifi_only") === "true";
  if (isWifiOnly && window.Capacitor?.getPlatform() !== "web") {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (connection) {
      const type = (connection.type || "").toLowerCase();
      const isCellular =
        type === "cellular" ||
        type === "mobile" ||
        type.includes("2g") ||
        type.includes("3g") ||
        type.includes("4g") ||
        type.includes("5g");

      if (isCellular) {
        showToast(
          translations[currentLang]["toast-wifi-needed"] ||
            "Wi-Fi connection required",
        );
        return;
      }
    }
  }

  const phrases = translations[currentLang]["loader-phrases"];
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const loaderText = loader.querySelector("p");
  if (loaderText) loaderText.textContent = randomPhrase;

  const supportedSection = document.querySelector(".supported-section");
  resultSection.classList.add("hidden");
  // Hide supportedSection when starting a download/preview
  if (supportedSection) supportedSection.classList.add("hidden");
  if (dynamicGreeting) dynamicGreeting.classList.add("hidden");

  // Stop any previous media playing in background
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.src = "";
    v.load();
  });

  loader.classList.remove("hidden");
  downloadBtn.disabled = true;
  downloadBtn.textContent = translations[currentLang]["btn-processing"];

  try {
    let data;
    if (CapacitorHttp) {
      console.log("[NATIVE] Using CapacitorHttp for:", url);
      if (url.includes("tiktok.com")) {
        data = await scrapeTikTokV2(url);
        if (!data.status || !data || data.result.thumbnail == "" || data.result.downloads.length == 0) {
          // Fallback kalo scraping url baru gak berfungsi ygy
          console.log("[FALLBACK] Tiktok scraper to default.")
          data = await scrapeTikTok(url);
        }
      } else if (url.includes("instagram.com")) {
        data = await scrapeInstagram(url);
      } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
        data = await scrapeYouTube(url);
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        data = await scrapeTwitter(url);
      } else if (url.includes("spotify.com")) {
        data = await scrapeSpotify(url);
      } else if (url.includes("pinterest.com") || url.includes("pin.it")) {
        data = await scrapePinterest(url);
      } else if (url.includes("music.apple.com")) {
        data = await scrapeAppleMusic(url);
      } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
        data = await scrapeFacebook(url);
      } else if (
        url.includes("xiaohongshu.com") ||
        url.includes("xhslink.com")
      ) {
        data = await scrapeRedNote(url);
      } else if (url.includes("douyin.com")) {
        data = await scrapeDouyin(url);
      } else if (
        url.includes("bilibili.com") ||
        url.includes("b23.tv") ||
        url.includes("bilibili.tv")
      ) {
        data = await scrapeBilibili(url);
      } else if (url.includes("threads.net") || url.includes("threads.com")) {
        data = await scrapeThreads(url);
      } else if (url.includes("bandcamp.com")) {
        data = await scrapeBandcamp(url);
      } else if (url.includes("pixiv.net")) {
        data = await scrapePixiv(url);
      } else {
        data = { status: false, message: "URL not supported yet." };
      }
    } else {
      console.log("[PROXY] Falling back to server proxy");
      data = await scrapeProxy(url);
    }

    console.log(data)

    if (data && data.status) {
      // SMART LOCAL DETECTION: Check if we have this content in history and on disk
      const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
      const existing = history.find(
        (item) => cleanUrl(item.url) === cleanUrl(url),
      );
      if (existing && existing.localFiles && existing.localFiles.length > 0) {
        for (const dl of data.result.downloads) {
          const match = existing.localFiles.find((lf) => lf.type === dl.type);
          if (match && Filesystem) {
            try {
              // Verify file still exists on disk
              const stat = await Filesystem.stat({
                path: match.path,
                directory: "EXTERNAL_STORAGE",
              });
              if (stat) {
                dl.url = window.Capacitor.convertFileSrc(match.path);
                dl.isLocal = true;
              }
            } catch (e) {
              console.warn(
                "Local file listed in history but not found on disk:",
                match.path,
              );
            }
          }
        }
      }

      saveToHistory(data.result, url);
      const state = renderResult(data.result, url);
      if (state) {
        slideData = state.slideData || [];
        currentSlideIndex = state.currentSlideIndex || 0;
      }
      loader.classList.add("hidden");
    } else {
      console.error(data)
      const errMsg = data?.message || "Unknown error occurred.";
      handleScrapeError(data, data?.statusCode);
      if (loaderText)
        loaderText.textContent =
          translations[currentLang]["label-error"] + ": " + errMsg;
      setTimeout(() => loader.classList.add("hidden"), 3000);
      if (supportedSection) supportedSection.classList.remove("hidden");
    }
  } catch (err) {
    console.error("[CRITICAL] Download Flow Error:", err);
    if (loaderText)
      loaderText.textContent =
        translations[currentLang]["label-fatal"] + ": " + err.message;
    showToast(
      translations[currentLang]["label-fatal-error"] + ": " + err.message,
    );
    setTimeout(() => loader.classList.add("hidden"), 5000);
    if (supportedSection) supportedSection.classList.remove("hidden");
  }

  downloadBtn.disabled = false;
  downloadBtn.textContent = translations[currentLang]["btn-analyze"];
});

// Slider Navigation (Delegated to UI module)
slidePrevBtn?.addEventListener("click", () => {
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    setUIState({ currentSlideIndex });
    updateSliderUI();
  }
});

slideNextBtn?.addEventListener("click", () => {
  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  if (currentSlideIndex < sliderItems.length - 1) {
    currentSlideIndex++;
    setUIState({ currentSlideIndex });
    updateSliderUI();
  }
});

// Modal Close Handling
const hideModal = () => {
  const slidesWrapper = document.getElementById("modalSlidesWrapper");
  if (slidesWrapper) {
    slidesWrapper.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.src = "";
      v.load();
    });
    slidesWrapper.innerHTML = "";
  }
  if (modalOverlay) {
    modalOverlay.classList.add("hidden");
    modalOverlay.style.display = "none";
  }
};

closeModal?.addEventListener("click", hideModal);
modalOverlay?.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideModal();
});

// History Callbacks
function onHistoryItemClick(item) {
  showModal(item, (url) => {
    urlInput.value = url;
    urlInput.dispatchEvent(new Event("input"));
    document.querySelector('.nav-item[data-page="home"]').click();
    downloadBtn.click();
  });
}

async function onHistoryDeleteClick(url) {
  showConfirm("Delete Item", "Remove this item from history?", async () => {
    let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    const itemToDelete = history.find((h) => h.url === url);

    // Delete physical thumbnail if it exists
    if (
      itemToDelete &&
      itemToDelete.thumbnail &&
      itemToDelete.thumbnail.startsWith("thumb_") &&
      Filesystem
    ) {
      try {
        await Filesystem.deleteFile({
          path: itemToDelete.thumbnail,
          directory: "CACHE",
        });
      } catch (e) {
        console.warn("Could not delete thumbnail file:", e);
      }
    }

    history = history.filter((h) => h.url !== url);
    localStorage.setItem("mori_history", JSON.stringify(history));
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  });
}

// Global Event for File Saved (Syncing UI and History)
window.addEventListener("mori_file_saved", async (e) => {
  const { url, path } = e.detail;
  const target = cleanUrl(url);
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");

  const isVideo = path.toLowerCase().endsWith(".mp4");
  const isAudio = path.toLowerCase().endsWith(".mp3");
  const isImage = /\.(jpg|jpeg|png|webp)/i.test(path);

  history = history.map((item) => {
    if (cleanUrl(item.url) === target) {
      const localFiles = item.localFiles || [];
      if (!localFiles.find((f) => f.path === path)) {
        localFiles.push({
          path,
          type: isVideo ? "VIDEO" : isAudio ? "MP3" : "IMAGE",
          thumbnail: null,
        });
      }
      return { ...item, localFiles, localUri: path };
    }
    return item;
  });
  localStorage.setItem("mori_history", JSON.stringify(history));
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);

  if (isVideo && window.Capacitor) {
    try {
      const videoSrc = window.Capacitor.convertFileSrc(path);
      const localThumbnail = await getVideoThumbnail(videoSrc);

      if (localThumbnail) {
        history = JSON.parse(localStorage.getItem("mori_history") || "[]");
        history = history.map((item) => {
          if (cleanUrl(item.url) === target) {
            const localFiles = item.localFiles || [];
            localFiles.forEach((f) => {
              if (f.path === path) f.thumbnail = localThumbnail;
            });
            return {
              ...item,
              localFiles,
              localThumbnail: localThumbnail || item.localThumbnail,
              versionCode: 7,
              versionName: "3.7.0",
            };
          }
          return item;
        });
        localStorage.setItem("mori_history", JSON.stringify(history));
        renderHistory(onHistoryItemClick, onHistoryDeleteClick);
      }
    } catch (err) {
      console.warn("Failed to generate video thumbnail", err);
    }
  }

  updateGreeting();
  updateStorageInfo();
});

// History Storage Helper
function saveToHistory(result, url) {
  if (localStorage.getItem("mori_incognito") === "true") return;
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");

  let cleanTitle = (result.title || "Content")
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // SMART MATCHING: Use cleaned URL to find existing entries
  const targetUrl = cleanUrl(url);
  const existingIndex = history.findIndex((h) => cleanUrl(h.url) === targetUrl);
  const existingItem = existingIndex !== -1 ? history[existingIndex] : null;

  const newItem = {
    title: cleanTitle,
    thumbnail: result.thumbnail,
    url: url, // Keep the latest URL version
    timestamp: Date.now(),
    localFiles: existingItem ? existingItem.localFiles || [] : [],
    localUri: existingItem ? existingItem.localUri : null,
    localThumbnail: existingItem ? existingItem.localThumbnail : null,
  };

  // Remove old entry if exists (using targetUrl match)
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift(newItem);

  // Limit to 100 items for better performance
  localStorage.setItem("mori_history", JSON.stringify(history.slice(0, 100)));

  // Refresh UI if defined
  if (typeof renderHistory === "function") {
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  }

  if (typeof updateGreeting === "function") {
    updateGreeting();
  }
}

// Auto-Clear Old History (Items > 30 days)
function autoClearOldHistory() {
  const isEnabled = localStorage.getItem("mori_autoclear_history") === "true";
  if (!isEnabled) return;

  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const filtered = history.filter((item) => {
    return now - item.timestamp < thirtyDays;
  });

  if (filtered.length !== history.length) {
    console.log(
      `[CLEANUP] Removed ${history.length - filtered.length} old history items`,
    );
    localStorage.setItem("mori_history", JSON.stringify(filtered));
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  }
}

// Export/Import Logic
async function exportMoriData() {
  try {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("mori_")) {
        data[key] = localStorage.getItem(key);
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const fileName = `mori_backup_${new Date().toISOString().split("T")[0]}.json`;

    if (window.Capacitor?.isNativePlatform() && Filesystem) {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: "CACHE",
      });

      await Share.share({
        title: "Mori Backup Data",
        text: "My Mori App settings and history backup.",
        url: saved.uri,
        dialogTitle: "Export Backup",
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    showToast(translations[currentLang]["toast-export-success"]);
  } catch (err) {
    console.error("Export failed", err);
    showToast("Export failed: " + err.message);
  }
}

async function importMoriData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.keys(data).forEach((key) => {
          if (key.startsWith("mori_")) {
            localStorage.setItem(key, data[key]);
          }
        });
        showToast(translations[currentLang]["toast-import-success"]);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        showToast("Import failed: invalid file");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Initialize App
autoClearOldHistory();
setUIState({ currentLang, isEditingHistory });
renderHistory(onHistoryItemClick, onHistoryDeleteClick);

// Nav Handling
const pages = ["home", "history", "settings"];
const navItems = document.querySelectorAll(".nav-item");

async function switchPage(pageId) {
  if (pageId === "history" && !isHistoryUnlocked) {
    const lockType = localStorage.getItem("mori_lock_type") || "none";

    if (lockType === "biometric" && NativeBiometric) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: translations[currentLang]["label-biometric-reason"],
            title: "Mori Privacy Lock",
            subtitle: "History Tab",
            description: translations[currentLang]["label-biometric-reason"],
          });
          isHistoryUnlocked = true;
        }
      } catch (err) {
        console.warn("Biometric failed or cancelled", err);
        return;
      }
    } else {
      isHistoryUnlocked = true;
    }
  }

  const item = Array.from(navItems).find(
    (i) => i.getAttribute("data-page") === pageId,
  );
  if (!item) return;

  const targetPageId = pageId + "Page";
  navItems.forEach((i) => i.classList.remove("active"));
  item.classList.add("active");

  document
    .querySelectorAll(".page-content")
    .forEach((page) => page.classList.add("hidden"));
  document.querySelectorAll("video").forEach((v) => v.pause());

  const targetPage = document.getElementById(targetPageId);
  if (targetPage) targetPage.classList.remove("hidden");

  // Reset settings to main menu when entering settings page
  if (pageId === "settings") {
    settingsSubPages.forEach((p) => p.classList.add("hidden"));
    if (settingsMainMenu) settingsMainMenu.classList.remove("hidden");
  }

  // Refresh history if entering history page
  if (pageId === "history") {
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    switchPage(item.getAttribute("data-page"));
  });
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
