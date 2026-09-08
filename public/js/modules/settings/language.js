// language.js — localization, dropdown select engine, navigation, reset, and support
import { translations } from "../../i18n/index.js";
import { showToast, previewSound, setUtilsState } from "../../utils/index.js";
import { setUIState, renderHistory } from "../../ui.js";
import { showConfirm } from "../modals.js";
import { onHistoryItemClick, onHistoryDeleteClick } from "../history.js";
import {
  APP_VERSION,
  currentLang,
  setCurrentLang,
  currentLangDisplay,
  openExternalUrl,
  reportBugBtn,
  platformVal,
} from "../core.js";
import { syncSettingToNative } from "./nativeSync.js";
import {
  applyColorAccent,
  applyFont,
  applyAnimSpeed,
  applyTextSize,
  applyGlassmorphism,
  applyUiCorner,
} from "./appearance.js";
import { updateDlStatsDisplay } from "./storage.js";

/**
 * Custom Select Dropdown Engine
 */
export function setupCustomSelect(selectId, storageKey, textId, menuId) {
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
      menu.classList.remove("open-up");

      const rect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Flip upward if overflowing bottom
      if (rect.bottom > viewportHeight - 20) {
        menu.classList.add("open-up");
      }
    } else {
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
      menu.classList.remove("open-up");
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
  const lang = translations[currentLang] || translations["en"];
  const fallback = translations["en"] || {};
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = lang?.[key] ?? fallback[key];
    if (val !== undefined) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = lang?.[key] ?? fallback[key];
    if (val !== undefined) el.placeholder = val;
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

/**
 * Initializes dropdowns, navigation slide handlers, reset button, and bug reporting
 */
export function initLanguageAndNavigation() {
  // 1. Initialize Dropdowns
  setupCustomSelect("languageSelect", "mori_lang", "currentLangDisplay", "languageMenu");
  setupCustomSelect("filenameSelect", "mori_filename", "filenameText", "filenameMenu");
  setupCustomSelect("fontSelect", "mori_font", "fontText", "fontMenu");
  setupCustomSelect("historyLimitSelect", "mori_history_limit", "historyLimitText", "historyLimitMenu");
  setupCustomSelect("autoClearDaysSelect", "mori_auto_clear_days", "autoClearDaysText", "autoClearDaysMenu");
  setupCustomSelect("autoClearCacheDaysSelect", "mori_auto_clear_cache_days", "autoClearCacheDaysText", "autoClearCacheDaysMenu");
  setupCustomSelect("preferServerSelect", "mori_prefer_server", "preferServerText", "preferServerMenu");
  setupCustomSelect("batchPhotoModeSelect", "mori_batch_photo_mode", "batchPhotoModeText", "batchPhotoModeMenu");
  setupCustomSelect("userAgentSelect", "mori_user_agent", "userAgentText", "userAgentMenu");
  setupCustomSelect("requestTimeoutSelect", "mori_request_timeout", "requestTimeoutText", "requestTimeoutMenu");
  setupCustomSelect("animSpeedSelect", "mori_anim_speed", "animSpeedText", "animSpeedMenu");
  setupCustomSelect("textSizeSelect", "mori_text_size", "textSizeText", "textSizeMenu");
  setupCustomSelect("glassSelect", "mori_glassmorphism", "glassText", "glassMenu");
  setupCustomSelect("cornerSelect", "mori_ui_corner", "cornerText", "cornerMenu");
  setupCustomSelect("soundPackSelect", "mori_sound_pack", "soundPackText", "soundPackMenu");
  setupCustomSelect("concurrentSelect", "mori_concurrent", "concurrentText", "concurrentMenu");
  setupCustomSelect("overwriteSelect", "mori_overwrite", "overwriteText", "overwriteMenu");
  setupCustomSelect("maxRetrySelect", "mori_max_retry", "maxRetryText", "maxRetryMenu");
  setupCustomSelect("dohSelect", "mori_doh", "dohText", "dohMenu");
  setupCustomSelect("toastDurSelect", "mori_toast_dur", "toastDurText", "toastDurMenu");

  // 2. Sub-page Navigation
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

  // 3. Reset Settings Button
  const resetSettingsBtn = document.getElementById("resetSettingsBtn");
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", () => {
      const lang = translations[currentLang] || translations.en;
      showConfirm(
        lang["label-reset-settings"] || "Reset Settings",
        lang["confirm-reset-settings"] ||
          "Reset all settings to their defaults? This will not delete your history or downloaded files.",
        () => {
          const preserve = ["mori_history", "mori_dl_count", "mori_incognito"];
          const preserved = {};
          preserve.forEach((k) => {
            const v = localStorage.getItem(k);
            if (v !== null) preserved[k] = v;
          });
          Object.keys(localStorage)
            .filter((k) => k.startsWith("mori_"))
            .forEach((k) => localStorage.removeItem(k));
          Object.entries(preserved).forEach(([k, v]) =>
            localStorage.setItem(k, v),
          );
          showToast(lang["toast-reset-settings"] || "Settings reset to default");
          setTimeout(() => location.reload(), 800);
        },
      );
    });
  }

  // 4. Report Bug Button
  reportBugBtn?.addEventListener("click", () => {
    const deviceInfo = `Model: ${navigator.userAgent}\nPlatform: ${platformVal?.textContent || "Unknown"}\nVersion: ${APP_VERSION}`;
    const text = encodeURIComponent(
      `Hi coflyn, I found a bug in Mori App:\n\n[BUG DESCRIPTION HERE]\n\n---\nDevice Info:\n${deviceInfo}`,
    );
    const whatsappUrl = `whatsapp://send?phone=6285194858996&text=${text}`;
    const whatsappWebUrl = `https://wa.me/6285194858996?text=${text}`;
    const lang = translations[currentLang] || translations.en;
    showToast(lang["label-opening-wa"] || "Opening WhatsApp...");
    if (window.Capacitor?.isNativePlatform?.()) {
      openExternalUrl(whatsappUrl);
    } else {
      openExternalUrl(whatsappWebUrl);
    }
  });

  // 5. Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll(".settings-item.active-dropdown")
      .forEach((s) => s.classList.remove("active-dropdown"));
  });
}
