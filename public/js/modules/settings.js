// settings.js — settings UI: theme, toggles, selects, paths, language
import { translations } from "../i18n/index.js";
import {
  CapacitorHttp,
  Filesystem,
  releaseWakeLock,
  requestWakeLock,
  setUtilsState,
  showToast,
  triggerHaptic,
  previewSound,
} from "../utils/index.js";
import { setUIState, renderHistory } from "../ui.js";
import { showConfirm } from "./modals.js";
import { onHistoryItemClick, onHistoryDeleteClick } from "./history.js";
import {
  APP_VERSION,
  autoClearHistoryToggle,
  autoClearToggle,
  clearCacheBtn,
  wipeDataBtn,
  reportBugBtn,
  platformVal,
  autoDownloadToggle,
  autoLoopToggle,
  autoPasteToggle,
  autoPlayToggle,
  changeMusicPathBtn,
  changePathBtn,
  currentLang,
  setCurrentLang,
  currentLangDisplay,
  darkModeToggle,
  dataSaverToggle,
  incognitoToggle,
  musicPathVal,
  okConfirmBtn,
  openExternalUrl,
  pathVal,
  wifiOnlyToggle,
} from "./core.js";

// Helper to sync setting to Android SharedPreferences for ShareActivity
export function syncSettingToNative(key, val) {
  if (window.MoriMainBridge?.saveSetting) {
    try {
      window.MoriMainBridge.saveSetting(key, String(val));
    } catch (e) {
      console.error("syncSettingToNative error", e);
    }
  }
}

export function syncAllSettingsToNative() {
  const keys = [
    "mori_lang",
    "mori_theme",
    "mori_font",
    "mori_prefer_server",
    "mori_download_path",
    "mori_auto_folder",
    "mori_filename",
    "mori_incognito",
    "mori_auto_download",
    "mori_wifi_only",
  ];
  keys.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      syncSettingToNative(key, val);
    }
  });
}

// Init Theme
const savedTheme = localStorage.getItem("mori_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
if (darkModeToggle) darkModeToggle.checked = savedTheme === "dark";

darkModeToggle?.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mori_theme", theme);
  syncSettingToNative("mori_theme", theme);
  applyColorAccent();
  const lang = translations[currentLang] || translations.en;
  showToast(
    e.target.checked
      ? lang["toast-darkmode-on"] || "Dark mode enabled"
      : lang["toast-darkmode-off"] || "Light mode enabled",
  );
});

// Color Accent Logic
const accentColors = {
  black: { light: "#1a1917", dark: "#fffbf2" },
};

export function applyColorAccent() {
  const theme = localStorage.getItem("mori_theme") || "light";
  const color = accentColors.black[theme] || "#1a1917";
  document.documentElement.style.setProperty("--primary", color);
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
if (autoPasteToggle) {
  autoPasteToggle.checked = localStorage.getItem("mori_auto_paste") !== "false";
  autoPasteToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_paste", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autopaste-on"] || "Auto-paste enabled"
        : lang["toast-autopaste-off"] || "Auto-paste disabled",
    );
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

const isNativePlatform = window.Capacitor?.isNativePlatform?.();
if (!isNativePlatform) {
  const hapticToggle = document.getElementById("hapticToggle");
  const hapticItem = hapticToggle?.closest(".settings-item");
  if (hapticItem) hapticItem.style.display = "none";
}

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

  const defaultFallback =
    storageKey === "mori_prefer_server"
      ? "ask"
      : storageKey === "mori_font"
        ? "display"
        : storageKey === "mori_anim_speed"
          ? "normal"
          : storageKey === "mori_text_size"
            ? "medium"
            : storageKey === "mori_glassmorphism"
              ? "subtle"
              : storageKey === "mori_ui_corner"
                ? "modern"
                : storageKey === "mori_sound_pack"
                  ? "chime"
                  : storageKey === "mori_concurrent"
                    ? "1"
                    : storageKey === "mori_overwrite"
                      ? "rename"
                      : storageKey === "mori_max_retry"
                        ? "3"
                        : storageKey === "mori_doh"
                          ? "off"
                          : storageKey === "mori_toast_dur"
                            ? "3"
                            : "default";
  const currentVal = localStorage.getItem(storageKey) || defaultFallback;

  // Update display on load
  const item =
    menu.querySelector(`[data-value="${currentVal}"]`) ||
    menu.querySelector(".dropdown-item");
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
    document.querySelectorAll(".settings-item").forEach((s) => {
      s.classList.remove("active-dropdown");
    });

    menu.classList.toggle("hidden");

    if (!menu.classList.contains("hidden")) {
      select.closest(".settings-item")?.classList.add("active-dropdown");
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
      select.closest(".settings-item")?.classList.remove("active-dropdown");
      menu.classList.remove("open-up");
    }
  });

  menu.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = item.getAttribute("data-value");
      localStorage.setItem(storageKey, val);
      syncSettingToNative(storageKey, val);
      text.textContent = item.textContent;
      menu.classList.add("hidden");
      menu.classList.remove("open-up"); // Clean up on selection
      select.closest(".settings-item")?.classList.remove("active-dropdown");

      if (storageKey === "mori_accent") applyColorAccent();
      if (storageKey === "mori_font") applyFont();
      if (storageKey === "mori_lang") switchLanguage(val);
      if (storageKey === "mori_anim_speed") applyAnimSpeed();
      if (storageKey === "mori_text_size") applyTextSize();
      if (storageKey === "mori_glassmorphism") applyGlassmorphism();
      if (storageKey === "mori_ui_corner") applyUiCorner();
      if (storageKey === "mori_sound_pack") previewSound(val);

      const labelText =
        select.closest(".settings-item")?.querySelector(".settings-title span")
          ?.textContent || "Setting";
      showToast(`${labelText}: ${item.textContent.trim()}`);
    });
  });
}

// Initialize Dropdowns
setupCustomSelect(
  "languageSelect",
  "mori_lang",
  "currentLangDisplay",
  "languageMenu",
);
setupCustomSelect(
  "filenameSelect",
  "mori_filename",
  "filenameText",
  "filenameMenu",
);

setupCustomSelect("fontSelect", "mori_font", "fontText", "fontMenu");
setupCustomSelect(
  "historyLimitSelect",
  "mori_history_limit",
  "historyLimitText",
  "historyLimitMenu",
);
setupCustomSelect(
  "autoClearDaysSelect",
  "mori_auto_clear_days",
  "autoClearDaysText",
  "autoClearDaysMenu",
);
setupCustomSelect(
  "autoClearCacheDaysSelect",
  "mori_auto_clear_cache_days",
  "autoClearCacheDaysText",
  "autoClearCacheDaysMenu",
);

setupCustomSelect(
  "preferServerSelect",
  "mori_prefer_server",
  "preferServerText",
  "preferServerMenu",
);
setupCustomSelect(
  "batchPhotoModeSelect",
  "mori_batch_photo_mode",
  "batchPhotoModeText",
  "batchPhotoModeMenu",
);
setupCustomSelect(
  "userAgentSelect",
  "mori_user_agent",
  "userAgentText",
  "userAgentMenu",
);
setupCustomSelect(
  "requestTimeoutSelect",
  "mori_request_timeout",
  "requestTimeoutText",
  "requestTimeoutMenu",
);
setupCustomSelect(
  "animSpeedSelect",
  "mori_anim_speed",
  "animSpeedText",
  "animSpeedMenu",
);
setupCustomSelect(
  "textSizeSelect",
  "mori_text_size",
  "textSizeText",
  "textSizeMenu",
);
setupCustomSelect(
  "glassSelect",
  "mori_glassmorphism",
  "glassText",
  "glassMenu",
);
setupCustomSelect("cornerSelect", "mori_ui_corner", "cornerText", "cornerMenu");
setupCustomSelect(
  "soundPackSelect",
  "mori_sound_pack",
  "soundPackText",
  "soundPackMenu",
);
setupCustomSelect(
  "concurrentSelect",
  "mori_concurrent",
  "concurrentText",
  "concurrentMenu",
);
setupCustomSelect(
  "overwriteSelect",
  "mori_overwrite",
  "overwriteText",
  "overwriteMenu",
);
setupCustomSelect(
  "maxRetrySelect",
  "mori_max_retry",
  "maxRetryText",
  "maxRetryMenu",
);
setupCustomSelect("dohSelect", "mori_doh", "dohText", "dohMenu");

// Hide Progress Bar toggle
const hideProgressToggle = document.getElementById("hideProgressToggle");
if (hideProgressToggle) {
  hideProgressToggle.checked =
    localStorage.getItem("mori_hide_progress") === "true";
  hideProgressToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_hide_progress", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-hide-progress-on"] || "Download progress bar hidden"
        : lang["toast-hide-progress-off"] || "Download progress bar shown",
    );
  });
}

setupCustomSelect(
  "toastDurSelect",
  "mori_toast_dur",
  "toastDurText",
  "toastDurMenu",
);

// Download Statistics — read + live update on every file saved
export function updateDlStatsDisplay() {
  const el = document.getElementById("historyDlStatsVal");
  if (!el) return;
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const storedCount = parseInt(
    localStorage.getItem("mori_dl_count") || "0",
    10,
  );
  const count = Math.max(storedCount, history.length);
  el.textContent = count.toLocaleString();
}
updateDlStatsDisplay();
window.addEventListener("mori_file_saved", () => {
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const storedCount = parseInt(
    localStorage.getItem("mori_dl_count") || "0",
    10,
  );
  const newCount = Math.max(storedCount, history.length) + 1;
  localStorage.setItem("mori_dl_count", newCount);
  updateDlStatsDisplay();
});

// Reset Settings to Default
const resetSettingsBtn = document.getElementById("resetSettingsBtn");
if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    showConfirm(
      lang["label-reset-settings"] || "Reset Settings",
      lang["confirm-reset-settings"] ||
        "Reset all settings to their defaults? This will not delete your history or downloaded files.",
      () => {
        // Keys to preserve (history, downloaded file records, stats, incognito)
        const preserve = ["mori_history", "mori_dl_count", "mori_incognito"];
        const preserved = {};
        preserve.forEach((k) => {
          const v = localStorage.getItem(k);
          if (v !== null) preserved[k] = v;
        });
        // Clear all mori_ keys
        Object.keys(localStorage)
          .filter((k) => k.startsWith("mori_"))
          .forEach((k) => localStorage.removeItem(k));
        // Restore preserved keys
        Object.entries(preserved).forEach(([k, v]) =>
          localStorage.setItem(k, v),
        );
        showToast(lang["toast-reset-settings"] || "Settings reset to default");
        // Re-apply UI
        setTimeout(() => location.reload(), 800);
      },
    );
  });
}

// Animation Speed Logic
export function applyAnimSpeed() {
  if (!document.body) return;
  const speed = localStorage.getItem("mori_anim_speed") || "normal";
  document.body.classList.remove(
    "anim-off",
    "anim-slow",
    "anim-normal",
    "anim-fast",
  );
  document.body.classList.add(`anim-${speed}`);
}
applyAnimSpeed();

export function applyTextSize() {
  const size = localStorage.getItem("mori_text_size") || "medium";
  const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };
  document.documentElement.style.fontSize = fontSizeMap[size] || "16px";
  document.body.classList.remove("text-small", "text-medium", "text-large");
  document.body.classList.add(`text-${size}`);
}
applyTextSize();

export function applyGlassmorphism() {
  if (!document.body) return;
  const mode = localStorage.getItem("mori_glassmorphism") || "subtle";
  document.body.classList.remove("glass-off", "glass-subtle", "glass-deep");
  document.body.classList.add(`glass-${mode}`);
}
applyGlassmorphism();

export function applyUiCorner() {
  if (!document.body) return;
  const corner = localStorage.getItem("mori_ui_corner") || "modern";
  document.body.classList.remove(
    "corner-sharp",
    "corner-modern",
    "corner-round",
  );
  document.body.classList.add(`corner-${corner}`);
}
applyUiCorner();

// Compact Mode Logic
const compactModeToggle = document.getElementById("compactModeToggle");
if (compactModeToggle) {
  compactModeToggle.checked =
    localStorage.getItem("mori_compact_mode") === "true";
  if (compactModeToggle.checked) document.body.classList.add("compact-mode");
  compactModeToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_compact_mode", e.target.checked);
    if (e.target.checked) {
      document.body.classList.add("compact-mode");
    } else {
      document.body.classList.remove("compact-mode");
    }
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-compact-on"] || "Compact mode enabled"
        : lang["toast-compact-off"] || "Compact mode disabled",
    );
  });
}

const autoAnalyzeToggle = document.getElementById("autoAnalyzeToggle");
if (autoAnalyzeToggle) {
  autoAnalyzeToggle.checked =
    localStorage.getItem("mori_auto_analyze") === "true";
  autoAnalyzeToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_analyze", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoanalyze-on"] || "Auto-analyze enabled"
        : lang["toast-autoanalyze-off"] || "Auto-analyze disabled",
    );
  });
}

const autoClearInputToggle = document.getElementById("autoClearInputToggle");
if (autoClearInputToggle) {
  autoClearInputToggle.checked =
    localStorage.getItem("mori_auto_clear_input") === "true";
  autoClearInputToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_clear_input", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoclearinput-on"] || "Auto-clear input enabled"
        : lang["toast-autoclearinput-off"] || "Auto-clear input disabled",
    );
  });
}

const downloadSoundToggle = document.getElementById("downloadSoundToggle");
const soundPackItem = document.getElementById("soundPackItem");

function updateSoundPackVisibility() {
  if (!soundPackItem) return;
  const isSoundEnabled =
    localStorage.getItem("mori_download_sound") !== "false";
  soundPackItem.style.display = isSoundEnabled ? "flex" : "none";
}
updateSoundPackVisibility();

if (downloadSoundToggle) {
  downloadSoundToggle.checked =
    localStorage.getItem("mori_download_sound") !== "false";
  downloadSoundToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_download_sound", e.target.checked);
    updateSoundPackVisibility();
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-sound-on"] || "Completion sound enabled"
        : lang["toast-sound-off"] || "Completion sound disabled",
    );
  });
}

const autoRetryToggle = document.getElementById("autoRetryToggle");
if (autoRetryToggle) {
  autoRetryToggle.checked = localStorage.getItem("mori_auto_retry") !== "false";
  autoRetryToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_retry", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoretry-on"] || "Auto-retry engine enabled"
        : lang["toast-autoretry-off"] || "Auto-retry engine disabled",
    );
  });
}

const hapticToggle = document.getElementById("hapticToggle");
if (hapticToggle) {
  hapticToggle.checked = localStorage.getItem("mori_haptic") === "true";
  hapticToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_haptic", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-haptic-on"] || "Haptic vibration enabled"
        : lang["toast-haptic-off"] || "Haptic vibration disabled",
    );
  });
}

const autoFolderToggle = document.getElementById("autoFolderToggle");
if (autoFolderToggle) {
  autoFolderToggle.checked =
    localStorage.getItem("mori_auto_folder") !== "false";
  autoFolderToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_folder", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autofolder-on"] || "Platform subfolders enabled"
        : lang["toast-autofolder-off"] || "Platform subfolders disabled",
    );
  });
}

const keepAwakeToggle = document.getElementById("keepAwakeToggle");
if (keepAwakeToggle) {
  keepAwakeToggle.checked = localStorage.getItem("mori_keep_awake") === "true";
  keepAwakeToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_keep_awake", e.target.checked);
    if (e.target.checked) requestWakeLock();
    else releaseWakeLock();
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-keepawake-on"] || "Keep screen awake enabled"
        : lang["toast-keepawake-off"] || "Keep screen awake disabled",
    );
  });
}

const autoUpdateToggle = document.getElementById("autoUpdateToggle");
if (autoUpdateToggle) {
  autoUpdateToggle.checked =
    localStorage.getItem("mori_auto_update") !== "false";
  autoUpdateToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_auto_update", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoupdate-on"] || "Auto check updates enabled"
        : lang["toast-autoupdate-off"] || "Auto check updates disabled",
    );
  });
}

const forceIpv4Toggle = document.getElementById("forceIpv4Toggle");
if (forceIpv4Toggle) {
  forceIpv4Toggle.checked = localStorage.getItem("mori_force_ipv4") === "true";
  forceIpv4Toggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_force_ipv4", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-forceipv4-on"] || "Force IPv4 enabled"
        : lang["toast-forceipv4-off"] || "Force IPv4 disabled",
    );
  });
}

const headerSpoofingToggle = document.getElementById("headerSpoofingToggle");
if (headerSpoofingToggle) {
  headerSpoofingToggle.checked =
    localStorage.getItem("mori_header_spoofing") !== "false";
  headerSpoofingToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_header_spoofing", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-anti403-on"] || "Anti-403 header guard enabled"
        : lang["toast-anti403-off"] || "Anti-403 header guard disabled",
    );
  });
}

const cellularWarningToggle = document.getElementById("cellularWarningToggle");
if (cellularWarningToggle) {
  cellularWarningToggle.checked =
    localStorage.getItem("mori_cellular_warning") === "true";
  cellularWarningToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_cellular_warning", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-cellularwarning-on"] || "Cellular data warning enabled"
        : lang["toast-cellularwarning-off"] || "Cellular data warning disabled",
    );
  });
}

const bypassSslToggle = document.getElementById("bypassSslToggle");
if (bypassSslToggle) {
  bypassSslToggle.checked = localStorage.getItem("mori_bypass_ssl") === "true";
  bypassSslToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_bypass_ssl", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-bypassssl-on"] || "Bypass SSL errors enabled"
        : lang["toast-bypassssl-off"] || "Bypass SSL errors disabled",
    );
  });
}

const testLatencyBtn = document.getElementById("testLatencyBtn");
if (testLatencyBtn) {
  testLatencyBtn.addEventListener("click", async () => {
    const resultVal = document.getElementById("latencyResultVal");
    if (resultVal) resultVal.textContent = "...";
    showToast("Testing server latency...");
    const start = Date.now();
    try {
      if (CapacitorHttp) {
        await CapacitorHttp.get({
          url: "https://api.github.com/zen",
          headers: { "User-Agent": "Mori-App" },
        });
      } else {
        await fetch("https://api.github.com/zen");
      }
      const duration = Date.now() - start;
      if (resultVal) resultVal.textContent = `${duration} ms`;
      showToast(`Server latency: ${duration} ms (Online)`);
    } catch (err) {
      if (resultVal) resultVal.textContent = "Error";
      showToast("Latency check failed. Offline?");
    }
  });
}

// Font Switching Logic
export function applyFont() {
  if (!document.body) return;
  const font = localStorage.getItem("mori_font") || "display";
  document.body.className = (document.body.className || "").replace(
    /\bfont-\S+/g,
    "",
  );
  document.body.classList.add(`font-${font}`);
}

// Initial Font apply
applyFont();

// Auto-Play Toggle
if (autoPlayToggle) {
  autoPlayToggle.checked = localStorage.getItem("mori_autoplay") !== "false";
  autoPlayToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_autoplay", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoplay-on"] || "Auto-play media enabled"
        : lang["toast-autoplay-off"] || "Auto-play media disabled",
    );
  });
}

if (autoLoopToggle) {
  autoLoopToggle.checked = localStorage.getItem("mori_loop") !== "false";
  autoLoopToggle.addEventListener("change", (e) => {
    localStorage.setItem("mori_loop", e.target.checked);
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-autoloop-on"] || "Auto-loop video enabled"
        : lang["toast-autoloop-off"] || "Auto-loop video disabled",
    );
  });
}

document.addEventListener("click", (e) => {
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.add("hidden"));
  document
    .querySelectorAll(".settings-item.active-dropdown")
    .forEach((s) => s.classList.remove("active-dropdown"));

  const interactive = e.target.closest(
    "button, .nav-item, .settings-item, .toggle-switch, .dropdown-item, .paste-btn, .clear-btn, .chip",
  );
  if (interactive) {
    triggerHaptic("medium");
  }
});

// Download Path Logic (Video)
export let customPath = localStorage.getItem("mori_download_path") || "Mori";
if (pathVal) pathVal.textContent = `/Download/${customPath}`;

changePathBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showConfirm(
    lang["label-path-video"],
    `<div class="path-picker-ui">
       <div class="path-input-wrapper">
         <span class="path-label-sm">${lang["label-subfolder-downloads"]}</span>
         <div class="mori-input-with-icon">
           <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
           <input type="text" id="customPathInput" class="mori-input-noborder" value="${customPath}" placeholder="e.g. Mori" spellcheck="false" autocomplete="off">
         </div>
       </div>
       <span class="path-label-sm">${lang["label-path-presets"]}</span>
       <div class="path-presets-container">
         <button class="path-preset-chip" data-path="Mori">Mori</button>
         <button class="path-preset-chip" data-path="Mori/Videos">Mori/Videos</button>
       </div>
       <button id="resetPathBtn" class="reset-path-btn">
         <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
         <span>${lang["btn-reset-default"]}</span>
       </button>
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
    const chips = document.querySelectorAll(
      ".path-presets-container .path-preset-chip",
    );
    const updateActiveChips = () => {
      const current = input ? input.value.trim() : "";
      chips.forEach((c) => {
        if (c.getAttribute("data-path") === current) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    };
    updateActiveChips();
    input?.addEventListener("input", updateActiveChips);

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (input) {
          input.value = chip.getAttribute("data-path");
          updateActiveChips();
          input.focus();
        }
      });
    });
    document.getElementById("resetPathBtn")?.addEventListener("click", () => {
      if (input) {
        input.value = "Mori";
        updateActiveChips();
        input.focus();
      }
    });
  }, 100);
  if (okConfirmBtn) {
    okConfirmBtn.textContent = "SAVE";
    okConfirmBtn.classList.add("neutral-btn");
  }
});

// Download Path Logic (Music)
export let customMusicPath =
  localStorage.getItem("mori_music_path") || "Mori/Music";
if (musicPathVal) musicPathVal.textContent = `/Download/${customMusicPath}`;

changeMusicPathBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showConfirm(
    lang["label-path-music"],
    `<div class="path-picker-ui">
       <div class="path-input-wrapper">
         <span class="path-label-sm">${lang["label-subfolder-downloads"]}</span>
         <div class="mori-input-with-icon">
           <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
           <input type="text" id="customMusicPathInput" class="mori-input-noborder" value="${customMusicPath}" placeholder="e.g. Mori/Music" spellcheck="false" autocomplete="off">
         </div>
       </div>
       <span class="path-label-sm">${lang["label-path-presets"]}</span>
       <div class="path-presets-container">
         <button class="path-preset-chip" data-path="Mori/Music">Mori/Music</button>
         <button class="path-preset-chip" data-path="Music">Music</button>
       </div>
       <button id="resetMusicPathBtn" class="reset-path-btn">
         <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
         <span>${lang["btn-reset-default"]}</span>
       </button>
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
    const chips = document.querySelectorAll(
      ".path-presets-container .path-preset-chip",
    );
    const updateActiveChips = () => {
      const current = input ? input.value.trim() : "";
      chips.forEach((c) => {
        if (c.getAttribute("data-path") === current) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    };
    updateActiveChips();
    input?.addEventListener("input", updateActiveChips);

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (input) {
          input.value = chip.getAttribute("data-path");
          updateActiveChips();
          input.focus();
        }
      });
    });
    document
      .getElementById("resetMusicPathBtn")
      ?.addEventListener("click", () => {
        if (input) {
          input.value = "Mori/Music";
          updateActiveChips();
          input.focus();
        }
      });
  }, 100);
  if (okConfirmBtn) {
    okConfirmBtn.textContent = "SAVE";
    okConfirmBtn.classList.add("neutral-btn");
  }
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

// Language Logic

export function updateCustomSelectsUI() {
  const lang = translations[currentLang] || translations.en;

  const currentFilename = localStorage.getItem("mori_filename") || "title";
  const filenameText = document.getElementById("filenameText");
  if (filenameText)
    filenameText.textContent =
      lang[`filename-${currentFilename}`] || currentFilename;

  const currentUA = localStorage.getItem("mori_user_agent") || "default";
  const userAgentText = document.getElementById("userAgentText");
  if (userAgentText)
    userAgentText.textContent = lang[`ua-${currentUA}`] || currentUA;

  const currentTimeout = localStorage.getItem("mori_request_timeout") || "30";
  const requestTimeoutText = document.getElementById("requestTimeoutText");
  if (requestTimeoutText)
    requestTimeoutText.textContent =
      lang[`timeout-${currentTimeout}`] || `${currentTimeout}s`;

  const currentServer = localStorage.getItem("mori_prefer_server") || "ask";
  const preferServerText = document.getElementById("preferServerText");
  if (preferServerText)
    preferServerText.textContent =
      lang[`server-${currentServer}`] || currentServer;

  const currentFont = localStorage.getItem("mori_font") || "display";
  const fontText = document.getElementById("fontText");
  if (fontText)
    fontText.textContent =
      lang[`font-${currentFont}`] ||
      (currentFont === "default"
        ? lang["font-default"] || "Default"
        : currentFont);

  const currentLimit =
    localStorage.getItem("mori_history_limit") || "unlimited";
  const historyLimitText = document.getElementById("historyLimitText");
  if (historyLimitText)
    historyLimitText.textContent =
      lang[`history-${currentLimit}`] || currentLimit;

  const currentClearDays =
    localStorage.getItem("mori_auto_clear_days") || "off";
  const autoClearDaysText = document.getElementById("autoClearDaysText");
  if (autoClearDaysText)
    autoClearDaysText.textContent =
      lang[`days-${currentClearDays}`] || currentClearDays;

  const currentCacheDays =
    localStorage.getItem("mori_auto_clear_cache_days") || "off";
  const autoClearCacheDaysText = document.getElementById(
    "autoClearCacheDaysText",
  );
  if (autoClearCacheDaysText)
    autoClearCacheDaysText.textContent =
      lang[`days-${currentCacheDays}`] || currentCacheDays;

  const currentLock = localStorage.getItem("mori_lock_type") || "none";
  const lockTypeText = document.getElementById("lockTypeText");
  if (lockTypeText)
    lockTypeText.textContent = lang[`lock-type-${currentLock}`] || currentLock;

  const currentBatchPhoto =
    localStorage.getItem("mori_batch_photo_mode") || "all";
  const batchPhotoModeText = document.getElementById("batchPhotoModeText");
  if (batchPhotoModeText)
    batchPhotoModeText.textContent =
      lang[`batch-photo-${currentBatchPhoto}`] || currentBatchPhoto;

  const currentBackup = localStorage.getItem("mori_auto_backup") || "off";
  const autoBackupText = document.getElementById("autoBackupText");
  if (autoBackupText) {
    if (currentBackup === "off")
      autoBackupText.textContent = lang["backup-off"] || "Off";
    else if (currentBackup === "7")
      autoBackupText.textContent = lang["backup-weekly"] || "Weekly (7 Days)";
    else if (currentBackup === "30")
      autoBackupText.textContent =
        lang["backup-monthly"] || "Monthly (30 Days)";
  }

  const currentAnimSpeed = localStorage.getItem("mori_anim_speed") || "normal";
  const animSpeedText = document.getElementById("animSpeedText");
  if (animSpeedText)
    animSpeedText.textContent =
      lang[`anim-${currentAnimSpeed}`] || currentAnimSpeed;

  const currentTextSize = localStorage.getItem("mori_text_size") || "medium";
  const textSizeText = document.getElementById("textSizeText");
  if (textSizeText)
    textSizeText.textContent =
      lang[`text-${currentTextSize}`] || currentTextSize;

  const currentConcurrent = localStorage.getItem("mori_concurrent") || "1";
  const concurrentText = document.getElementById("concurrentText");
  if (concurrentText)
    concurrentText.textContent =
      lang[`concurrent-${currentConcurrent}`] || currentConcurrent;

  const currentOverwrite = localStorage.getItem("mori_overwrite") || "rename";
  const overwriteText = document.getElementById("overwriteText");
  if (overwriteText)
    overwriteText.textContent =
      lang[`overwrite-${currentOverwrite}`] || currentOverwrite;

  const currentMaxRetry = localStorage.getItem("mori_max_retry") || "3";
  const maxRetryText = document.getElementById("maxRetryText");
  if (maxRetryText)
    maxRetryText.textContent =
      lang[`retry-${currentMaxRetry}`] || `${currentMaxRetry} Attempts`;

  const currentDoh = localStorage.getItem("mori_doh") || "off";
  const dohText = document.getElementById("dohText");
  if (dohText) dohText.textContent = lang[`doh-${currentDoh}`] || currentDoh;

  const currentToastDur = localStorage.getItem("mori_toast_dur") || "3";
  const toastDurText = document.getElementById("toastDurText");
  if (toastDurText)
    toastDurText.textContent =
      lang[`toast-dur-${currentToastDur}`] || `${currentToastDur}s`;

  const currentGlass = localStorage.getItem("mori_glassmorphism") || "subtle";
  const glassText = document.getElementById("glassText");
  if (glassText)
    glassText.textContent = lang[`glass-${currentGlass}`] || currentGlass;

  const currentCorner = localStorage.getItem("mori_ui_corner") || "modern";
  const cornerText = document.getElementById("cornerText");
  if (cornerText)
    cornerText.textContent = lang[`corner-${currentCorner}`] || currentCorner;

  const currentSoundPack = localStorage.getItem("mori_sound_pack") || "chime";
  const soundPackText = document.getElementById("soundPackText");
  if (soundPackText)
    soundPackText.textContent =
      lang[`sound-${currentSoundPack}`] || currentSoundPack;

  updateDlStatsDisplay();
}

export function updateLanguageUI() {
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
    const langNames = {
      en: "English",
      id: "Indonesia",
      ja: "日本語",
      ko: "한국어",
      zh: "中文 (简体)",
      ar: "العربية",
      ru: "Русский",
      tl: "Tagalog",
      hi: "हिन्दी",
    };
    currentLangDisplay.textContent = langNames[currentLang] || "English";
  }

  document.documentElement.lang = currentLang;
  document.documentElement.setAttribute(
    "dir",
    currentLang === "ar" ? "rtl" : "ltr",
  );

  updateCustomSelectsUI();
  updateGreeting();
  setUtilsState({ currentLang });
}

export function updateGreeting() {}

// Initial calls
checkAutoClearDays();
updateLanguageUI();
updateStorageInfo();

export function checkAutoClearDays() {
  const daysVal = localStorage.getItem("mori_auto_clear_days") || "off";
  if (daysVal === "off") return;
  const days = parseInt(daysVal, 10);
  if (isNaN(days) || days <= 0) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const initialCount = history.length;
  const filtered = history.filter((item) => {
    const time =
      item.timestamp || (item.date ? new Date(item.date).getTime() : 0);
    return time === 0 || time >= cutoff;
  });
  if (filtered.length !== initialCount) {
    localStorage.setItem("mori_history", JSON.stringify(filtered));
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

export function switchLanguage(lang) {
  setCurrentLang(lang);
  localStorage.setItem("mori_lang", lang);
  syncSettingToNative("mori_lang", lang);
  setUIState({ currentLang });
  setUtilsState({ currentLang });
  updateLanguageUI();
  updateGreeting();
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);

  let msg = "Language updated";
  if (currentLang === "id") msg = "Bahasa diperbarui";
  else if (currentLang === "ja") msg = "言語を更新しました";
  else if (currentLang === "ko") msg = "언어가 변경되었습니다";
  else if (currentLang === "zh") msg = "语言已更新";
  else if (currentLang === "ar") msg = "تم تحديث اللغة";
  else if (currentLang === "ru") msg = "Язык обновлен";
  else if (currentLang === "tl") msg = "Na-update ang wika";
  else if (currentLang === "hi") msg = "भाषा अपडेट हो गई";
  showToast(msg);
}

if (platformVal) {
  const tauriInvoke =
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke;
  const isDesktop = !!tauriInvoke && !window.Capacitor?.isNativePlatform?.();

  if (isDesktop) {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (ua.includes("mac")) {
      platformVal.textContent = "macOS";
    } else if (ua.includes("win")) {
      platformVal.textContent = "Windows";
    } else if (ua.includes("linux")) {
      platformVal.textContent = "Linux";
    } else {
      platformVal.textContent = "Desktop";
    }
  } else {
    const capPlatform = window.Capacitor?.getPlatform?.();
    if (capPlatform === "ios") {
      platformVal.textContent = "iOS";
    } else if (capPlatform === "android") {
      platformVal.textContent = "Android";
    } else {
      platformVal.textContent = "Web Browser";
    }
  }
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
  const whatsappUrl = `whatsapp://send?phone=6285194858996&text=${text}`;
  const whatsappWebUrl = `https://wa.me/6285194858996?text=${text}`;
  showToast(translations[currentLang]["label-opening-wa"]);
  if (window.Capacitor?.isNativePlatform?.()) {
    openExternalUrl(whatsappUrl);
  } else {
    openExternalUrl(whatsappWebUrl);
  }
});

// Settings Sub-page Navigation Handler
document.addEventListener("click", (e) => {
  const menuItem = e.target.closest(".settings-menu-item, [data-target]");
  if (menuItem) {
    const targetId = menuItem.getAttribute("data-target");
    if (targetId) {
      document
        .querySelectorAll(".settings-sub-page")
        .forEach((p) => p.classList.add("hidden"));
      const mainMenu = document.getElementById("settingsMainMenu");
      if (mainMenu) mainMenu.classList.add("hidden");
      const targetPage = document.getElementById(targetId);
      if (targetPage) targetPage.classList.remove("hidden");
    }
    return;
  }

  const backBtn = e.target.closest(".back-btn-settings");
  if (backBtn) {
    const backTarget = backBtn.getAttribute("data-back-target");
    document
      .querySelectorAll(".settings-sub-page")
      .forEach((p) => p.classList.add("hidden"));
    if (backTarget) {
      const targetPage = document.getElementById(backTarget);
      if (targetPage) targetPage.classList.remove("hidden");
    } else {
      const mainMenu = document.getElementById("settingsMainMenu");
      if (mainMenu) mainMenu.classList.remove("hidden");
    }
  }
});

// Sync settings to native storage on startup
syncAllSettingsToNative();
