// nativeSync.js — native SharedPreferences bridge & platform inspection
import { platformVal } from "../core.js";

/**
 * Synchronizes a single Mori setting to Android SharedPreferences for background & share activities
 */
export function syncSettingToNative(key, val) {
  if (window.MoriMainBridge?.saveSetting) {
    try {
      window.MoriMainBridge.saveSetting(key, String(val));
    } catch (e) {
      console.error("syncSettingToNative error", e);
    }
  }
}

/**
 * Iterates through all core setting keys and syncs them to native SharedPreferences
 */
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

/**
 * Inspects device environment and updates the platform display label in settings
 */
export function initPlatformDisplay() {
  if (!platformVal) return;

  const capPlatform = window.Capacitor?.getPlatform?.();
  if (capPlatform === "ios") {
    platformVal.textContent = "iOS";
  } else if (capPlatform === "android") {
    platformVal.textContent = "Android";
  } else {
    platformVal.textContent = "Web Browser";
  }
}
