import fs from "fs";
import os from "os";
import path from "path";
import { exec, execSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { DOMParser } from "linkedom";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// 1. Polyfill browser / native globals for scraper bundle
globalThis.window = globalThis;
globalThis.DOMParser = DOMParser;

const mockStorage = new Map([
  ["mori_request_timeout", "30"],
  ["mori_header_spoofing", "true"],
  ["mori_bypass_ssl", "false"],
  ["mori_force_ipv4", "false"],
  ["mori_doh", "off"],
]);

globalThis.localStorage = {
  getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

const CHROME_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const CHROME_MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
export const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

function getUserAgent() {
  return CHROME_UA;
}

function getCookiesFromHeaders(headers) {
  const raw = headers["Set-Cookie"] || headers["set-cookie"] || "";
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((c) => c.split(";")[0]).join("; ");
  return raw
    .split(/,(?=\s*[^;,=]+=[^;]*)/)
    .map((c) => c.trim().split(";")[0])
    .filter((c) => c && c.includes("="))
    .join("; ");
}

function serializeData(obj) {
  return Object.keys(obj)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]))
    .join("&");
}

function cleanUrl(u) {
  return u ? u.split("?")[0] : "";
}

const SAFARI_MOBILE_UA = CHROME_MOBILE_UA;

function decodeSnapSave(data) {
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
      try {
        return decodeURIComponent(escape(decoded));
      } catch {
        return Buffer.from(decoded, "binary").toString("utf-8");
      }
    }
    return data;
  } catch (err) {
    return data;
  }
}

function extractFinalUrl(input) {
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
        const payload = JSON.parse(
          Buffer.from(payloadPart, "base64").toString("utf-8")
        );
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

globalThis.window.__moriDeps = {
  utils: {
    CHROME_UA,
    CHROME_DESKTOP_UA,
    CHROME_MOBILE_UA,
    SAFARI_MOBILE_UA,
    getUserAgent,
    cleanUrl,
    getCookiesFromHeaders,
    serializeData,
    decodeSnapSave,
    extractFinalUrl,
  },
  urlUtils: {
    getCleanUrl: (u) => (u ? u.trim() : ""),
    cleanUrl,
    extractCleanUrl: (text) => {
      if (!text || typeof text !== "string") return "";
      const match = text.match(/https?:\/\/[^\s]+/i);
      return match ? match[0] : text.trim();
    },
  },
  core: {
    t: (k) => k,
  },
};

// 2. Persistent User Configuration & History
export const CONFIG_DIR = path.join(os.homedir(), ".mori");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const HISTORY_PATH = path.join(CONFIG_DIR, "history.json");
export const DEFAULT_DOWNLOAD_DIR = path.join(
  os.homedir(),
  "Downloads",
  "Mori",
);

export function getSavedConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch (_) {}
  }
  return {};
}

export function saveConfig(updates) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const current = getSavedConfig();
  const merged = { ...current, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function openDirectory(dirPath) {
  const plat = process.platform;
  const cmd =
    plat === "darwin"
      ? `open "${dirPath}"`
      : plat === "win32"
        ? `start "" "${dirPath}"`
        : `xdg-open "${dirPath}"`;
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

export function readClipboard() {
  const plat = process.platform;
  let cmd = "";
  if (plat === "darwin") {
    cmd = "pbpaste";
  } else if (plat === "win32") {
    cmd = 'powershell.exe -NoProfile -Command "Get-Clipboard"';
  } else {
    cmd =
      "which wl-paste >/dev/null 2>&1 && wl-paste || xclip -selection clipboard -o 2>/dev/null || xsel -b -o 2>/dev/null";
  }
  return new Promise((resolve) => {
    exec(cmd, { encoding: "utf8", timeout: 2000 }, (err, stdout) => {
      if (err || !stdout) return resolve("");
      resolve(stdout.trim());
    });
  });
}

export function writeClipboard(text) {
  if (!text) return Promise.resolve(false);
  const plat = process.platform;
  return new Promise((resolve) => {
    let proc;
    if (plat === "darwin") {
      proc = exec("pbcopy", (err) => resolve(!err));
    } else if (plat === "win32") {
      proc = exec("clip", (err) => resolve(!err));
    } else {
      proc = exec(
        "which wl-copy >/dev/null 2>&1 && wl-copy || xclip -selection clipboard 2>/dev/null || xsel -b -i 2>/dev/null",
        (err) => resolve(!err),
      );
    }
    if (proc && proc.stdin) {
      proc.stdin.write(String(text));
      proc.stdin.end();
    } else {
      resolve(false);
    }
  });
}

export function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

export function getNonCollidingPath(dir, filename) {
  let fullPath = path.join(dir, filename);
  if (!fs.existsSync(fullPath)) return fullPath;

  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  let count = 1;
  while (fs.existsSync(path.join(dir, `${name}_${count}${ext}`))) {
    count++;
  }
  return path.join(dir, `${name}_${count}${ext}`);
}

export function extractUrls(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  return [...new Set(matches)];
}

export function getHistory(limit = 15) {
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      const list = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
      return Array.isArray(list) ? list.slice(0, limit) : [];
    } catch (_) {}
  }
  return [];
}

export function addToHistory(item) {
  try {
    const list = getHistory(100);
    const record = {
      url: item.url || "",
      title: item.title || "Untitled",
      platform: item.platform || "Unknown",
      filename: item.filename || "",
      path: item.path || "",
      bytes: item.bytes || 0,
      timestamp: Date.now(),
    };
    list.unshift(record);
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(
      HISTORY_PATH,
      JSON.stringify(list.slice(0, 100), null, 2),
      "utf8",
    );
  } catch (_) {}
}

export function clearHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      fs.unlinkSync(HISTORY_PATH);
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function deleteHistoryItems(indices, deleteFile = true) {
  try {
    const list = getHistory(200);
    const sortedIndices = [...new Set(indices)].sort((a, b) => b - a);
    const deletedItems = [];
    let filesDeletedCount = 0;

    for (const idx of sortedIndices) {
      if (idx >= 0 && idx < list.length) {
        const [removed] = list.splice(idx, 1);
        let fileDeleted = false;
        if (deleteFile && removed.path && fs.existsSync(removed.path)) {
          try {
            fs.unlinkSync(removed.path);
            fileDeleted = true;
            filesDeletedCount++;
          } catch (_) {}
        }
        deletedItems.push({ item: removed, fileDeleted });
      }
    }

    fs.writeFileSync(HISTORY_PATH, JSON.stringify(list, null, 2), "utf8");

    return {
      success: true,
      count: deletedItems.length,
      filesDeletedCount,
      deletedItems,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function deleteHistoryItem(index, deleteFile = true) {
  const res = deleteHistoryItems([index], deleteFile);
  if (!res.success) return res;
  return {
    success: true,
    item: res.deletedItems[0]?.item,
    fileDeleted: res.deletedItems[0]?.fileDeleted || false,
  };
}

export function getStats() {
  const items = getHistory(200);
  const totalDownloads = items.length;
  const platformCounts = {};
  let totalBytes = 0;

  for (const item of items) {
    const plat = (item.platform || "unknown").toLowerCase();
    platformCounts[plat] = (platformCounts[plat] || 0) + 1;
    if (item.bytes && typeof item.bytes === "number") {
      totalBytes += item.bytes;
    } else if (item.path && fs.existsSync(item.path)) {
      try {
        totalBytes += fs.statSync(item.path).size;
      } catch (_) {}
    }
  }

  let topPlatform = "-";
  let maxCount = 0;
  for (const [p, c] of Object.entries(platformCounts)) {
    if (c > maxCount) {
      maxCount = c;
      topPlatform = p;
    }
  }

  return {
    totalDownloads,
    totalBytes,
    topPlatform,
    platformCounts,
  };
}

// 3. OTA Hot-Patching Engine (Mori Core + Scrapr Engine)
const GITHUB_REPO = "coflyn/Mori";
const OTA_DIR = CONFIG_DIR;
export const OTA_BUNDLE_PATH = path.join(OTA_DIR, "scrapers-bundle.js");
export const OTA_META_PATH = path.join(OTA_DIR, "scrapers-meta.json");

export const SCRAPR_DIR = path.join(CONFIG_DIR, "scrapr");
export const SCRAPR_BUNDLE_PATH = path.join(SCRAPR_DIR, "scrapr-bundle.cjs");
export const SCRAPR_META_PATH = path.join(SCRAPR_DIR, "version.json");
export const SCRAPR_VERSION_URL =
  "https://raw.githubusercontent.com/coflyn/scrapr/main/package.json";
export const SCRAPR_BUNDLE_URL =
  "https://raw.githubusercontent.com/coflyn/scrapr/main/bundle.cjs";
const SCRAPR_FALLBACK_VERSION = "1.3.1";

export function isNewerSemver(latest, current) {
  if (!latest || !current) return false;
  const l = String(latest).replace(/^v/, "").split(".").map(Number);
  const c = String(current).replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const lPart = l[i] || 0;
    const cPart = c[i] || 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}

export function resetMori() {
  const filesToDelete = [
    CONFIG_PATH,
    HISTORY_PATH,
    OTA_BUNDLE_PATH,
    OTA_META_PATH,
    SCRAPR_BUNDLE_PATH,
    SCRAPR_META_PATH,
  ];
  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch (_) {}
    }
  }
}

export const OTA_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/scrapers-version.json`;
export const OTA_BUNDLE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/js/scrapers/bundle.js`;

export function isMoriInstalled() {
  return fs.existsSync(OTA_BUNDLE_PATH);
}

export function isScraprInstalled() {
  return fs.existsSync(SCRAPR_BUNDLE_PATH);
}

export function getActiveScraperVersion() {
  if (fs.existsSync(OTA_META_PATH)) {
    try {
      const meta = JSON.parse(fs.readFileSync(OTA_META_PATH, "utf8"));
      return meta.scraperVersion || null;
    } catch (_) {}
  }
  return null;
}

export function getActiveScraprVersion() {
  if (fs.existsSync(SCRAPR_META_PATH)) {
    try {
      const meta = JSON.parse(fs.readFileSync(SCRAPR_META_PATH, "utf8"));
      return meta.version || null;
    } catch (_) {}
  }
  return null;
}

/**
 * Downloads and installs Mori Core Engine into ~/.mori/
 */
export async function downloadMoriEngine(onProgress) {
  if (onProgress) onProgress("Fetching Mori version metadata...");
  const metaRes = await fetch(OTA_VERSION_URL, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
  });
  if (!metaRes.ok) throw new Error(`Failed to fetch Mori version (HTTP ${metaRes.status})`);
  const meta = await metaRes.json();

  if (onProgress) onProgress("Downloading Mori Engine bundle (~80 KB)...");
  const bundleRes = await fetch(OTA_BUNDLE_URL, {
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
  });
  if (!bundleRes.ok) throw new Error(`Failed to download Mori bundle (HTTP ${bundleRes.status})`);
  const bundleText = await bundleRes.text();
  if (!bundleText || bundleText.length < 5000) {
    throw new Error("Invalid Mori bundle payload received.");
  }

  if (!fs.existsSync(OTA_DIR)) {
    fs.mkdirSync(OTA_DIR, { recursive: true });
  }

  fs.writeFileSync(OTA_BUNDLE_PATH, bundleText, "utf8");
  fs.writeFileSync(
    OTA_META_PATH,
    JSON.stringify(
      {
        scraperVersion: meta.scraperVersion || "1.0.0",
        updatedAt: Date.now(),
        sourceHash: meta.sourceHash || "",
        changelog: meta.changelog || "",
      },
      null,
      2,
    ),
    "utf8",
  );

  cachedMoriScrapers = null;
  return { success: true, version: meta.scraperVersion || "1.0.0" };
}

/**
 * Downloads and installs Scrapr Engine into ~/.mori/scrapr/
 */
export async function downloadScraprEngine(onProgress) {
  if (onProgress) onProgress("Fetching Scrapr metadata...");
  let version = SCRAPR_FALLBACK_VERSION;
  try {
    const metaRes = await fetch(SCRAPR_VERSION_URL, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.version) version = meta.version;
    }
  } catch (_) {}

  if (onProgress) onProgress("Downloading Scrapr Engine bundle (~2.7 MB)...");
  let bundleText = "";

  // 1. Try remote GitHub raw URL
  try {
    const bundleRes = await fetch(SCRAPR_BUNDLE_URL, {
      signal: AbortSignal.timeout(45000),
      headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
    });
    if (bundleRes.ok) {
      bundleText = await bundleRes.text();
    }
  } catch (_) {}

  // 2. Local fallback during development if remote is not yet pushed
  if (!bundleText || bundleText.length < 50000) {
    const localDevScrapr = path.resolve(__dirname, "../../../scrapr/bundle.cjs");
    if (fs.existsSync(localDevScrapr)) {
      bundleText = fs.readFileSync(localDevScrapr, "utf8");
    }
  }

  if (!bundleText || bundleText.length < 50000) {
    throw new Error(
      "Failed to download Scrapr bundle. Ensure bundle.cjs is published or pushed to coflyn/scrapr.",
    );
  }

  if (!fs.existsSync(SCRAPR_DIR)) {
    fs.mkdirSync(SCRAPR_DIR, { recursive: true });
  }

  fs.writeFileSync(SCRAPR_BUNDLE_PATH, bundleText, "utf8");
  fs.writeFileSync(
    SCRAPR_META_PATH,
    JSON.stringify(
      {
        version,
        updatedAt: Date.now(),
      },
      null,
      2,
    ),
    "utf8",
  );

  cachedScrapr = null;
  return { success: true, version };
}

export function uninstallMoriEngine() {
  if (fs.existsSync(OTA_BUNDLE_PATH)) {
    try { fs.unlinkSync(OTA_BUNDLE_PATH); } catch (_) {}
  }
  if (fs.existsSync(OTA_META_PATH)) {
    try { fs.unlinkSync(OTA_META_PATH); } catch (_) {}
  }
  cachedMoriScrapers = null;
  return true;
}

export function uninstallScraprEngine() {
  if (fs.existsSync(SCRAPR_BUNDLE_PATH)) {
    try { fs.unlinkSync(SCRAPR_BUNDLE_PATH); } catch (_) {}
  }
  if (fs.existsSync(SCRAPR_META_PATH)) {
    try { fs.unlinkSync(SCRAPR_META_PATH); } catch (_) {}
  }
  cachedScrapr = null;
  return true;
}

export async function fetchMoriEngineHistory() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?path=public/js/scrapers/bundle.js&per_page=15`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mori-CLI" },
      },
    );
    if (!res.ok) return [];
    const commits = await res.json();
    if (!Array.isArray(commits)) return [];
    return commits.map((c) => ({
      sha: c.sha.slice(0, 7),
      fullSha: c.sha,
      message: (c.commit?.message || "").split("\n")[0].trim(),
      date: c.commit?.author?.date || "",
    }));
  } catch (_) {
    return [];
  }
}

export async function downloadMoriEngineByCommit(commitSha, onProgress) {
  const shortSha = commitSha.slice(0, 7);
  if (onProgress) onProgress(`Fetching Mori Core bundle at commit ${shortSha}...`);

  const bundleUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${commitSha}/public/js/scrapers/bundle.js`;
  const metaUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${commitSha}/public/scrapers-version.json`;

  const [bundleRes, metaRes] = await Promise.all([
    fetch(bundleUrl, {
      signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
    }),
    fetch(metaUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
    }).catch(() => null),
  ]);

  if (!bundleRes.ok) {
    throw new Error(`Failed to fetch bundle at commit ${shortSha}: HTTP ${bundleRes.status}`);
  }

  const bundleText = await bundleRes.text();
  if (!bundleText || bundleText.length < 5000) {
    throw new Error("Downloaded bundle is empty or invalid.");
  }

  let meta = { scraperVersion: shortSha };
  if (metaRes && metaRes.ok) {
    try {
      meta = await metaRes.json();
    } catch (_) {}
  }

  if (!fs.existsSync(OTA_DIR)) {
    fs.mkdirSync(OTA_DIR, { recursive: true });
  }

  fs.writeFileSync(OTA_BUNDLE_PATH, bundleText, "utf8");
  fs.writeFileSync(
    OTA_META_PATH,
    JSON.stringify(
      {
        scraperVersion: meta.scraperVersion || shortSha,
        updatedAt: Date.now(),
        sourceHash: meta.sourceHash || "",
        changelog: meta.changelog || "",
        commitSha: shortSha,
      },
      null,
      2,
    ),
    "utf8",
  );

  cachedMoriScrapers = null;
  return { success: true, version: meta.scraperVersion || shortSha };
}

export async function fetchScraprEngineVersions() {
  try {
    const res = await fetch("https://registry.npmjs.org/@coflyn/scrapr", {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mori-CLI" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const versions = Object.keys(data.versions || {});
    return versions.reverse();
  } catch (_) {
    return [];
  }
}

export async function downloadScraprEngineVersion(targetVersion, onProgress) {
  if (onProgress) onProgress(`Downloading Scrapr Engine v${targetVersion}...`);
  let bundleText = "";

  const urls = [
    `https://unpkg.com/@coflyn/scrapr@${targetVersion}/bundle.cjs`,
    `https://cdn.jsdelivr.net/npm/@coflyn/scrapr@${targetVersion}/bundle.cjs`,
    `https://raw.githubusercontent.com/coflyn/scrapr/v${targetVersion}/bundle.cjs`,
    `https://raw.githubusercontent.com/coflyn/scrapr/main/bundle.cjs`,
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        signal: AbortSignal.timeout(30000),
        headers: { "User-Agent": "Mori-CLI", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        bundleText = await res.text();
        if (bundleText && bundleText.length > 50000) break;
      }
    } catch (_) {}
  }

  if (!bundleText || bundleText.length < 50000) {
    const localDevScrapr = path.resolve(__dirname, "../../../scrapr/bundle.cjs");
    if (fs.existsSync(localDevScrapr)) {
      bundleText = fs.readFileSync(localDevScrapr, "utf8");
    }
  }

  if (!bundleText || bundleText.length < 50000) {
    throw new Error(`Failed to download Scrapr v${targetVersion} bundle.`);
  }

  if (!fs.existsSync(SCRAPR_DIR)) {
    fs.mkdirSync(SCRAPR_DIR, { recursive: true });
  }

  fs.writeFileSync(SCRAPR_BUNDLE_PATH, bundleText, "utf8");
  fs.writeFileSync(
    SCRAPR_META_PATH,
    JSON.stringify(
      {
        version: targetVersion,
        updatedAt: Date.now(),
      },
      null,
      2,
    ),
    "utf8",
  );

  cachedScrapr = null;
  return { success: true, version: targetVersion };
}

/**
 * Checks for Mori Core OTA updates from GitHub raw.
 */
export async function checkForOtaUpdate(force = false) {
  if (!isMoriInstalled()) {
    return { updated: false, notInstalled: true };
  }
  try {
    const metaRes = await fetch(OTA_VERSION_URL, {
      signal: AbortSignal.timeout(force ? 8000 : 2500),
      headers: { "User-Agent": "Mori-CLI-OTA", "Cache-Control": "no-cache" },
    });
    if (!metaRes.ok) return { updated: false, reason: "Fetch error" };

    const remoteMeta = await metaRes.json();
    const currentVer = getActiveScraperVersion();

    if (remoteMeta.scraperVersion && remoteMeta.scraperVersion > currentVer) {
      const bundleRes = await fetch(OTA_BUNDLE_URL, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mori-CLI-OTA", "Cache-Control": "no-cache" },
      });
      if (!bundleRes.ok)
        return { updated: false, reason: "Bundle download error" };

      const bundleText = await bundleRes.text();
      if (!bundleText || bundleText.length < 5000) {
        return { updated: false, reason: "Invalid bundle payload" };
      }

      if (!fs.existsSync(OTA_DIR)) {
        fs.mkdirSync(OTA_DIR, { recursive: true });
      }

      fs.writeFileSync(OTA_BUNDLE_PATH, bundleText, "utf8");
      fs.writeFileSync(
        OTA_META_PATH,
        JSON.stringify(
          {
            scraperVersion: remoteMeta.scraperVersion,
            updatedAt: Date.now(),
            sourceHash: remoteMeta.sourceHash || "",
            changelog: remoteMeta.changelog || "",
          },
          null,
          2,
        ),
        "utf8",
      );

      cachedMoriScrapers = null;

      return {
        updated: true,
        oldVersion: currentVer,
        newVersion: remoteMeta.scraperVersion,
        changelog: remoteMeta.changelog || "",
      };
    }

    return { updated: false, currentVersion: currentVer, latest: true };
  } catch (err) {
    if (force) throw err;
    return { updated: false, error: err.message };
  }
}

/**
 * Checks for Scrapr Engine OTA updates from GitHub raw.
 */
export async function checkForScraprOtaUpdate(force = false) {
  if (!isScraprInstalled()) {
    return { updated: false, notInstalled: true };
  }
  try {
    const metaRes = await fetch(SCRAPR_VERSION_URL, {
      signal: AbortSignal.timeout(force ? 8000 : 2500),
      headers: { "User-Agent": "Mori-CLI-OTA", "Cache-Control": "no-cache" },
    });
    if (!metaRes.ok) return { updated: false, reason: "Fetch error" };

    const remoteMeta = await metaRes.json();
    const currentVer = getActiveScraprVersion();

    if (remoteMeta.version && isNewerSemver(remoteMeta.version, currentVer)) {
      const bundleRes = await fetch(SCRAPR_BUNDLE_URL, {
        signal: AbortSignal.timeout(30000),
        headers: { "User-Agent": "Mori-CLI-OTA", "Cache-Control": "no-cache" },
      });
      if (!bundleRes.ok)
        return { updated: false, reason: "Scrapr bundle download error" };

      const bundleText = await bundleRes.text();
      if (!bundleText || bundleText.length < 50000) {
        return { updated: false, reason: "Invalid Scrapr bundle payload" };
      }

      if (!fs.existsSync(SCRAPR_DIR)) {
        fs.mkdirSync(SCRAPR_DIR, { recursive: true });
      }

      fs.writeFileSync(SCRAPR_BUNDLE_PATH, bundleText, "utf8");
      fs.writeFileSync(
        SCRAPR_META_PATH,
        JSON.stringify(
          {
            version: remoteMeta.version,
            updatedAt: Date.now(),
          },
          null,
          2,
        ),
        "utf8",
      );

      cachedScrapr = null;

      return {
        updated: true,
        oldVersion: currentVer,
        newVersion: remoteMeta.version,
      };
    }

    return { updated: false, currentVersion: currentVer, latest: true };
  } catch (err) {
    if (force) throw err;
    return { updated: false, error: err.message };
  }
}

// 3. Load Scraper Core (Mori Engine)
let cachedMoriScrapers = null;

export function loadScraperEngine() {
  if (cachedMoriScrapers) return cachedMoriScrapers;

  const localBundlePath = path.join(__dirname, "bundle.js");
  const rootBundlePath = path.join(ROOT_DIR, "public/js/scrapers/bundle.js");

  // Priority 1: ~/.mori/scrapers-bundle.js
  if (fs.existsSync(OTA_BUNDLE_PATH)) {
    try {
      const patchCode = fs.readFileSync(OTA_BUNDLE_PATH, "utf8");
      (0, eval)(patchCode);
      if (globalThis.__MoriCoreScrapers) {
        cachedMoriScrapers = globalThis.__MoriCoreScrapers;
        return cachedMoriScrapers;
      }
    } catch (_) {
      try {
        fs.unlinkSync(OTA_BUNDLE_PATH);
        if (fs.existsSync(OTA_META_PATH)) fs.unlinkSync(OTA_META_PATH);
      } catch (_) {}
    }
  }

  // Priority 2: Dev path fallback
  const devPath = fs.existsSync(localBundlePath)
    ? localBundlePath
    : fs.existsSync(rootBundlePath)
      ? rootBundlePath
      : null;

  if (devPath) {
    try {
      const bundleCode = fs.readFileSync(devPath, "utf8");
      (0, eval)(bundleCode);
      if (globalThis.__MoriCoreScrapers) {
        cachedMoriScrapers = globalThis.__MoriCoreScrapers;
        return cachedMoriScrapers;
      }
    } catch (_) {}
  }

  throw new Error("Mori Engine not installed. Use /engine to install.");
}

// 3b. Load Scrapr Engine (Engine 2)
let cachedScrapr = null;

export function loadScraprEngine() {
  if (cachedScrapr) return cachedScrapr;

  const localBundlePath = path.join(__dirname, "scrapr-bundle.cjs");
  const devScraprPath = path.resolve(__dirname, "../../../scrapr/bundle.cjs");

  // Priority 1: ~/.mori/scrapr/scrapr-bundle.cjs
  if (fs.existsSync(SCRAPR_BUNDLE_PATH)) {
    try {
      cachedScrapr = require(SCRAPR_BUNDLE_PATH);
      if (cachedScrapr && cachedScrapr.resolver) {
        return cachedScrapr;
      }
    } catch (_) {
      try {
        fs.unlinkSync(SCRAPR_BUNDLE_PATH);
        if (fs.existsSync(SCRAPR_META_PATH)) fs.unlinkSync(SCRAPR_META_PATH);
      } catch (_) {}
    }
  }

  // Priority 2: Dev path fallback
  const fallback = fs.existsSync(localBundlePath)
    ? localBundlePath
    : fs.existsSync(devScraprPath)
      ? devScraprPath
      : null;

  if (fallback) {
    try {
      cachedScrapr = require(fallback);
      if (cachedScrapr && cachedScrapr.resolver) {
        return cachedScrapr;
      }
    } catch (_) {}
  }

  throw new Error("Scrapr Engine not installed. Use /engine to install.");
}

function getScraperFetch() {
  try {
    const s = loadScraperEngine();
    if (s?.scraperFetch) return s.scraperFetch;
  } catch (_) {}
  return async function (opts) {
    const res = await fetch(opts.url, {
      method: opts.method || (opts.data ? "POST" : "GET"),
      headers: opts.headers || {},
      body: typeof opts.data === "object" ? JSON.stringify(opts.data) : opts.data,
    });
    const text = await res.text();
    return opts.rawResponse
      ? {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          data: text,
          url: res.url,
        }
      : text;
  };
}

// 4. Platform Detection
export const SCRAPR_ONLY_PLATFORMS = new Set([
  "soundcloud",
  "mediafire",
  "sfile",
  "pixeldrain",
  "catbox",
  "krakenfiles",
  "gdrive",
  "doodstream",
  "safelinku",
  "sub2unlock",
  "rekonise",
  "unshorten",
  // Comic & Manga (Engine 2)
  "kiryuu",
  "komikcast",
  "mangadex",
  "komikindo",
  "komiku",
  "bacakomik",
  "manhwaindo",
  "asurascans",
  "mangabats",
  // Anime (Engine 2)
  "otakudesu",
  "nimegami",
  "gogoanime",
  "animetosho",
]);

export const RESOLVER_LINK_PLATFORMS = new Set([
  "catbox",
  "pixeldrain",
  "safelinku",
  "sfile",
  "mediafire",
  "krakenfiles",
  "gdrive",
  "sub2unlock",
  "rekonise",
  "unshorten",
]);

export const SHORTLINK_PLATFORMS = new Set([
  "safelinku",
  "sub2unlock",
  "rekonise",
  "unshorten",
]);

export function detectPlatform(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.toLowerCase();
  if (url.includes("tiktok.com") || url.includes("tt.site")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (
    url.includes("twitter.com") ||
    /(?:^|[/.])x\.com(?:[/?#:]|$)/.test(url) ||
    url.includes("fxtwitter.com") ||
    url.includes("vxtwitter.com") ||
    url.includes("fixupx.com")
  )
    return "twitter";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("soundcloud.com") || url.includes("on.soundcloud.com"))
    return "soundcloud";
  if (url.includes("pinterest.com") || url.includes("pin.it"))
    return "pinterest";
  if (url.includes("music.apple.com")) return "applemusic";
  if (url.includes("facebook.com") || url.includes("fb.watch"))
    return "facebook";
  if (
    url.includes("xiaohongshu.com") ||
    url.includes("rednote.com") ||
    url.includes("xhslink.com") ||
    url.includes("xhslink.cn")
  )
    return "rednote";
  if (url.includes("douyin.com")) return "douyin";
  if (
    url.includes("bilibili.com") ||
    url.includes("b23.tv") ||
    url.includes("bili.im") ||
    url.includes("bilibili.tv")
  )
    return "bilibili";
  if (url.includes("threads.net") || url.includes("threads.com"))
    return "threads";
  if (url.includes("bandcamp.com")) return "bandcamp";
  if (url.includes("pixiv.net")) return "pixiv";
  if (url.includes("reddit.com") || url.includes("redd.it")) return "reddit";
  if (
    url.includes("terabox") ||
    url.includes("1024tera") ||
    url.includes("nephobox") ||
    url.includes("4funbox") ||
    url.includes("mirrobox") ||
    url.includes("momerybox") ||
    url.includes("tibibox")
  )
    return "terabox";
  // File hosts & Resolvers (Engine 2: Scrapr)
  if (url.includes("mediafire.com")) return "mediafire";
  if (url.includes("sfile.mobi") || url.includes("sfile.co")) return "sfile";
  if (url.includes("pixeldrain.com")) return "pixeldrain";
  if (
    url.includes("catbox.moe") ||
    url.includes("litterbox.catbox.moe") ||
    url.includes("litter.catbox.moe")
  )
    return "catbox";
  if (url.includes("krakenfiles.com")) return "krakenfiles";
  if (url.includes("drive.google.com") || url.includes("docs.google.com/file"))
    return "gdrive";
  if (
    /(?:doodstream\.com|ds2play\.com|doods\.pro|dood\.(?:to|so|ws|pm|wf|cx|sh|watch))/i.test(
      url,
    )
  )
    return "doodstream";
  if (
    url.includes("safelinku.com") ||
    url.includes("sfl.gl") ||
    url.includes("semawur.com") ||
    url.includes("safelink.id") ||
    url.includes("sfl.inc") ||
    url.includes("khaddavi.net")
  )
    return "safelinku";
  if (
    url.includes("sub2unlock.com") ||
    url.includes("sub2unlock.net") ||
    url.includes("sub2unlock.io") ||
    url.includes("sub2unlock.me") ||
    url.includes("sub4unlock.com") ||
    url.includes("sub4unlock.io") ||
    url.includes("sub4unlock.net")
  )
    return "sub2unlock";
  if (url.includes("rekonise.com")) return "rekonise";
  if (
    url.includes("bit.ly") ||
    url.includes("tinyurl.com") ||
    url.includes("dub.sh") ||
    url.includes("cutt.ly") ||
    url.includes("t.co/") ||
    url.includes("shorturl.at") ||
    url.includes("aka.ms")
  )
    return "unshorten";
  // Comic & Manga (Engine 2: Scrapr)
  if (url.includes("kiryuu.to") || url.includes("kiryuu.id")) return "kiryuu";
  if (
    url.includes("komikcast.info") ||
    url.includes("komikcast.ch") ||
    url.includes("komikcast.me") ||
    url.includes("komikcast.cz")
  )
    return "komikcast";
  if (url.includes("mangadex.org")) return "mangadex";
  if (
    url.includes("komikindo.ch") ||
    url.includes("komikindo.org") ||
    url.includes("komikindo.tv")
  )
    return "komikindo";
  if (url.includes("komiku.org") || url.includes("komiku.id")) return "komiku";
  if (
    url.includes("bacakomik.my") ||
    url.includes("bacakomik.co") ||
    url.includes("bacakomik.one")
  )
    return "bacakomik";
  if (
    url.includes("manhwaindo.my") ||
    url.includes("manhwaindo.id") ||
    url.includes("manhwaindo.org")
  )
    return "manhwaindo";
  if (
    url.includes("asurascans.com") ||
    url.includes("asuracomic.net") ||
    url.includes("asura.gg")
  )
    return "asurascans";
  if (url.includes("mangabats.com") || url.includes("mangabat.com"))
    return "mangabats";

  // Anime (Engine 2: Scrapr)
  if (
    url.includes("otakudesu.blog") ||
    url.includes("otakudesu.cloud") ||
    url.includes("otakudesu.tube") ||
    url.includes("otakudesu.info")
  )
    return "otakudesu";
  if (url.includes("nimegami.id")) return "nimegami";
  if (
    url.includes("gogoanime") ||
    url.includes("gogoanimes") ||
    url.includes("anitaku")
  )
    return "gogoanime";
  if (url.includes("animetosho.org")) return "animetosho";
  return null;
}

export const MORI_PLATFORM_SERVERS = {
  tiktok: [
    { id: "auto", name: "Auto (Server 1 → Server 2 fallback)" },
    { id: "server1", name: "Server 1 (TikTokIO)" },
    { id: "server2", name: "Server 2 (TikDownloader)" },
  ],
  instagram: [
    { id: "auto", name: "Auto (Server 1 → Server 2 fallback)" },
    { id: "server1", name: "Server 1 (InDown)" },
    { id: "server2", name: "Server 2 (SnapSave)" },
  ],
  youtube: [
    { id: "auto", name: "Auto (Server 1 → Server 2 fallback)" },
    { id: "server1", name: "Server 1 (ytmp3.gg)" },
    { id: "server2", name: "Server 2 (ytmp3.mobi)" },
  ],
  twitter: [
    { id: "auto", name: "Auto (Server 1 → Server 2 fallback)" },
    { id: "server1", name: "Server 1 (TwitterVideoDownloader)" },
    { id: "server2", name: "Server 2 (SaveTWT)" },
  ],
  spotify: [
    { id: "auto", name: "Auto (Server 1 → Server 2 fallback)" },
    { id: "server1", name: "Server 1 (SpotiDown)" },
    { id: "server2", name: "Server 2 (SoundLoaders)" },
  ],
};

export const SCRAPR_PLATFORM_SERVERS = {
  tiktok: [
    { id: "auto", name: "Auto (Cascade all 5 servers)" },
    { id: "tiktokio", name: "TikTokIO (Fast, HD)" },
    { id: "tikdownloader", name: "TikDownloader (Direct HD)" },
    { id: "snaptik", name: "SnapTik (Popular, No Watermark)" },
    { id: "savetik", name: "SaveTik (Alternative)" },
    { id: "ssstik", name: "SSSTik (Fallback)" },
  ],
  instagram: [
    { id: "auto", name: "Auto (Cascade all 4 servers)" },
    { id: "indown", name: "InDown (Fast, High Quality)" },
    { id: "snapsave", name: "SnapSave (Reels/Stories/Posts)" },
    { id: "snapinsta", name: "SnapInsta (Alternative)" },
    { id: "direct", name: "Direct (Public Posts)" },
  ],
  youtube: [
    { id: "auto", name: "Auto (ytmp3.gg → ytmp3 fallback)" },
    { id: "ytmp3gg", name: "ytmp3.gg (Fast, 1080p/720p/MP3)" },
    { id: "ytmp3", name: "ytmp3 (Alternative)" },
  ],
  twitter: [
    { id: "auto", name: "Auto (Cascade all 4 servers)" },
    { id: "tvd", name: "TwitterVideoDownloader (HD)" },
    { id: "savetwt", name: "SaveTWT (Fast)" },
    { id: "tweeload", name: "TweeLoad (Alternative)" },
    { id: "direct", name: "Direct FXTwitter" },
  ],
  spotify: [
    { id: "auto", name: "Auto (Cascade all 4 servers)" },
    { id: "spotidown", name: "SpotiDown (Fast 320kbps)" },
    { id: "soundloaders", name: "SoundLoaders (Reliable)" },
    { id: "spotmate", name: "SpotMate" },
    { id: "spotisaver", name: "SpotiSaver" },
  ],
  facebook: [
    { id: "auto", name: "Auto (SnapSave → FDown fallback)" },
    { id: "snapsave", name: "SnapSave (HD)" },
    { id: "fdown", name: "FDown (Alternative)" },
  ],
  pinterest: [
    { id: "auto", name: "Auto (PinDown → Direct fallback)" },
    { id: "pindown", name: "PinDown" },
    { id: "direct", name: "Direct" },
  ],
  bandcamp: [
    { id: "auto", name: "Auto (Direct → BandcampDownloader fallback)" },
    { id: "direct", name: "Direct Stream" },
    { id: "bandcampdownloader", name: "BandcampDownloader" },
  ],
};

export function getPlatformServers(platform, engine = "auto") {
  if (engine === "scrapr") {
    return SCRAPR_PLATFORM_SERVERS[platform] || null;
  }
  if (engine === "mori") {
    return MORI_PLATFORM_SERVERS[platform] || null;
  }
  return SCRAPR_PLATFORM_SERVERS[platform] || MORI_PLATFORM_SERVERS[platform] || null;
}

export const PLATFORM_SERVERS = MORI_PLATFORM_SERVERS;

// 5a. Engine 1: Mori Scraper Core
export async function scrapeWithMori(url, platform, serverPreference = "auto") {
  const scrapers = loadScraperEngine();
  let srv = serverPreference;
  if (srv === "1") srv = "server1";
  if (srv === "2") srv = "server2";

  let res = null;
  let usedServer = "";

  switch (platform) {
    case "tiktok": {
      if (srv === "server2") {
        scrapers.setTikTokSource("tikdownloader");
        res = await scrapers.scrapeTikTok(url);
        usedServer = "TikDownloader";
      } else if (srv === "server1") {
        scrapers.setTikTokSource("tiktokio");
        res = await scrapers.scrapeTikTok(url);
        usedServer = "TikTokIO";
      } else {
        scrapers.setTikTokSource("tiktokio");
        res = await scrapers.scrapeTikTok(url);
        usedServer = "TikTokIO";
        if (!res?.status) {
          scrapers.setTikTokSource("tikdownloader");
          res = await scrapers.scrapeTikTok(url);
          usedServer = "TikDownloader";
        }
      }
      break;
    }
    case "instagram": {
      if (srv === "server2") {
        scrapers.setInstagramSource("savevid");
        res = await scrapers.scrapeInstagram(url);
        usedServer = "SaveVid";
      } else if (srv === "server1") {
        scrapers.setInstagramSource("indown");
        res = await scrapers.scrapeInstagram(url);
        usedServer = "InDown";
      } else {
        scrapers.setInstagramSource("indown");
        res = await scrapers.scrapeInstagram(url);
        usedServer = "InDown";
        if (!res?.status) {
          scrapers.setInstagramSource("savevid");
          res = await scrapers.scrapeInstagram(url);
          usedServer = "SaveVid";
        }
      }
      break;
    }
    case "youtube": {
      if (srv === "server2") {
        scrapers.setYouTubeSource("mobi");
        res = await scrapers.scrapeYouTube(url);
        usedServer = "ytmp3.mobi";
      } else if (srv === "server1") {
        scrapers.setYouTubeSource("gg");
        res = await scrapers.scrapeYouTube(url);
        usedServer = "ytmp3.gg";
      } else {
        scrapers.setYouTubeSource("gg");
        res = await scrapers.scrapeYouTube(url);
        usedServer = "ytmp3.gg";
        if (!res?.status) {
          scrapers.setYouTubeSource("mobi");
          res = await scrapers.scrapeYouTube(url);
          usedServer = "ytmp3.mobi";
        }
      }
      break;
    }
    case "twitter": {
      if (srv === "server2") {
        scrapers.setTwitterSource("savetwt");
        res = await scrapers.scrapeTwitter(url);
        usedServer = "SaveTWT";
      } else if (srv === "server1") {
        scrapers.setTwitterSource("tvd");
        res = await scrapers.scrapeTwitter(url);
        usedServer = "TwitterVideoDownloader";
      } else {
        scrapers.setTwitterSource("tvd");
        res = await scrapers.scrapeTwitter(url);
        usedServer = "TwitterVideoDownloader";
        if (!res?.status) {
          scrapers.setTwitterSource("savetwt");
          res = await scrapers.scrapeTwitter(url);
          usedServer = "SaveTWT";
        }
      }
      break;
    }
    case "spotify": {
      if (srv === "server2") {
        scrapers.setSpotifySource("soundloaders");
        res = await scrapers.scrapeSpotify(url);
        usedServer = "SoundLoaders";
      } else if (srv === "server1") {
        scrapers.setSpotifySource("spotidown");
        res = await scrapers.scrapeSpotify(url);
        usedServer = "SpotiDown";
      } else {
        scrapers.setSpotifySource("spotidown");
        res = await scrapers.scrapeSpotify(url);
        usedServer = "SpotiDown";
        if (!res?.status) {
          scrapers.setSpotifySource("soundloaders");
          res = await scrapers.scrapeSpotify(url);
          usedServer = "SoundLoaders";
        }
      }
      break;
    }
    case "pinterest":
      res = await scrapers.scrapePinterest(url);
      usedServer = "Pinterest";
      break;
    case "applemusic":
      res = await scrapers.scrapeAppleMusic(url);
      usedServer = "Aplmate";
      break;
    case "facebook":
      res = await scrapers.scrapeFacebook(url);
      usedServer = "SnapSave";
      break;
    case "rednote":
      res = await scrapers.scrapeRedNote(url);
      usedServer = "RedNote";
      break;
    case "douyin":
      res = await scrapers.scrapeDouyin(url);
      usedServer = "Douyin";
      break;
    case "bilibili":
      res = await scrapers.scrapeBilibili(url);
      usedServer = "Bilibili";
      break;
    case "threads":
      res = await scrapers.scrapeThreads(url);
      usedServer = "Threads";
      break;
    case "bandcamp":
      res = await scrapers.scrapeBandcamp(url);
      usedServer = "Bandcamp";
      break;
    case "pixiv":
      res = await scrapers.scrapePixiv(url);
      usedServer = "Pixiv";
      break;
    case "reddit":
      res = await scrapers.scrapeReddit(url);
      usedServer = "RapidSave";
      break;
    case "terabox":
      res = await scrapers.scrapeTeraBox(url);
      usedServer = "TeraBox";
      break;
    default:
      throw new Error(`Platform handler missing for ${platform}`);
  }

  if (!res || !res.status) {
    throw new Error(res?.message || `Failed to scrape media from ${platform}.`);
  }

  const result = res.result || {};
  if (result.title) {
    result.title = decodeHtmlEntities(result.title);
  }

  return {
    platform,
    engine: "mori",
    server: usedServer,
    ...result,
  };
}

// 5b. Engine 2: Scrapr Stand-alone Scraper & Resolver
export async function scrapeWithScrapr(
  url,
  platform,
  serverPreference = "auto",
) {
  const scrapr = loadScraprEngine();
  let srv = serverPreference;
  if (srv === "1") srv = "server1";
  if (srv === "2") srv = "server2";

  let res = null;
  let usedServer = "";

  switch (platform) {
    case "tiktok": {
      if (srv === "tiktokio" || srv === "server1") {
        res = await scrapr.tiktok.tiktokio(url);
        usedServer = "TikTokIO";
      } else if (srv === "tikdownloader" || srv === "server2") {
        res = await scrapr.tiktok.tikdownloader(url);
        usedServer = "TikDownloader";
      } else if (srv === "snaptik") {
        res = await scrapr.tiktok.snaptik(url);
        usedServer = "SnapTik";
      } else if (srv === "savetik") {
        res = await scrapr.tiktok.savetik(url);
        usedServer = "SaveTik";
      } else if (srv === "ssstik") {
        res = await scrapr.tiktok.ssstik(url);
        usedServer = "SSSTik";
      } else {
        res = await scrapr.tiktok.tiktokio(url);
        usedServer = "TikTokIO";
        if (!res?.status) {
          res = await scrapr.tiktok.tikdownloader(url);
          usedServer = "TikDownloader";
        }
        if (!res?.status) {
          res = await scrapr.tiktok.snaptik(url);
          usedServer = "SnapTik";
        }
        if (!res?.status) {
          res = await scrapr.tiktok.savetik(url);
          usedServer = "SaveTik";
        }
        if (!res?.status) {
          res = await scrapr.tiktok.ssstik(url);
          usedServer = "SSSTik";
        }
      }
      break;
    }
    case "instagram": {
      if (srv === "indown" || srv === "server1") {
        res = await scrapr.instagram.indown(url);
        usedServer = "InDown";
      } else if (srv === "snapsave" || srv === "server2") {
        res = await scrapr.instagram.snapsave(url);
        usedServer = "SnapSave";
      } else if (srv === "snapinsta") {
        res = await scrapr.instagram.snapinsta(url);
        usedServer = "SnapInsta";
      } else if (srv === "direct") {
        res = await scrapr.instagram.direct(url);
        usedServer = "Direct";
      } else {
        res = await scrapr.instagram.indown(url);
        usedServer = "InDown";
        if (!res?.status) {
          res = await scrapr.instagram.snapsave(url);
          usedServer = "SnapSave";
        }
        if (!res?.status) {
          res = await scrapr.instagram.snapinsta(url);
          usedServer = "SnapInsta";
        }
        if (!res?.status) {
          res = await scrapr.instagram.direct(url);
          usedServer = "Direct";
        }
      }
      break;
    }
    case "youtube": {
      if (srv === "ytmp3gg" || srv === "server1") {
        res = await scrapr.youtube.ytmp3gg(url);
        usedServer = "ytmp3.gg";
      } else if (srv === "ytmp3" || srv === "server2") {
        res = await scrapr.youtube.ytmp3(url);
        usedServer = "ytmp3";
      } else {
        res = await scrapr.youtube.ytmp3gg(url);
        usedServer = "ytmp3.gg";
        if (!res?.status) {
          res = await scrapr.youtube.ytmp3(url);
          usedServer = "ytmp3";
        }
      }
      break;
    }
    case "twitter": {
      if (srv === "tvd" || srv === "server1") {
        res = await scrapr.twitter.tvd(url);
        usedServer = "TwitterVideoDownloader";
      } else if (srv === "savetwt" || srv === "server2") {
        res = await scrapr.twitter.savetwt(url);
        usedServer = "SaveTWT";
      } else if (srv === "tweeload") {
        res = await scrapr.twitter.tweeload(url);
        usedServer = "TweeLoad";
      } else if (srv === "direct") {
        res = await scrapr.twitter.direct(url);
        usedServer = "Direct FXTwitter";
      } else {
        res = await scrapr.twitter.tvd(url);
        usedServer = "TwitterVideoDownloader";
        if (!res?.status) {
          res = await scrapr.twitter.savetwt(url);
          usedServer = "SaveTWT";
        }
        if (!res?.status) {
          res = await scrapr.twitter.tweeload(url);
          usedServer = "TweeLoad";
        }
        if (!res?.status) {
          res = await scrapr.twitter.direct(url);
          usedServer = "Direct FXTwitter";
        }
      }
      break;
    }
    case "spotify": {
      if (srv === "spotidown" || srv === "server1") {
        res = await scrapr.spotify.spotidown(url);
        usedServer = "SpotiDown";
      } else if (srv === "soundloaders" || srv === "server2") {
        res = await scrapr.spotify.soundloaders(url);
        usedServer = "SoundLoaders";
      } else if (srv === "spotmate") {
        res = await scrapr.spotify.spotmate(url);
        usedServer = "SpotMate";
      } else if (srv === "spotisaver") {
        res = await scrapr.spotify.spotisaver(url);
        usedServer = "SpotiSaver";
      } else {
        res = await scrapr.spotify.spotidown(url);
        usedServer = "SpotiDown";
        if (!res?.status) {
          res = await scrapr.spotify.soundloaders(url);
          usedServer = "SoundLoaders";
        }
        if (!res?.status) {
          res = await scrapr.spotify.spotmate(url);
          usedServer = "SpotMate";
        }
        if (!res?.status) {
          res = await scrapr.spotify.spotisaver(url);
          usedServer = "SpotiSaver";
        }
      }
      break;
    }
    case "soundcloud":
      res = await scrapr.soundcloud.klickaud(url);
      usedServer = "KlickAud";
      break;
    case "pinterest": {
      if (srv === "pindown" || srv === "server1") {
        res = await scrapr.pinterest.pindown(url);
        usedServer = "PinDown";
      } else if (srv === "direct" || srv === "server2") {
        res = await scrapr.pinterest.direct(url);
        usedServer = "Direct";
      } else {
        res = await scrapr.pinterest.pindown(url);
        usedServer = "PinDown";
        if (!res?.status) {
          res = await scrapr.pinterest.direct(url);
          usedServer = "Direct";
        }
      }
      break;
    }
    case "facebook": {
      if (srv === "snapsave" || srv === "server1") {
        res = await scrapr.facebook.snapsave(url);
        usedServer = "SnapSave";
      } else if (srv === "fdown" || srv === "server2") {
        res = await scrapr.facebook.fdown(url);
        usedServer = "FDown";
      } else {
        res = await scrapr.facebook.snapsave(url);
        usedServer = "SnapSave";
        if (!res?.status) {
          res = await scrapr.facebook.fdown(url);
          usedServer = "FDown";
        }
      }
      break;
    }
    case "threads":
      res = await scrapr.threads.threadster(url);
      usedServer = "Threadster";
      break;
    case "pixiv":
      res = await scrapr.pixiv.ajax(url);
      usedServer = "Pixiv";
      break;
    case "rednote":
      res = await scrapr.rednote.direct(url);
      usedServer = "RedNote";
      break;
    case "douyin":
      res = await scrapr.douyin.direct(url);
      usedServer = "Douyin";
      break;
    case "bilibili":
      res = await scrapr.bilibili.direct(url);
      usedServer = "Bilibili";
      break;
    case "reddit":
      res = await scrapr.reddit.rapidsave(url);
      usedServer = "RapidSave";
      break;
    case "terabox":
      res = await scrapr.terabox.sechno(url);
      usedServer = "Sechno";
      break;
    case "bandcamp": {
      res = await scrapr.bandcamp.direct(url);
      usedServer = "Direct";
      if (!res?.status) {
        res = await scrapr.bandcamp.bandcampdownloader(url);
        usedServer = "BandcampDownloader";
      }
      break;
    }
    case "applemusic":
      res = await scrapr.applemusic.aplmate(url);
      break;
    case "mediafire":
      res = await scrapr.resolver.mediafire(url);
      break;
    case "sfile":
      res = await scrapr.resolver.sfile(url);
      break;
    case "pixeldrain":
      res = await scrapr.resolver.pixeldrain(url);
      break;
    case "catbox":
      res = await scrapr.resolver.catbox(url);
      break;
    case "krakenfiles":
      res = await scrapr.resolver.krakenfiles(url);
      break;
    case "gdrive":
      res = await scrapr.resolver.gdrive(url);
      break;
    case "doodstream":
      res = await scrapr.resolver.doodstream(url);
      break;
    case "safelinku":
      res = await scrapr.resolver.safelinku(url);
      break;
    case "sub2unlock":
      res = await scrapr.resolver.sub2unlock(url);
      break;
    case "rekonise":
      res = await scrapr.resolver.rekonise(url);
      break;
    case "unshorten":
      res = await scrapr.resolver.unshorten(url);
      break;
    // Comic & Manga
    case "kiryuu":
      res = await scrapr.comic.kiryuu(url);
      usedServer = "Kiryuu";
      break;
    case "komikcast":
      res = await scrapr.comic.komikcast(url);
      usedServer = "Komikcast";
      break;
    case "mangadex":
      res = await scrapr.comic.mangadex(url);
      usedServer = "MangaDex";
      break;
    case "komikindo":
      res = await scrapr.comic.komikindo(url);
      usedServer = "Komikindo";
      break;
    case "komiku":
      res = await scrapr.comic.komiku(url);
      usedServer = "Komiku";
      break;
    case "bacakomik":
      res = await scrapr.comic.bacakomik(url);
      usedServer = "Bacakomik";
      break;
    case "manhwaindo":
      res = await scrapr.comic.manhwaindo(url);
      usedServer = "ManhwaIndo";
      break;
    case "asurascans":
      res = await scrapr.comic.asurascans(url);
      usedServer = "AsuraScans";
      break;
    case "mangabats":
      res = await scrapr.comic.mangabats(url);
      usedServer = "MangaBats";
      break;
    // Anime
    case "otakudesu":
      res = await scrapr.anime.otakudesu(url);
      usedServer = "Otakudesu";
      break;
    case "nimegami":
      res = await scrapr.anime.nimegami(url);
      usedServer = "Nimegami";
      break;
    case "gogoanime":
      res = await scrapr.anime.gogoanime(url);
      usedServer = "Gogoanime";
      break;
    case "animetosho":
      res = await scrapr.anime.animetosho(url);
      usedServer = "AnimeTosho";
      break;
    default:
      throw new Error(`Scrapr does not support platform: ${platform}`);
  }

  if (!res || !res.status) {
    throw new Error(
      res?.message || `Failed to scrape media with Scrapr from ${platform}.`,
    );
  }

  const result = res.result || {};
  if (result.title) {
    result.title = decodeHtmlEntities(result.title);
  }
  if (result.author && typeof result.author === "object") {
    result.author =
      result.author.name ||
      result.author.username ||
      result.author.nickname ||
      "Creator";
  }

  let downloads = result.downloads || [];
  const primaryUrl = result.destinationUrl || result.url;
  if (!downloads.length && primaryUrl) {
    downloads = [
      {
        type: SHORTLINK_PLATFORMS.has(platform) ? "link" : (result.type || "file"),
        quality: SHORTLINK_PLATFORMS.has(platform) ? "Resolved Link" : "Direct Download",
        url: primaryUrl,
      },
    ];
  }

  return {
    platform,
    engine: "scrapr",
    server: usedServer,
    ...result,
    downloads,
  };
}

// 5c. Unified Scraper with Engine Routing & Automatic Fallback
export async function scrapeUrl(
  url,
  serverPreference = "auto",
  enginePreference = "auto",
) {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error("URL is not supported by Mori.");
  }

  const engine = (enginePreference || "auto").toLowerCase();
  const moriInstalled = isMoriInstalled();
  const scraprInstalled = isScraprInstalled();

  if (!moriInstalled && !scraprInstalled) {
    throw new Error(
      "No scraper engine installed. Run 'mori' or use /engine to install.",
    );
  }

  // If platform is exclusive to Scrapr
  if (SCRAPR_ONLY_PLATFORMS.has(platform)) {
    if (!scraprInstalled) {
      throw new Error(
        `Platform '${platform}' requires Scrapr engine. Install with /engine.`,
      );
    }
    return scrapeWithScrapr(url, platform, serverPreference);
  }

  // Engine 2 explicit
  if (engine === "scrapr") {
    if (!scraprInstalled) {
      throw new Error("Scrapr engine is not installed. Install with /engine.");
    }
    return scrapeWithScrapr(url, platform, serverPreference);
  }

  // Engine 1 explicit
  if (engine === "mori") {
    if (!moriInstalled) {
      throw new Error("Mori engine is not installed. Install with /engine.");
    }
    return scrapeWithMori(url, platform, serverPreference);
  }

  // Auto mode: single engine fallback
  if (!moriInstalled && scraprInstalled) {
    return scrapeWithScrapr(url, platform, serverPreference);
  }
  if (moriInstalled && !scraprInstalled) {
    return scrapeWithMori(url, platform, serverPreference);
  }

  // Both installed: Engine 1 (Mori) first -> fallback to Engine 2 (Scrapr)
  try {
    return await scrapeWithMori(url, platform, serverPreference);
  } catch (moriErr) {
    try {
      const scraprRes = await scrapeWithScrapr(url, platform, serverPreference);
      scraprRes.fallbackFromMori = true;
      return scraprRes;
    } catch (_) {
      throw moriErr;
    }
  }
}

// 6. Asynchronous Direct URL Resolvers
export async function resolveUrl(url, onStatus) {
  const scraperFetch = getScraperFetch();

  if (url.startsWith("applemusic_resolve:")) {
    if (onStatus) onStatus("Resolving Apple Music direct stream...");
    const payloadStr = url.replace("applemusic_resolve:", "");
    const res = await scraperFetch({
      method: "POST",
      url: "https://aplmate.com/action/track",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CHROME_UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://aplmate.com/",
        Origin: "https://aplmate.com",
      },
      data: payloadStr,
    });
    let dd = typeof res === "string" ? JSON.parse(res) : res;
    let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(dlHtml, "text/html");
    let foundLink = "";
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        href &&
        (href.includes("/dl?token=") || a.classList?.contains("abutton"))
      ) {
        if (
          !href.includes("ko-fi.com") &&
          !href.includes("premium.html") &&
          !text.toLowerCase().includes("another song")
        ) {
          if (!foundLink)
            foundLink = href.startsWith("http")
              ? href
              : "https://aplmate.com" + href;
        }
      }
    });
    if (!foundLink)
      throw new Error("Could not resolve Apple Music download link.");
    return foundLink;
  }

  if (
    url.startsWith("spotidown_resolve:") ||
    url.startsWith("soundloaders_resolve:")
  ) {
    if (onStatus) onStatus("Resolving Spotify direct track...");
    function createMultipartBody(fields) {
      const boundary =
        "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      let body = "";
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) {
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
      }
      body += `--${boundary}--\r\n`;
      return {
        body,
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }

    const isSoundloaders = url.startsWith("soundloaders_resolve:");
    const parts = url
      .replace("spotidown_resolve:", "")
      .replace("soundloaders_resolve:", "")
      .split("|||");
    let dataVal = parts[0] || "";
    let tokenVal = parts[1] || "";
    let baseVal = parts[2] ? decodeURIComponent(parts[2]) : "";
    let cookiesStr = parts[3] ? decodeURIComponent(parts[3]) : "";

    if (dataVal.includes("=") && (!tokenVal || !tokenVal.startsWith("http"))) {
      try {
        const sp = new URLSearchParams(dataVal);
        if (sp.has("data")) dataVal = sp.get("data") || "";
        if (sp.has("token")) tokenVal = sp.get("token") || "";
        if (sp.has("base")) baseVal = sp.get("base") || "";
        if (parts[1]) cookiesStr = decodeURIComponent(parts[1]);
      } catch (_) {}
    }

    let foundLink = "";

    // 1. If Soundloaders, try Spotimate first (if it doesn't fail with turnstile token)
    if (isSoundloaders && !tokenVal.startsWith("bccpF:")) {
      try {
        if (!cookiesStr) {
          try {
            const rHome = await scraperFetch({
              url: "https://spotimate.app/en1",
              headers: { "User-Agent": CHROME_UA },
              rawResponse: true,
            });
            let freshCookies = getCookiesFromHeaders(rHome.headers) || "";
            const rVerify = await scraperFetch({
              url: "https://spotimate.app/api/userverify",
              method: "POST",
              data: "url=" + encodeURIComponent(baseVal || "https://open.spotify.com"),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": CHROME_UA,
                Referer: "https://spotimate.app/en1",
                Origin: "https://spotimate.app",
                ...(freshCookies ? { Cookie: freshCookies } : {}),
              },
              rawResponse: true,
            });
            const vCookies = getCookiesFromHeaders(rVerify.headers);
            if (vCookies) freshCookies = freshCookies ? `${freshCookies}; ${vCookies}` : vCookies;
            if (freshCookies) cookiesStr = freshCookies;
          } catch (_) {}
        }

        const mp = createMultipartBody({
          data: dataVal,
          token: tokenVal,
          track_token: tokenVal,
          ...(baseVal ? { base: baseVal } : {}),
        });
        const slHeaders = {
          "Content-Type": mp.contentType,
          "User-Agent": CHROME_UA,
          Referer: "https://spotimate.app/en1",
          Origin: "https://spotimate.app",
        };
        if (cookiesStr) slHeaders["Cookie"] = cookiesStr;

        const res = await scraperFetch({
          url: "https://spotimate.app/action/track",
          method: "POST",
          headers: slHeaders,
          data: mp.body,
          rawResponse: true,
        });
        let dd = res?.data ?? res;
        if (typeof dd === "string") {
          try {
            dd = JSON.parse(dd);
          } catch (_) {}
        }
        let dlHtml = (typeof dd === "object" ? dd?.html || dd?.data : dd) || "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(dlHtml, "text/html");
        doc.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href")?.trim();
          const text = a.textContent.trim();
          if (
            href &&
            href.startsWith("http") &&
            !href.includes("tunecable.com") &&
            !href.includes("premium") &&
            !text.toLowerCase().includes("cover") &&
            !href.includes("scdn.co") &&
            text !== "Download Another Song"
          ) {
            if (!foundLink) foundLink = href;
          }
        });
        if (!foundLink) {
          const match =
            dlHtml.match(
              /href=["'](https:\/\/(?:dl\.spotimate\.app|dl\.soundloaders\.app)[^"']+)["']/,
            ) ||
            dlHtml.match(
              /href=["'](https:\/\/[^"']*(?:cdnv1|\/v1\?token=)[^"']+)["']/,
            );
          if (match && match[1]) {
            foundLink = match[1];
          }
        }
      } catch (_) {}
    }

    // 2. If SpotiDown or Spotimate fallback needed:
    if (!foundLink && baseVal) {
      let spData = dataVal;
      let spToken = tokenVal;
      let spBase = baseVal;
      let spCookies = cookiesStr;

      // If came from Soundloaders, we need genuine SpotiDown tokens
      if (isSoundloaders || !spData || !spToken || spToken.startsWith("bccpF:")) {
        try {
          const rSession = await scraperFetch({
            url: "https://spotidown.app/action",
            method: "POST",
            data: `url=${encodeURIComponent(baseVal)}&g-recaptcha-response=dummy_token`,
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": CHROME_UA,
              "X-Requested-With": "XMLHttpRequest",
              Origin: "https://spotidown.app",
              Referer: "https://spotidown.app/",
            },
            rawResponse: true,
          });
          const freshCookies = getCookiesFromHeaders(rSession.headers) || "";
          if (freshCookies) spCookies = freshCookies;
          let rData = rSession?.data;
          if (typeof rData === "string") {
            try {
              rData = JSON.parse(rData);
            } catch (_) {}
          }
          const html = rData?.data || rData?.html || "";
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const form = doc.querySelector('form[name="submitspurl"]');
          if (form) {
            spData = form.querySelector('input[name="data"]')?.value || "";
            spToken = form.querySelector('input[name="token"]')?.value || "";
            spBase = form.querySelector('input[name="base"]')?.value || baseVal;
          }
        } catch (_) {}
      }

      if (spData && spToken) {
        const mp = createMultipartBody({
          data: spData,
          base: spBase,
          token: spToken,
        });

        const reqHeaders = {
          "Content-Type": mp.contentType,
          "User-Agent": CHROME_UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://spotidown.app/",
          Origin: "https://spotidown.app",
        };
        if (spCookies) reqHeaders["Cookie"] = spCookies;

        const res = await scraperFetch({
          url: "https://spotidown.app/action/track",
          method: "POST",
          headers: reqHeaders,
          data: mp.body,
          rawResponse: true,
        });
        let dd = res?.data ?? res;
        if (typeof dd === "string") {
          try {
            dd = JSON.parse(dd);
          } catch (_) {}
        }
        let dlHtml = (typeof dd === "object" ? dd?.data || dd?.html : dd) || "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(dlHtml, "text/html");
        doc.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href");
          const text = a.textContent.trim();
          if (
            href &&
            href.startsWith("http") &&
            !href.includes("premium.html") &&
            !href.includes("ko-fi.com") &&
            text !== "Download Another Song"
          ) {
            if (!foundLink) foundLink = href;
          }
        });
      }
    }

    if (!foundLink) throw new Error("Could not resolve Spotify download link.");
    return foundLink;
  }

  if (
    url.startsWith("youtube_resolve:") ||
    url.startsWith("ytmp3gg_resolve:")
  ) {
    if (onStatus) onStatus("Resolving YouTube audio via converter...");
    const raw = url.startsWith("youtube_resolve:")
      ? url.replace("youtube_resolve:", "")
      : url.replace("ytmp3gg_resolve:", "");
    const [ytId, format = "mp3"] = raw.split("|||");

    const mobiHeaders = {
      Origin: "https://ytmp3.mobi",
      Referer: "https://ytmp3.mobi/en8/",
      "User-Agent": CHROME_UA,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      Accept: "*/*",
    };

    const initData = await scraperFetch({
      url: `https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`,
      headers: mobiHeaders,
    });

    if (initData && !initData.error && initData.convertURL) {
      let convData = await scraperFetch({
        url: `${initData.convertURL}&v=${ytId}&f=${format}&_=${Math.random()}`,
        headers: mobiHeaders,
      });

      while (convData && convData.redirect > 0 && convData.redirectURL) {
        convData = await scraperFetch({
          url: `${convData.redirectURL}&v=${ytId}&f=${format}&_=${Math.random()}`,
          headers: mobiHeaders,
        });
      }

      if (convData && !convData.error) {
        let dlUrl = convData.downloadURL;
        let progUrl = convData.progressURL;
        let progress = 0;
        let attempts = 0;

        while (progress < 3 && attempts < 25) {
          await new Promise((r) => setTimeout(r, 1200));
          const pData = await scraperFetch({
            url: `${progUrl}&_=${Math.random()}`,
            headers: mobiHeaders,
          });
          if (pData && !pData.error) {
            progress = pData.progress;
            if (pData.downloadURL) dlUrl = pData.downloadURL;
            if (progress >= 3) break;
          }
          attempts++;
        }

        if (dlUrl && progress >= 3) {
          if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
          if (dlUrl.startsWith("/")) dlUrl = "https://ytmp3.mobi" + dlUrl;
          return dlUrl;
        }
      }
    }
    throw new Error("YouTube direct conversion timed out or failed.");
  }

  return url;
}

// 7. Filename Sanitizer
export function sanitizeFilename(title, ext = "mp4") {
  const decoded = decodeHtmlEntities(title || "Mori_Download");
  const safe = decoded
    .replace(/[\\/:*?"<>|#%&{}\[\]@$^+=~`';,]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .substring(0, 75);
  const cleanExt = ext.replace(/^\./, "");
  return `${safe || "Media"}.${cleanExt}`;
}

// 8. Stream Downloader with Progress Reporting
export async function downloadMediaFile(
  downloadUrl,
  outputPath,
  onProgress,
  extraHeaders = {},
) {
  const res = await fetch(downloadUrl, {
    headers: {
      "User-Agent": CHROME_UA,
      Accept: "*/*",
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`Download HTTP error: ${res.status} ${res.statusText}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (
    contentType.includes("text/html") &&
    !outputPath.endsWith(".html") &&
    !outputPath.endsWith(".txt")
  ) {
    throw new Error(
      "Received HTML webpage instead of a direct media stream. Please select a Direct MP4 stream.",
    );
  }

  const totalBytes = parseInt(res.headers.get("content-length") || "0", 10);
  const fileStream = fs.createWriteStream(outputPath);

  let downloadedBytes = 0;
  let startTime = Date.now();
  let lastReport = 0;

  if (res.body?.getReader) {
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      fileStream.write(Buffer.from(value));

      const now = Date.now();
      if (now - lastReport > 150 || downloadedBytes === totalBytes) {
        lastReport = now;
        const elapsedSec = (now - startTime) / 1000 || 0.001;
        const speedBps = downloadedBytes / elapsedSec;
        if (onProgress) {
          onProgress({
            downloadedBytes,
            totalBytes,
            percent: totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0,
            speedBps,
          });
        }
      }
    }
    fileStream.end();
  } else {
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    if (onProgress) {
      onProgress({
        downloadedBytes: buffer.length,
        totalBytes: buffer.length,
        percent: 100,
        speedBps: buffer.length,
      });
    }
  }

  return outputPath;
}

// 9. Media & Network Utilities

export function openFile(filePath) {
  const plat = process.platform;
  const cmd =
    plat === "darwin"
      ? `open "${filePath}"`
      : plat === "win32"
        ? `start "" "${filePath}"`
        : `xdg-open "${filePath}"`;
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

export async function pingNetwork(host = "1.1.1.1") {
  const cleanHost = (host || "1.1.1.1")
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0];
  const isWin = process.platform === "win32";
  const cmd = isWin
    ? `ping -n 3 -w 2000 ${cleanHost}`
    : `ping -c 3 -W 2 ${cleanHost}`;

  return new Promise((resolve) => {
    exec(cmd, { encoding: "utf8", timeout: 8000 }, (err, stdout) => {
      if (!err && stdout) {
        const unixMatch = stdout.match(
          /(?:round-trip|rtt)[^=]*=\s*([0-9.]+)\/([0-9.]+)\/([0-9.]+)/i,
        );
        const winMatch = stdout.match(
          /Minimum\s*=\s*([0-9]+)ms.*Maximum\s*=\s*([0-9]+)ms.*Average\s*=\s*([0-9]+)ms/i,
        );
        const lossMatch =
          stdout.match(/([0-9.]+)%\s*packet loss/i) ||
          stdout.match(/loss\s*\(([0-9.]+)%/i);
        const loss = lossMatch ? `${lossMatch[1]}%` : "0%";

        if (unixMatch) {
          return resolve({
            host: cleanHost,
            avg: Math.round(parseFloat(unixMatch[2])),
            min: Math.round(parseFloat(unixMatch[1])),
            max: Math.round(parseFloat(unixMatch[3])),
            loss,
            ok: true,
          });
        }
        if (winMatch) {
          return resolve({
            host: cleanHost,
            avg: parseInt(winMatch[3], 10),
            min: parseInt(winMatch[1], 10),
            max: parseInt(winMatch[2], 10),
            loss,
            ok: true,
          });
        }
      }

      // Fallback: fast HTTP latency check if ICMP blocked
      const start = Date.now();
      fetch(`https://${cleanHost}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      })
        .then(() => {
          const ms = Date.now() - start;
          resolve({
            host: cleanHost,
            avg: ms,
            min: ms,
            max: ms,
            loss: "0%",
            ok: true,
          });
        })
        .catch(() => {
          resolve({
            host: cleanHost,
            avg: -1,
            min: -1,
            max: -1,
            loss: "100%",
            ok: false,
          });
        });
    });
  });
}

// 10. Native Zero-Dependency Multi-Image PDF 1.4 Builder

export function ensureJpegBuffer(buf) {
  if (!buf || buf.length < 4) return buf;
  // If already JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return buf;
  }
  // Convert via sips on macOS if available
  if (process.platform === "darwin") {
    try {
      const tmpIn = path.join(
        os.tmpdir(),
        `mori_convert_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`,
      );
      const tmpOut = `${tmpIn}.jpg`;
      fs.writeFileSync(tmpIn, buf);
      execSync(
        `sips -s format jpeg "${tmpIn}" --out "${tmpOut}" >/dev/null 2>&1`,
      );
      if (fs.existsSync(tmpOut)) {
        const outBuf = fs.readFileSync(tmpOut);
        try {
          fs.unlinkSync(tmpIn);
        } catch (_) {}
        try {
          fs.unlinkSync(tmpOut);
        } catch (_) {}
        return outBuf;
      }
    } catch (_) {}
  }
  // Fallback: try ffmpeg if installed
  try {
    const tmpIn = path.join(
      os.tmpdir(),
      `mori_convert_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`,
    );
    const tmpOut = `${tmpIn}.jpg`;
    fs.writeFileSync(tmpIn, buf);
    execSync(`ffmpeg -y -i "${tmpIn}" "${tmpOut}" >/dev/null 2>&1`);
    if (fs.existsSync(tmpOut)) {
      const outBuf = fs.readFileSync(tmpOut);
      try {
        fs.unlinkSync(tmpIn);
      } catch (_) {}
      try {
        fs.unlinkSync(tmpOut);
      } catch (_) {}
      return outBuf;
    }
  } catch (_) {}

  return buf;
}

export function getImageDimensions(buf) {
  if (!buf || buf.length < 8) return { width: 595, height: 842 };

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
      }
      const len = buf.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }

  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf.length >= 24
  ) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }

  return { width: 595, height: 842 };
}

export function generateImagesPdf(images) {
  // images: array of { buffer, width, height }
  const pageObjIds = images.map((_, i) => 3 + i * 3);

  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${images.length} >>\nendobj\n`;

  const parts = [
    Buffer.from("%PDF-1.4\n"),
    Buffer.from(obj1),
    Buffer.from(obj2),
  ];

  const offsets = [];
  const totalObjs = 2 + images.length * 3;
  let currentOffset = "%PDF-1.4\n".length;

  offsets.push(0);
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(obj1);
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(obj2);

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const w = img.width || 595;
    const h = img.height || 842;
    const pageId = 3 + i * 3;
    const imgId = 4 + i * 3;
    const contentId = 5 + i * 3;

    // Page Object
    offsets.push(currentOffset);
    const pageStr = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`;
    currentOffset += Buffer.byteLength(pageStr);
    parts.push(Buffer.from(pageStr));

    // Image XObject (Raw DCTDecode stream)
    offsets.push(currentOffset);
    const imgHeader = `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.buffer.length} >>\nstream\n`;
    const imgFooter = "\nendstream\nendobj\n";
    currentOffset +=
      Buffer.byteLength(imgHeader) +
      img.buffer.length +
      Buffer.byteLength(imgFooter);
    parts.push(Buffer.from(imgHeader));
    parts.push(img.buffer);
    parts.push(Buffer.from(imgFooter));

    // Content Stream
    offsets.push(currentOffset);
    const contentData = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
    const contentStr = `${contentId} 0 obj\n<< /Length ${contentData.length} >>\nstream\n${contentData}\nendstream\nendobj\n`;
    currentOffset += Buffer.byteLength(contentStr);
    parts.push(Buffer.from(contentStr));
  }

  const startxref = currentOffset;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjs; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  parts.push(Buffer.from(xref));
  parts.push(Buffer.from(trailer));

  return Buffer.concat(parts);
}

export function compileImagesToPdf(imageBuffers, outputPath) {
  const images = [];
  for (const rawBuf of imageBuffers) {
    const jpegBuf = ensureJpegBuffer(rawBuf);
    const { width, height } = getImageDimensions(jpegBuf);
    images.push({ buffer: jpegBuf, width, height });
  }
  const pdfBuffer = generateImagesPdf(images);
  fs.writeFileSync(outputPath, pdfBuffer);
  return { outputPath, bytes: pdfBuffer.length, pages: images.length };
}
