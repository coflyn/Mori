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

import { translations } from "./i18n.js";

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

export function cleanUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Remove common tracking/referral params
    const trackerParams = [
      "igsh",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "s",
      "t",
    ];
    trackerParams.forEach((p) => u.searchParams.delete(p));

    if (u.hostname.includes("tiktok.com")) {
      u.search = ""; // TikTok usually has long tracking strings
    }

    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      // Keep "v" for youtube.com and everything for youtu.be paths
      if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
        const v = u.searchParams.get("v");
        u.search = "";
        u.searchParams.set("v", v);
      }
    } else if (!u.hostname.includes("facebook.com")) {
      // For most other platforms, strip query entirely for matching
      if (!u.searchParams.has("id") && !u.searchParams.has("story_fbid")) {
        u.search = "";
      }
    }

    return u.href.replace(/\/$/, "");
  } catch (e) {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

export function truncate(str, num = 80) {
  if (!str) return "";
  return str.length > num ? str.slice(0, num) + "..." : str;
}

// Toast Function
export async function showToast(message) {
  console.log("[TOAST]", message);
  if (Toast) {
    await Toast.show({ text: message, duration: "short", position: "bottom" });
  } else {
    const toastEl = document.createElement("div");
    toastEl.className = "custom-toast";
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.classList.add("show"), 10);
    setTimeout(() => {
      toastEl.classList.remove("show");
      setTimeout(() => toastEl.remove(), 300);
    }, 3000);
  }
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
    video.src = videoUri;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const timeout = setTimeout(() => {
      video.src = "";
      video.load();
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
        const scale = 0.5; // Scale down for smaller file size
        canvas.width = (video.videoWidth || 640) * scale;
        canvas.height = (video.videoHeight || 360) * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        clearTimeout(timeout);
        video.src = "";
        video.load();

        if (window.Capacitor?.isNativePlatform() && Filesystem) {
          const fileName = `thumb_${Date.now()}.jpg`;
          await Filesystem.writeFile({
            path: fileName,
            data: dataUrl.split(",")[1],
            directory: "CACHE",
          });
          resolve(fileName); // Return only filename to save in history
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        console.error("Canvas thumbnail error:", e);
        reject(e);
      }
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      console.error("Video thumbnail element error:", e);
      reject(new Error("Video error"));
    };

    video.load();
  });
}

export function playCompletionSound() {
  const isSoundEnabled = localStorage.getItem("mori_download_sound") !== "false";
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
      { freq: 783.99, time: now, duration: 0.14, gain: 0.35 },       // G5
      { freq: 1046.50, time: now + 0.09, duration: 0.16, gain: 0.4 }, // C6
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
  if (localStorage.getItem("mori_keep_awake") === "true" && "wakeLock" in navigator) {
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
