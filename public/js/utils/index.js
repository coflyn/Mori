export const {
  CapacitorHttp,
  Filesystem,
  Toast,
  Clipboard,
  App,
  Share,
  NativeBiometric,
  Media,
  Haptics,
} = window.Capacitor?.Plugins || {};

import { translations } from "../i18n/index.js";

export let currentLang = "en";
export function setUtilsState(state) {
  if (state.currentLang) currentLang = state.currentLang;
}

export const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

export const UA_PRESETS = {
  default: CHROME_UA,
  chrome:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export function getUserAgent() {
  const mode = localStorage.getItem("mori_user_agent") || "default";
  return UA_PRESETS[mode] || UA_PRESETS.default;
}

export function getCookiesFromHeaders(headers) {
  const raw = headers["Set-Cookie"] || headers["set-cookie"] || "";
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((c) => c.split(";")[0]).join("; ");
  return raw
    .split(",")
    .map((c) => c.trim().split(";")[0])
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
  if (raw.includes("get_progressApi")) {
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

  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  }, 2800);
}

// Floating Download Progress Toast
export function showDownloadProgressToast(platform, type) {
  const existing = document.body.querySelectorAll(".download-progress-toast");
  existing.forEach((el) => el.remove());

  const el = document.createElement("div");
  el.className = "download-progress-toast";
  el.innerHTML = `
    <div class="dpt-header">
      <span class="dpt-platform">${platform} · ${type}</span>
      <span class="dpt-percent">0%</span>
    </div>
    <div class="dpt-bar-track">
      <div class="dpt-bar-fill" id="dptBarFill"></div>
    </div>
    <div class="dpt-status">Preparing download...</div>
  `;
  document.body.appendChild(el);

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

  if (pct) pct.textContent = "Error";
  if (platform) platform.innerHTML = `Download Failed`;

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
  if (localStorage.getItem("mori_haptic") === "false") return;
  try {
    const HapticsPlugin = window.Capacitor?.Plugins?.Haptics || Haptics;
    if (HapticsPlugin && window.Capacitor?.isNativePlatform()) {
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
    if (window.Capacitor?.isNativePlatform() && Clipboard) {
      await Clipboard.write({ string: text });
    } else {
      await navigator.clipboard.writeText(text);
    }
    if (!window.Capacitor?.isNativePlatform()) {
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
    err.message?.includes("Network") ||
    err.message?.includes("fetch")
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

        if (window.Capacitor?.isNativePlatform() && Filesystem) {
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

export function playCompletionSound() {
  const isSoundEnabled =
    localStorage.getItem("mori_download_sound") !== "false";
  if (!isSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Ascending crisp 3-note chime (G5, C6, E6)
    const notes = [
      { freq: 783.99, time: now, duration: 0.14, gain: 0.35 }, // G5
      { freq: 1046.5, time: now + 0.09, duration: 0.16, gain: 0.4 }, // C6
      { freq: 1318.51, time: now + 0.18, duration: 0.38, gain: 0.45 }, // E6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, n.time);

      gain.gain.setValueAtTime(0, n.time);
      gain.gain.linearRampToValueAtTime(n.gain, n.time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, n.time + n.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(n.time);
      osc.stop(n.time + n.duration);
    });
  } catch (e) {
    console.warn("Audio Context error", e);
  }
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

export function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
    console.log("[WAKE LOCK] Screen active lock released.");
  }
}
