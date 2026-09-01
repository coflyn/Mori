export const CapacitorHttp = window.Capacitor?.Plugins?.CapacitorHttp;
export const Filesystem = window.Capacitor?.Plugins?.Filesystem;
export const Toast = window.Capacitor?.Plugins?.Toast;
export const Clipboard = window.Capacitor?.Plugins?.Clipboard;
export const App = window.Capacitor?.Plugins?.App;
export const Share = window.Capacitor?.Plugins?.Share;
export const NativeBiometric = window.Capacitor?.Plugins?.NativeBiometric;
export const Media = window.Capacitor?.Plugins?.Media;
export const Haptics = window.Capacitor?.Plugins?.Haptics;
export const Network = window.Capacitor?.Plugins?.Network;

import { translations } from "../i18n/index.js";

export let currentLang = "en";
export function setUtilsState(state) {
  if (state.currentLang) currentLang = state.currentLang;
}

export const CHROME_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
export const CHROME_MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

export const UA_PRESETS = {
  default: CHROME_UA,
  chrome: CHROME_UA,
  safari: CHROME_MOBILE_UA,
  desktop: CHROME_DESKTOP_UA,
};

export const SAFARI_MOBILE_UA = UA_PRESETS.safari;

export function getUserAgent() {
  const mode = localStorage.getItem("mori_user_agent") || "default";
  return UA_PRESETS[mode] || UA_PRESETS.default;
}

export function getCookiesFromHeaders(headers) {
  const raw = headers["Set-Cookie"] || headers["set-cookie"] || "";
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((c) => c.split(";")[0]).join("; ");
  return raw
    .split(/,(?=\s*[^;,=]+=[^;]*)/)
    .map((c) => c.trim().split(";")[0])
    .filter((c) => c && c.includes("="))
    .join("; ");
}

export function serializeData(obj) {
  return Object.keys(obj)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]))
    .join("&");
}

export function decodeSnapSave(data) {
  try {
    const regex =
      /eval\(function\(h,u,n,t,e,r\)\{.*?\}\("(.*?)",(\d+),"(.*?)",(\d+),(\d+),(\d+)\)\)/;
    const match = data.match(regex);
    if (match) {
      const h = match[1],
        u = parseInt(match[2]),
        n = match[3],
        t = parseInt(match[4]),
        e = parseInt(match[5]);
      const delimiter = n[e],
        parts = h.split(delimiter);
      let decoded = "";
      for (let s of parts) {
        if (s === "") continue;
        let val = 0;
        for (let j = 0; j < s.length; j++)
          val += n.indexOf(s[j]) * Math.pow(e, s.length - 1 - j);
        decoded += String.fromCharCode(val - t);
      }
      return decodeURIComponent(escape(decoded));
    }
    return data;
  } catch (err) {
    return data;
  }
}

export function extractFinalUrl(input) {
  if (!input) return null;
  let raw = input.trim().replace(/^["'\\]+|["'\\]+$/g, ""),
    isRender = false;
  if (raw.includes("get_progressApi") || raw.includes("get_progress")) {
    isRender = true;
    const tokenMatch = raw.match(/token=([^&'"]+)/);
    if (tokenMatch) raw = tokenMatch[1];
  }
  if (raw.includes(".") && !raw.startsWith("http")) {
    try {
      const payloadPart = raw.split(".")[1];
      if (payloadPart) {
        const payload = JSON.parse(atob(payloadPart));
        if (payload.video_url)
          return { url: payload.video_url, isRender: true };
        if (payload.url) return { url: payload.url, isRender: false };
      }
    } catch (e) {}
  }
  if (raw.startsWith("//")) return { url: "https:" + raw, isRender };
  if (raw.startsWith("/"))
    return { url: "https://snapsave.app" + raw, isRender };
  return { url: raw, isRender };
}

export { cleanUrl, extractCleanUrl, getCleanUrl } from "./urlUtils.js";

export function truncate(str, num = 80) {
  if (!str) return "";
  return str.length > num ? str.slice(0, num) + "..." : str;
}

export function autoClearInputBox() {
  if (localStorage.getItem("mori_auto_clear_input") === "true") {
    const urlInput = document.getElementById("urlInput");
    const batchUrlInput = document.getElementById("batchUrlInput");
    const clearBtn = document.getElementById("clearBtn");
    const pasteBtn = document.getElementById("pasteBtn");
    if (urlInput) urlInput.value = "";
    if (batchUrlInput) batchUrlInput.value = "";
    if (clearBtn) clearBtn.classList.add("hidden");
    if (pasteBtn) pasteBtn.classList.remove("hidden");
  }
}

// Toast Function
export async function showToast(message) {
  if (
    message &&
    (message.includes("Saved to") ||
      message.includes("Tersimpan di") ||
      message.includes("保存されました"))
  ) {
    return;
  }
  console.log("[TOAST]", message);
  triggerHaptic("light");

  const existingToasts = document.querySelectorAll(".custom-toast");
  existingToasts.forEach((t) => t.remove());

  const toastEl = document.createElement("div");
  toastEl.className = "custom-toast";
  toastEl.textContent = message;
  document.body.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.add("show");
  });

  const durSec = parseInt(localStorage.getItem("mori_toast_dur") || "3", 10);
  const durMs = durSec * 1000;
  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  }, durMs);
}

// Floating Download Progress Toast
export function showDownloadProgressToast(platform, type) {
  const existing = document.body.querySelectorAll(".download-progress-toast");
  existing.forEach((el) => el.remove());

  const el = document.createElement("div");
  el.className = "download-progress-toast";
  const cleanType = (type || "")
    .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
    .trim();
  el.innerHTML = `
    <div class="dpt-header">
      <span class="dpt-platform">${platform} · ${cleanType}</span>
      <span class="dpt-percent">0%</span>
    </div>
    <div class="dpt-bar-track">
      <div class="dpt-bar-fill" id="dptBarFill"></div>
    </div>
    <div class="dpt-status">Preparing download...</div>
    <button class="dpt-cancel-btn" id="dptCancelBtn">✕ CANCEL</button>
  `;
  document.body.appendChild(el);

  // Wire cancel button to the global cancel function
  const cancelBtn = el.querySelector("#dptCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (typeof window._moriCancelDownload === "function") {
        window._moriCancelDownload();
      }
    });
  }

  requestAnimationFrame(() => el.classList.add("show"));
}

export function updateDownloadProgressToast(percent, statusText) {
  const el = document.querySelector(".download-progress-toast");
  if (
    !el ||
    el.classList.contains("completed") ||
    el.classList.contains("failed")
  )
    return;

  const fill = el.querySelector(".dpt-bar-fill");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");

  if (typeof percent === "number" && !isNaN(percent)) {
    const safePercent = Math.min(100, Math.max(0, percent));
    if (fill) fill.style.width = `${safePercent}%`;
    if (pct) pct.textContent = `${safePercent}%`;
  }
  if (status && statusText) status.textContent = statusText;
}

export function completeDownloadProgressToast(
  titleText,
  subtitleText,
  autoDismissMs = 3000,
) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("completed");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const fill = el.querySelector(".dpt-bar-fill");
  const status = el.querySelector(".dpt-status");
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (fill) fill.style.width = "100%";
  if (pct) pct.textContent = "100%";
  if (platform) platform.innerHTML = `${titleText || "Saved Successfully"}`;
  if (status) status.textContent = subtitleText || "";

  triggerHaptic("success");

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function failDownloadProgressToast(errorText, autoDismissMs = 3500) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("failed");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");
  // Hide cancel button on failure
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (pct)
    pct.textContent = translations[currentLang]["label-error"] || "Error";
  if (platform)
    platform.innerHTML =
      translations[currentLang]["toast-download-failed"] || "Download Failed";

  let cleanErr = errorText || "Unknown error";
  if (cleanErr.includes("http://") || cleanErr.includes("https://")) {
    cleanErr = cleanErr.replace(/https?:\/\/[^\s]+/gi, (urlStr) => {
      try {
        const u = new URL(urlStr);
        return u.hostname || "server";
      } catch (e) {
        return "server";
      }
    });
  }

  if (status) status.textContent = cleanErr;

  triggerHaptic("heavy");

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function cancelDownloadProgressToast(autoDismissMs = 2000) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("cancelled");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (platform) platform.textContent = "Download Cancelled";
  if (pct) pct.textContent = "—";
  if (status) status.textContent = "";

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function hideDownloadProgressToast(delay = 800) {
  setTimeout(() => {
    const el = document.querySelector(".download-progress-toast");
    if (!el) return;
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, delay);
}

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
      showToast(translations[currentLang]["toast-copy-success"]);
    }
  } catch (err) {
    console.error("Copy failed", err);
    showToast(translations[currentLang]["toast-copy-failed"]);
  }
}

// Error Handling Helper
export function handleScrapeError(err, status = null) {
  let msg = "Something went wrong.";
  if (status === 403 || status === 429) {
    msg = "IP Blocked! Please use a VPN or mobile data.";
  } else if (
    err.message?.includes("Token") ||
    err.message?.includes("selector")
  ) {
    msg = "Scraper outdated. Please wait for an update.";
  } else if (
    err.message === "Failed to fetch" ||
    err.message?.includes("NetworkError") ||
    err.message?.includes("net::ERR_")
  ) {
    msg = "Network error. Check your connection.";
  } else if (err.message) {
    msg = err.message;
  }
  showToast(msg);
}

// Generate Thumbnail from Video
export async function getVideoThumbnail(videoUri) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearTimeout(timeout);
      try {
        video.removeEventListener("loadedmetadata", onMetadata);
        video.removeEventListener("durationchange", onMetadata);
        video.onseeked = null;
        video.onerror = null;
        if (video.src && video.src.startsWith("blob:")) {
          URL.revokeObjectURL(video.src);
        }
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        console.warn("Video cleanup warning:", e);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Thumbnail timeout"));
    }, 10000);

    const onMetadata = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration / 2;
        video.removeEventListener("loadedmetadata", onMetadata);
      } else {
        video.currentTime = 1;
      }
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("durationchange", onMetadata);

    video.onseeked = async () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = 0.5;
        canvas.width = (video.videoWidth || 640) * scale;
        canvas.height = (video.videoHeight || 360) * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);

        // Free canvas context references
        canvas.width = 0;
        canvas.height = 0;
        cleanup();

        if (window.Capacitor?.isNativePlatform?.() && Filesystem) {
          const fileName = `thumb_${Date.now()}.jpg`;
          await Filesystem.writeFile({
            path: fileName,
            data: dataUrl.split(",")[1],
            directory: "CACHE",
          });
          resolve(fileName);
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        cleanup();
        console.error("Canvas thumbnail error:", e);
        reject(e);
      }
    };

    video.onerror = (e) => {
      cleanup();
      console.error("Video thumbnail element error:", e);
      reject(new Error("Video error"));
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = videoUri;
    video.load();
  });
}

const CHIME_DATA_URI =
  "data:audio/wav;base64,UklGRhTBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfDAAAAAAAAAAgAFAAoADwAVABmAHQAhACUAJwApACoAKwAsACwALAAqACcAIAAWAA8ABwACAP7/9v/s/+b/4P/c/9n/2P/Y/9n/3P/g/+b/7P/3/wIAEwAoAD0AVgBuAIsApgDDAOQA+wETAicCSQJkAoACngK9AtkC9wIRAjACVAKGAq8CzAL2AiIDVwJ8AqoC0gLvAhgDTwJ4AqYCzgLyAhYDTgJ2AqcCzgLzAhcDTwJ2AqcCzALvAhYDSgJxAoICiQKPApQCmQKcApsCmQKVAI8AhQB3AGgAWABFAAwAh/++/+T/9v8ZAEsAcQCbAMAA4gAFAQ4BHwE2AVABbAGAAZQBqAG0AbcBuQG4AbUBsQGqAaEBkwGAAW0BVQE5AR4BCwEAAOz/0//D/7L/pP+d/5v/n/+q/7r/zf/h//X/CgAoAFEAdACfAMcA7gAVATcBWQF5AZ4BvAHVAPIA/wEJARgBHwEhAR8BGgEUAQkAAADp/8n/r/+N/33/c/9q/2j/af9t/3X/f/6Q/qL+tv7S/ub+9v78/vv+/f7//v/+f/6L/o/+nv6w/sf+2f7j/ub+6v7s/u3+8P70/vb+/P4BAAwAGwApADgASABSAFsAYQBmAGgAagBsAG0AbgBtAGwAawBpAGcAZABiAF4AWABRAEkAQAA3AC4AJgAeABYADgAGAP3/+/8BAP7/+/8AAAAA";

let unlockedAudioCtx = null;
export function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!unlockedAudioCtx) {
      unlockedAudioCtx = new AudioCtx();
    }
    if (unlockedAudioCtx.state === "suspended") {
      unlockedAudioCtx.resume().catch(() => {});
    }
  } catch (e) {}
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlockAudioContext();
  };
  window.addEventListener("click", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

export function playCompletionSound() {
  const isSoundEnabled =
    localStorage.getItem("mori_download_sound") !== "false";
  if (!isSoundEnabled) return;

  // Single clean chime playback via local audio asset
  try {
    const chimeEl = document.getElementById("completionChimeAudio");
    if (chimeEl) {
      chimeEl.currentTime = 0;
      chimeEl.volume = 1.0;
      const p = chimeEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          const a = new Audio("./chime.wav");
          a.volume = 1.0;
          a.play().catch(() => {});
        });
      }
    } else {
      const a = new Audio("./chime.wav");
      a.volume = 1.0;
      a.play().catch(() => {});
    }
  } catch (e) {}

  try {
    triggerHaptic("success");
  } catch (e) {}
}

export async function getNetworkStatus() {
  const NetworkPlugin = window.Capacitor?.Plugins?.Network;
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

let wakeLockSentinel = null;
export async function requestWakeLock() {
  if (
    localStorage.getItem("mori_keep_awake") === "true" &&
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

/**
 * Startup Cleanup: Cleans up any leftover .tmp download files from crash/unexpected shutdown
 */
export async function cleanupOrphanedTempFiles() {
  if (!Filesystem) return;
  const directoriesToTry = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
  const videoPath = `Download/${localStorage.getItem("mori_download_path") || "Mori"}`;
  const musicPath = `Download/${localStorage.getItem("mori_music_path") || "Mori/Music"}`;
  const platforms = [
    "",
    "/TikTok",
    "/Douyin",
    "/Instagram",
    "/YouTube",
    "/Twitter",
    "/Facebook",
    "/Pinterest",
    "/Spotify",
    "/AppleMusic",
    "/Threads",
    "/RedNote",
    "/Bilibili",
    "/Pixiv",
    "/Bandcamp",
    "/Other",
  ];

  for (const basePath of [videoPath, musicPath]) {
    for (const sub of platforms) {
      const fullFolder = `${basePath}${sub}`;
      for (const dir of directoriesToTry) {
        try {
          const res = await Filesystem.readdir({
            path: fullFolder,
            directory: dir,
          }).catch(() => null);
          if (res && res.files) {
            for (const file of res.files) {
              if (file.name && file.name.endsWith(".tmp")) {
                await Filesystem.deleteFile({
                  path: `${fullFolder}/${file.name}`,
                  directory: dir,
                }).catch(() => {});
                console.log(
                  `[STARTUP CLEANUP] Purged leftover temp file: ${file.name}`,
                );
              }
            }
          }
        } catch (e) {}
      }
    }
  }
}

/**
 * Safely pauses all active video and audio playback elements without destroying their src.
 * @param {HTMLElement|Document} rootEl - Container element or document
 */
export function pauseAllMedia(rootEl = document) {
  if (!rootEl) return;
  try {
    const mediaElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("video, audio")
      : [];
    mediaElements.forEach((el) => {
      try {
        el.pause();
      } catch (e) {}
    });
  } catch (err) {}
}

/**
 * Stops, pauses, and cleans up all active video and audio playback elements,
 * revoking Object URLs and executing container cleanup hooks.
 * @param {HTMLElement|Document} rootEl - Container element or document
 */
export function stopAllMedia(rootEl = document) {
  if (!rootEl) return;

  try {
    const mediaElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("video, audio")
      : [];

    mediaElements.forEach((el) => {
      try {
        el.pause();
        if (el.src && el.src.startsWith("blob:")) {
          URL.revokeObjectURL(el.src);
        }
        el.removeAttribute("src");
        el.load();
      } catch (e) {
        console.warn("Error pausing media element:", e);
      }
    });

    const cleanupElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("*")
      : [];
    cleanupElements.forEach((el) => {
      if (typeof el._cleanup === "function") {
        try {
          el._cleanup();
        } catch (e) {}
      }
    });
  } catch (err) {
    console.warn("stopAllMedia error:", err);
  }
}
