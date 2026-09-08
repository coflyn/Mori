// Device, OS & Hardware Helpers (Haptics, Clipboard, WakeLock, Network)

import { Haptics, Clipboard, Network } from "./plugins.js";
import { showToast, currentLang } from "./toast.js";
import { translations } from "../i18n/index.js";

// Haptic Feedback Helper
export async function triggerHaptic(type = "medium") {
  if (localStorage.getItem("mori_haptic") !== "true") return;
  try {
    const HapticsPlugin = window.Capacitor?.Plugins?.Haptics || Haptics;
    if (HapticsPlugin && window.Capacitor?.isNativePlatform?.()) {
      if (type === "notification" || type === "success") {
        await HapticsPlugin.notification({ type: "SUCCESS" }).catch(() => {});
        await HapticsPlugin.vibrate({ duration: 120 }).catch(() => {});
      } else if (type === "heavy") {
        await HapticsPlugin.impact({ style: "HEAVY" }).catch(() => {});
        await HapticsPlugin.vibrate({ duration: 80 }).catch(() => {});
      } else {
        await HapticsPlugin.impact({ style: "MEDIUM" }).catch(() => {});
        await HapticsPlugin.vibrate({ duration: 50 }).catch(() => {});
      }
    } else if (navigator.vibrate) {
      navigator.vibrate(type === "success" ? [50, 80, 50] : 40);
    }
  } catch (e) {
    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (err) {}
  }
}

// Clipboard Helper
export async function copyToClipboard(text) {
  try {
    if (window.Capacitor?.isNativePlatform?.() && Clipboard) {
      await Clipboard.write({ string: text });
    } else {
      await navigator.clipboard.writeText(text);
    }
    if (!window.Capacitor?.isNativePlatform?.()) {
      showToast(
        translations[currentLang]?.["toast-copy-success"] ||
          "Copied to clipboard",
      );
    }
  } catch (err) {
    console.error("Copy failed", err);
    showToast(
      translations[currentLang]?.["toast-copy-failed"] || "Copy failed",
    );
  }
}

// Network Status Helper
export async function getNetworkStatus() {
  const NetworkPlugin = window.Capacitor?.Plugins?.Network || Network;
  if (NetworkPlugin && typeof NetworkPlugin.getStatus === "function") {
    try {
      const status = await NetworkPlugin.getStatus();
      return status;
    } catch (e) {}
  }

  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (conn) {
    const type = (conn.type || "").toLowerCase();
    const effectiveType = (conn.effectiveType || "").toLowerCase();
    const isCellular =
      type === "cellular" ||
      type === "mobile" ||
      type.includes("2g") ||
      type.includes("3g") ||
      type.includes("4g") ||
      type.includes("5g") ||
      (type === "unknown" &&
        (effectiveType.includes("2g") ||
          effectiveType.includes("3g") ||
          effectiveType.includes("4g")));
    return {
      connected: navigator.onLine !== false,
      connectionType: isCellular
        ? "cellular"
        : type === "wifi"
          ? "wifi"
          : "unknown",
    };
  }

  return { connected: navigator.onLine !== false, connectionType: "unknown" };
}

export async function checkWifiOnlyGuard() {
  const isWifiOnly = localStorage.getItem("mori_wifi_only") === "true";
  if (!isWifiOnly) return true; // Allowed

  const status = await getNetworkStatus();
  if (status.connectionType !== "wifi") {
    showToast(
      translations[currentLang]?.["toast-wifi-needed"] ||
        "Wi-Fi connection required",
    );
    return false; // Blocked
  }
  return true; // Allowed
}

// Screen Wake Lock
let wakeLockSentinel = null;
export async function requestWakeLock(force = false) {
  if (
    (force || localStorage.getItem("mori_keep_awake") === "true") &&
    "wakeLock" in navigator
  ) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request("screen");
        console.log("[WAKE LOCK] Screen active lock acquired.");
      }
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
    }
  }
}

export async function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
    console.log("[WAKE LOCK] Screen active lock released.");
  }
}
