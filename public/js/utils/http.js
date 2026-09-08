// HTTP, User-Agent, Scraper Payloads & Temp Files Helpers

import { Filesystem } from "./plugins.js";
import { showToast } from "./toast.js";

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

export function truncate(str, num = 80) {
  if (!str) return "";
  return str.length > num ? str.slice(0, num) + "..." : str;
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
