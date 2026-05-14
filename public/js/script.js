import {
  scrapeSoundCloud,
  scrapeThreads,
  scrapeTikTok,
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
  CapacitorHttp,
  Filesystem,
  Toast,
  Clipboard,
  App,
  CHROME_UA,
  cleanUrl,
  truncate,
  showToast,
  copyToClipboard,
  handleScrapeError,
  getVideoThumbnail,
  setUtilsState,
  Share,
} from "./utils.js";

const APP_VERSION = "3.3.0";
const UPDATE_CHECK_URL =
  "https://gist.githubusercontent.com/coflyn/b4c2a950aa23bc896538adb70712b0c7/raw/mori_version.json";

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

// Settings Elements
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
const dataSaverToggle = document.getElementById("dataSaverToggle");
const shareAppBtn = document.getElementById("shareAppBtn");
const changePathBtn = document.getElementById("changePathBtn");
const pathVal = document.getElementById("pathVal");
const changeMusicPathBtn = document.getElementById("changeMusicPathBtn");
const musicPathVal = document.getElementById("musicPathVal");

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
});

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
const isAutoClear = localStorage.getItem("mori_auto_clear") === "true";
if (autoClearToggle) {
  autoClearToggle.checked = isAutoClear;
  autoClearToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_clear", e.target.checked);
    const lang = translations[currentLang];
    showToast(
      e.target.checked
        ? lang["toast-autoclear-on"]
        : lang["toast-autoclear-off"],
    );
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
    const cacheSize = await getFolderSize("", "CACHE");
    const sizeInMB = cacheSize / (1024 * 1024);

    // Only clear if cache is more than 50MB
    if (sizeInMB > 50) {
      const files = await Filesystem.readdir({ path: "", directory: "CACHE" });
      for (const file of files.files) {
        if (file.name.startsWith("thumb_")) {
          await Filesystem.deleteFile({ path: file.name, directory: "CACHE" });
        }
      }
      updateStorageInfo();
      console.log(`Auto-cleared ${sizeInMB.toFixed(2)}MB of cache.`);
    }
  } catch (e) {}
}

// Language Logic

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

  if (currentLang === "ja") {
    greetingStats.textContent = `履歴に ${history.length} ${lang["items-history"]}`;
  } else {
    greetingStats.textContent = `${history.length} ${lang["items-history"]}`;
  }
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

pasteBtn?.addEventListener("click", async () => {
  try {
    let text = "";
    if (window.Capacitor?.isNativePlatform() && Clipboard) {
      try {
        const result = await Clipboard.read();
        text = result.value;
      } catch (err) {
        console.warn("Native clipboard read failed, falling back...", err);
        // Fallback to navigator if native fails (unlikely but possible)
        text = await navigator.clipboard.readText();
      }
    } else {
      text = await navigator.clipboard.readText();
    }

    if (text && text.trim()) {
      const trimmed = text.trim();
      // Basic URL check
      if (
        trimmed.startsWith("http") ||
        trimmed.includes(".com") ||
        trimmed.includes(".net") ||
        trimmed.includes("youtu.be")
      ) {
        urlInput.value = trimmed;
        urlInput.dispatchEvent(new Event("input"));
      } else {
        showToast(translations[currentLang]["toast-no-link"]);
      }
    } else {
      showToast(translations[currentLang]["toast-clipboard-empty"]);
    }
  } catch (e) {
    console.error("Paste Error:", e);
    // If it fails, usually it's better to show empty/denied depending on context
    showToast(translations[currentLang]["toast-clipboard-empty"]);
  }
});

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

// Handle Shared Intent / Deep Links (Standard URLs)
if (App) {
  App.addListener("appUrlOpen", (data) => {
    if (data.url) {
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });

  App.getLaunchUrl().then((data) => {
    if (data && data.url) {
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
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
        localStorage.clear();
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
  const deviceInfo = `Model: ${navigator.userAgent}\nPlatform: ${platformVal?.textContent || "Unknown"}\nVersion: 3.3.0`;
  const text = encodeURIComponent(
    `Hi coflyn, I found a bug in Mori App:\n\n[BUG DESCRIPTION HERE]\n\n---\nDevice Info:\n${deviceInfo}`,
  );
  const whatsappUrl = `https://wa.me/6282399408885?text=${text}`;
  showToast(translations[currentLang]["label-opening-wa"]);
  window.open(whatsappUrl, "_blank");
});

async function checkUpdate() {
  const actionLabel = checkUpdateBtn.querySelector(".action-label");

  if (actionLabel.textContent === translations[currentLang]["btn-update"]) {
    const text = encodeURIComponent(
      `Hi coflyn, I want to update Mori to the latest version. I'm currently on v${APP_VERSION}.`,
    );
    const whatsappUrl = `https://wa.me/6282399408885?text=${text}`;
    showToast(translations[currentLang]["label-opening-wa"]);
    window.open(whatsappUrl, "_blank");
    return;
  }

  actionLabel.textContent = translations[currentLang]["btn-processing"];
  showToast(translations[currentLang]["label-checking-update"]);

  try {
    const res = await fetch(UPDATE_CHECK_URL + "?t=" + Date.now());
    const data = await res.json();

    if (data.version && data.version !== APP_VERSION) {
      actionLabel.textContent = translations[currentLang]["btn-update"];
      showToast(
        translations[currentLang]["label-update-available"] +
          " (v" +
          data.version +
          ")",
      );
    } else {
      actionLabel.textContent = translations[currentLang]["btn-check"];
      showToast(translations[currentLang]["label-up-to-date"]);
    }
  } catch (e) {
    console.error("Update check failed:", e);
    showToast(translations[currentLang]["label-check-failed"]);
    actionLabel.textContent = translations[currentLang]["btn-check"];
  }
}

checkUpdateBtn?.addEventListener("click", checkUpdate);

howToUseBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  const steps = lang["howtouse-steps"]
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n\n");
  showConfirm(lang["label-howtouse"], steps, () => {});
  // Hide the "OK" button or just use it as close
  okConfirmBtn.textContent = "GOT IT";
  cancelConfirmBtn.classList.add("hidden");
});

aboutAppBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showConfirm(lang["label-about"], lang["about-text"], () => {});
  okConfirmBtn.textContent = "CLOSE";
  cancelConfirmBtn.classList.add("hidden");
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
        data = await scrapeTikTok(url);
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
      } else if (url.includes("soundcloud.com")) {
        data = await scrapeSoundCloud(url);
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

    if (data && data.status) {
      saveToHistory(data.result, url);
      const state = renderResult(data.result, url);
      slideData = state.slideData;
      currentSlideIndex = state.currentSlideIndex;
      loader.classList.add("hidden");
    } else {
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

  const existingItem = history.find((h) => h.url === url);

  const newItem = {
    title: cleanTitle,
    thumbnail: result.thumbnail,
    url: url,
    timestamp: new Date().getTime(),
    localFiles: existingItem ? existingItem.localFiles : [],
    localUri: existingItem ? existingItem.localUri : null,
    localThumbnail: existingItem ? existingItem.localThumbnail : null,
  };
  history = history.filter((h) => h.url !== url);
  history.unshift(newItem);
  localStorage.setItem("mori_history", JSON.stringify(history.slice(0, 50)));
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  updateGreeting();
}

// Initialize App
setUIState({ currentLang, isEditingHistory });
renderHistory(onHistoryItemClick, onHistoryDeleteClick);

// Nav Handling
const pages = ["home", "history", "settings"];
const navItems = document.querySelectorAll(".nav-item");

function switchPage(pageId) {
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
