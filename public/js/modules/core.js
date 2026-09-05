// core.js — konstanta, DOM refs, state bersama
import { translations } from "../i18n/index.js";
import { Filesystem } from "../utils/index.js";

export const APP_VERSION = "4.3.1";
export const GITHUB_REPO = "coflyn/Mori";
export const UPDATE_CHECK_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const REPO_URL = `https://github.com/${GITHUB_REPO}`;

const tauriInvoke =
  window.__TAURI__?.core?.invoke ||
  window.__TAURI_INTERNALS__?.invoke ||
  window.__TAURI__?.invoke;

if (tauriInvoke && !window.Capacitor?.isNativePlatform?.()) {
  document.documentElement.classList.add("is-desktop");
  if (document.body) {
    document.body.classList.add("is-desktop");
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body?.classList.add("is-desktop");
    });
  }
}

export const urlInput = document.getElementById("urlInput");
export const batchUrlInput = document.getElementById("batchUrlInput");
export const batchToggleBtn = document.getElementById("batchToggleBtn");
export const clearBtn = document.getElementById("clearBtn");
export const pasteBtn = document.getElementById("pasteBtn");
export const downloadBtn = document.getElementById("downloadBtn");

export const batchModalOverlay = document.getElementById("batchModalOverlay");
export const batchModalTitle = document.getElementById("batchModalTitle");
export const batchModalCounter = document.getElementById("batchModalCounter");
export const batchProgressList = document.getElementById("batchProgressList");
export const batchDownloadAllBtn = document.getElementById(
  "batchDownloadAllBtn",
);
export const batchCloseBtn = document.getElementById("batchCloseBtn");

export const inputWrapper = document.getElementById("inputWrapper");

export let isBatchMode = false;
export function setBatchMode(v) {
  isBatchMode = v;
}

export function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

export const loader = document.getElementById("loader");
export const resultSection = document.getElementById("resultSection");
export const resultTitle = document.getElementById("resultTitle");
export const downloadList = document.getElementById("downloadList");
export const closeResult = document.getElementById("closeResult");
export const slidesWrapper = document.getElementById("slidesWrapper");
export const sliderNav = document.getElementById("sliderNav");
export const slidePrevBtn = document.getElementById("slidePrevBtn");
export const slideNextBtn = document.getElementById("slideNextBtn");
export const slideIndicator = document.getElementById("slideIndicator");
export let currentSlideIndex = 0;
export function setCurrentSlideIndex(v) {
  currentSlideIndex = v;
}
export let slideData = [];
export function setSlideData(v) {
  slideData = v;
}
export let lastHandledLinkTime = 0; // To prevent clipboard overwriting shared links
export let isIntentPending = false; // Flag to block auto-paste during resume share
export function setLastHandledLinkTime(v) {
  lastHandledLinkTime = v;
}
export function setIntentPending(v) {
  isIntentPending = v;
}

// Modal Elements
export const modalOverlay = document.getElementById("modalOverlay");
export const closeModal = document.getElementById("closeModal");
export const modalThumb = document.getElementById("modalThumb");
export const modalTitle = document.getElementById("modalTitle");
export const modalUrl = document.getElementById("modalUrl");
export const redownloadBtn = document.getElementById("redownloadBtn");

// Confirm Modal Elements
export const confirmOverlay = document.getElementById("confirmOverlay");
export const confirmTitle = document.getElementById("confirmTitle");
export const confirmMessage = document.getElementById("confirmMessage");
export const okConfirmBtn = document.getElementById("okConfirmBtn");
export const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

// Custom Info Modal Elements
export const infoOverlay = document.getElementById("infoOverlay");
export const infoTitle = document.getElementById("infoTitle");
export const infoMessage = document.getElementById("infoMessage");
export const closeInfoModal = document.getElementById("closeInfoModal");
export const infoDontShowAgain = document.getElementById("infoDontShowAgain");
export const infoDontShowCheckbox = document.getElementById(
  "infoDontShowCheckbox",
);
export const infoDontShowLabel = document.getElementById("infoDontShowLabel");

// History Edit Elements
export const editHistoryBtn = document.getElementById("editHistoryBtn");
export const clearAllBtn = document.getElementById("clearAllBtn");
export const doneEditBtn = document.getElementById("doneEditBtn");
export let isEditingHistory = false;
export function setIsEditingHistory(v) {
  isEditingHistory = v;
}

export const autoClearHistoryToggle = document.getElementById(
  "autoClearHistoryToggle",
);
export const lockTypeSelect = document.getElementById("lockTypeSelect");
export const setPinBtn = document.getElementById("setPinBtn");

export let isHistoryUnlocked = false; // Session-based unlock state
export let isSettingsUnlocked = false; // Session-based settings lock state
export function setHistoryUnlocked(v) {
  isHistoryUnlocked = v;
}
export function setSettingsUnlocked(v) {
  isSettingsUnlocked = v;
}

// Settings Elements
export const clearCacheBtn = document.getElementById("clearCacheBtn");
export const wipeDataBtn = document.getElementById("wipeDataBtn");
export const reportBugBtn = document.getElementById("reportBugBtn");
export const checkUpdateBtn = document.getElementById("checkUpdateBtn");
export const platformVal = document.getElementById("platformVal");
export const currentLangDisplay = document.getElementById("currentLangDisplay");
export const darkModeToggle = document.getElementById("darkModeToggle");
export const autoClearToggle = document.getElementById("autoClearToggle");
export const howToUseBtn = document.getElementById("howToUseBtn");
export const aboutAppBtn = document.getElementById("aboutAppBtn");
export const incognitoToggle = document.getElementById("incognitoToggle");
export const autoPasteToggle = document.getElementById("autoPasteToggle");
export const dataSaverToggle = document.getElementById("dataSaverToggle");
export const shareAppBtn = document.getElementById("shareAppBtn");
export const changePathBtn = document.getElementById("changePathBtn");
export const pathVal = document.getElementById("pathVal");
export const changeMusicPathBtn = document.getElementById("changeMusicPathBtn");
export const musicPathVal = document.getElementById("musicPathVal");
export const wifiOnlyToggle = document.getElementById("wifiOnlyToggle");
export const autoDownloadToggle = document.getElementById("autoDownloadToggle");
export const filenameSelect = document.getElementById("filenameSelect");
export const colorAccentSelect = document.getElementById("colorAccentSelect");
export const fontSelect = document.getElementById("fontSelect");
export const autoPlayToggle = document.getElementById("autoPlayToggle");
export const autoLoopToggle = document.getElementById("autoLoopToggle");

export const settingsMainMenu = document.getElementById("settingsMainMenu");
export const settingsSubPages = document.querySelectorAll(".settings-sub-page");
export const settingsMenuItems = document.querySelectorAll(
  ".settings-menu-item",
);
export const settingsBackBtns = document.querySelectorAll(".back-btn-settings");

export const loaderText = document.getElementById("loaderText");

export const guideOverlay = document.getElementById("guideOverlay");
export const hideGuideCheckbox = document.getElementById("hideGuideCheckbox");
export const closeGuideBtn = document.getElementById("closeGuideBtn");
export const guideToSettingsBtn = document.getElementById("guideToSettingsBtn");

export let currentLang = localStorage.getItem("mori_lang") || "en";
export function setCurrentLang(v) {
  currentLang = v;
}

export const isNative = () => window.Capacitor?.isNativePlatform?.();
export const t = (key) =>
  (translations[currentLang] || translations.en)[key] || key;

export function openExternalUrl(targetUrl) {
  try {
    const tauriInvoke =
      window.__TAURI__?.core?.invoke ||
      window.__TAURI_INTERNALS__?.invoke ||
      window.__TAURI__?.invoke;
    if (tauriInvoke) {
      tauriInvoke("tauri_open_url", { url: targetUrl }).catch(() => {
        window.open(targetUrl, "_blank");
      });
      return;
    }

    if (window.Capacitor?.isNativePlatform?.()) {
      window.open(targetUrl, "_system");
    } else {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    window.open(targetUrl, "_blank");
  }
}

export async function getFolderSize(path, directory) {
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

export async function updateStorageInfo() {
  const storageVal = document.getElementById("storageSizeVal");
  if (!storageVal) return;

  try {
    let totalSize = 0;
    const tauriInvoke =
      window.__TAURI__?.core?.invoke ||
      window.__TAURI_INTERNALS__?.invoke ||
      window.__TAURI__?.invoke;

    if (tauriInvoke) {
      try {
        const desktopSize = await tauriInvoke("tauri_get_folder_size", {
          folder: "Mori",
        });
        if (typeof desktopSize === "number") {
          totalSize = desktopSize;
        }
      } catch (err) {
        console.warn("Tauri folder size error:", err);
      }
    } else if (Filesystem) {
      totalSize += await getFolderSize("", "CACHE");
      const primary = await getFolderSize("Download/Mori", "EXTERNAL_STORAGE");
      const legacy = await getFolderSize("Download/Mori", "EXTERNAL");
      totalSize += Math.max(primary, legacy);
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    storageVal.textContent = `${sizeInMB} MB`;
  } catch (e) {
    console.error("Storage size error:", e);
    storageVal.textContent = "0.00 MB";
  }
}

export function updateGreeting() {}

export async function clearCacheSilently() {
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

export function switchToSingleMode(url) {
  if (isBatchMode) {
    setBatchMode(false);
    batchToggleBtn?.classList.remove("active");
    inputWrapper?.classList.remove("batch-active");
    urlInput?.classList.remove("hidden");
    batchUrlInput?.classList.add("hidden");
    const lang = translations[currentLang];
    downloadBtn.textContent = lang["btn-analyze"] || "ANALYZE";
  }
  if (url && urlInput) {
    urlInput.value = url;
    urlInput.dispatchEvent(new Event("input"));
  }
}
