// behavior.js — switches, toggles, network options, and interaction feedback
import { translations, t } from "../../i18n/index.js";
import {
  showToast,
  triggerHaptic,
  requestWakeLock,
  releaseWakeLock,
  CapacitorHttp,
} from "../../utils/index.js";
import { renderHistory } from "../../ui.js";
import { onHistoryItemClick, onHistoryDeleteClick } from "../history.js";
import {
  currentLang,
  incognitoToggle,
  autoPasteToggle,
  dataSaverToggle,
  autoClearHistoryToggle,
  wifiOnlyToggle,
  autoDownloadToggle,
  autoPlayToggle,
  autoLoopToggle,
} from "../core.js";

/**
 * Initializes all behavior toggles, hardware options, and interaction feedback
 */
export function initBehaviorSettings() {
  // Incognito Mode
  if (incognitoToggle) {
    incognitoToggle.checked = localStorage.getItem("mori_incognito") === "true";
    incognitoToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_incognito", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-incognito-on"] || "Incognito mode enabled"
          : lang["toast-incognito-off"] || "Incognito mode disabled",
      );
    });
  }

  // Auto-Paste Toggle
  if (autoPasteToggle) {
    autoPasteToggle.checked =
      localStorage.getItem("mori_auto_paste") !== "false";
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

  // Data Saver Mode
  if (dataSaverToggle) {
    dataSaverToggle.checked =
      localStorage.getItem("mori_data_saver") === "true";
    dataSaverToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_data_saver", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-datasaver-on"] || "Data saver enabled"
          : lang["toast-datasaver-off"] || "Data saver disabled",
      );
      renderHistory(onHistoryItemClick, onHistoryDeleteClick);
    });
  }

  // Auto-Clear History Toggle
  if (autoClearHistoryToggle) {
    autoClearHistoryToggle.checked =
      localStorage.getItem("mori_autoclear_history") === "true";
    autoClearHistoryToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_autoclear_history", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-autoclear-history-on"] || "Auto-clear history enabled"
          : lang["toast-autoclear-history-off"] ||
              "Auto-clear history disabled",
      );
    });
  }

  // Wi-Fi Only
  if (wifiOnlyToggle) {
    wifiOnlyToggle.checked = localStorage.getItem("mori_wifi_only") === "true";
    wifiOnlyToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_wifi_only", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-wifi-on"] || "Wi-Fi only mode enabled"
          : lang["toast-wifi-off"] || "Wi-Fi only mode disabled",
      );
    });
  }

  // Auto-Download Toggle
  if (autoDownloadToggle) {
    autoDownloadToggle.checked =
      localStorage.getItem("mori_auto_download") === "true";
    autoDownloadToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_auto_download", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-autodownload-on"] || "Auto-download enabled"
          : lang["toast-autodownload-off"] || "Auto-download disabled",
      );
    });
  }

  // Auto-Analyze Toggle
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

  // Auto-Clear Input
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

  // Download Sound & Sound Pack Visibility
  const downloadSoundToggle = document.getElementById("downloadSoundToggle");
  const soundPackItem = document.getElementById("soundPackItem");

  const updateSoundPackVisibility = () => {
    if (!soundPackItem) return;
    const isSoundEnabled =
      localStorage.getItem("mori_download_sound") !== "false";
    soundPackItem.style.display = isSoundEnabled ? "flex" : "none";
  };
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

  // Auto-Retry Toggle
  const autoRetryToggle = document.getElementById("autoRetryToggle");
  if (autoRetryToggle) {
    autoRetryToggle.checked =
      localStorage.getItem("mori_auto_retry") !== "false";
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

  // Haptic Toggle
  const isNativePlatform = window.Capacitor?.isNativePlatform?.();
  const hapticToggle = document.getElementById("hapticToggle");
  if (!isNativePlatform) {
    const hapticItem = hapticToggle?.closest(".settings-item");
    if (hapticItem) hapticItem.style.display = "none";
  }
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

  // Auto-Folder Subfolders
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

  // Keep Screen Awake
  const keepAwakeToggle = document.getElementById("keepAwakeToggle");
  if (keepAwakeToggle) {
    keepAwakeToggle.checked =
      localStorage.getItem("mori_keep_awake") === "true";
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

  // Auto-Update Check Toggle
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

  // Force IPv4
  const forceIpv4Toggle = document.getElementById("forceIpv4Toggle");
  if (forceIpv4Toggle) {
    forceIpv4Toggle.checked =
      localStorage.getItem("mori_force_ipv4") === "true";
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

  // Header Spoofing (Anti-403) Toggle
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

  // Cellular Warning Toggle
  const cellularWarningToggle = document.getElementById(
    "cellularWarningToggle",
  );
  if (cellularWarningToggle) {
    cellularWarningToggle.checked =
      localStorage.getItem("mori_cellular_warning") === "true";
    cellularWarningToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_cellular_warning", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-cellularwarning-on"] || "Cellular data warning enabled"
          : lang["toast-cellularwarning-off"] ||
              "Cellular data warning disabled",
      );
    });
  }

  // Bypass SSL
  const bypassSslToggle = document.getElementById("bypassSslToggle");
  if (bypassSslToggle) {
    bypassSslToggle.checked =
      localStorage.getItem("mori_bypass_ssl") === "true";
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

  // Hide Progress
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

  // Latency Test Button
  const testLatencyBtn = document.getElementById("testLatencyBtn");
  if (testLatencyBtn) {
    testLatencyBtn.addEventListener("click", async () => {
      const resultVal = document.getElementById("latencyResultVal");
      if (resultVal) resultVal.textContent = "...";
      showToast(t("toast-latency-testing"));
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
        showToast(t("toast-latency-result", { duration }));
      } catch (_) {
        if (resultVal) resultVal.textContent = "Error";
        showToast(t("toast-latency-failed"));
      }
    });
  }

  // Auto-Play and Auto-Loop Toggles
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

  // Haptic Feedback for Interactive Elements
  document.addEventListener("click", (e) => {
    const interactive = e.target.closest(
      "button, .nav-item, .settings-item, .toggle-switch, .dropdown-item, .paste-btn, .clear-btn, .chip",
    );
    if (interactive) {
      triggerHaptic("medium");
    }
  });
}
