// settings.js — settings orchestrator and barrel facade
import {
  syncSettingToNative,
  syncAllSettingsToNative,
  initPlatformDisplay,
} from "./settings/nativeSync.js";
import {
  applyColorAccent,
  applyFont,
  applyAnimSpeed,
  applyTextSize,
  applyGlassmorphism,
  applyUiCorner,
  initAppearance,
} from "./settings/appearance.js";
import { initBehaviorSettings } from "./settings/behavior.js";
import {
  customPath,
  customMusicPath,
  updateDlStatsDisplay,
  checkAutoClearDays,
  getFolderSize,
  updateStorageInfo,
  clearCacheSilently,
  initStorageSettings,
} from "./settings/storage.js";
import {
  updateCustomSelectsUI,
  updateLanguageUI,
  updateGreeting,
  switchLanguage,
  initLanguageAndNavigation,
} from "./settings/language.js";

// Re-export all 19 public API symbols for complete backward compatibility
export {
  syncSettingToNative,
  syncAllSettingsToNative,
  applyColorAccent,
  updateDlStatsDisplay,
  applyAnimSpeed,
  applyTextSize,
  applyGlassmorphism,
  applyUiCorner,
  applyFont,
  customPath,
  customMusicPath,
  clearCacheSilently,
  updateCustomSelectsUI,
  updateLanguageUI,
  updateGreeting,
  checkAutoClearDays,
  getFolderSize,
  updateStorageInfo,
  switchLanguage,
};

// Orchestrate domain initializations on startup
initPlatformDisplay();
initAppearance();
initBehaviorSettings();
initStorageSettings();
initLanguageAndNavigation();

// Initial lifecycle checks and UI synchronizations
checkAutoClearDays();
updateLanguageUI();
updateStorageInfo();
syncAllSettingsToNative();
