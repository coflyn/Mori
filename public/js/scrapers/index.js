// Mori Scraper Engine Runtime Loader
// GNU General Public License v3.0 — (C) 2026 coflyn.

import * as utils from "../utils/index.js";
import * as urlUtils from "../utils/urlUtils.js";
import * as core from "../modules/core.js";
import { scraperFetch } from "./httpHelper.js";

export * from "./httpHelper.js";

export const BUNDLED_SCRAPER_VERSION = 6;
window.__MORI_BUNDLED_SCRAPER_VERSION__ = BUNDLED_SCRAPER_VERSION;

// Expose deps to the bundled IIFE core
window.__moriDeps = { utils, urlUtils, core };

let _corePromise = null;

async function fetchBundleText() {
  const urls = [
    "js/scrapers/bundle.js",
    "/js/scrapers/bundle.js",
    "./js/scrapers/bundle.js",
    "file:///android_asset/public/js/scrapers/bundle.js",
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (res.ok) return res.text();
    } catch (_) {}
  }
  // XHR fallback (Android WebView edge cases)
  if (typeof XMLHttpRequest !== "undefined") {
    for (const u of urls) {
      const text = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", u, true);
        xhr.onload = () => (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) ? resolve(xhr.responseText) : resolve(null);
        xhr.onerror = () => resolve(null);
        xhr.send();
      });
      if (text) return text;
    }
  }
  throw new Error("[Mori] Could not load scrapers/bundle.js");
}

async function loadCoreScrapers() {
  if (_corePromise) return _corePromise;
  _corePromise = (async () => {
    let scriptText = null;
    let isFromOtaPatch = false;

    // A. OTA patch from localStorage (plain JS text)
    try {
      const patchedText = localStorage.getItem("mori_patched_scraper_bin");
      const activeVer = parseInt(localStorage.getItem("mori_active_scraper_version") || "0", 10);
      if (patchedText && activeVer >= BUNDLED_SCRAPER_VERSION) {
        scriptText = patchedText;
        isFromOtaPatch = true;
        console.log(`[Mori] Loaded OTA patched scraper core v${activeVer}`);
      }
    } catch (otaErr) {
      console.warn("[Mori] OTA patch load warning:", otaErr);
    }

    try {
      // B. Fallback to bundled bundle.js
      if (!scriptText) {
        scriptText = await fetchBundleText();
      }

      const fn = new Function(
        scriptText +
          "\nreturn typeof __MoriCoreScrapers !== 'undefined' ? __MoriCoreScrapers : (typeof window !== 'undefined' ? window.__MoriCoreScrapers : null);"
      );
      const mod = fn();

      if (!mod) throw new Error("[Mori] Failed to instantiate core scraper modules.");

      window.__MoriCoreScrapers = mod;
      console.log(`[Mori] Core scrapers ready (${isFromOtaPatch ? "OTA Patch" : "Bundled"} v${BUNDLED_SCRAPER_VERSION}).`);
      return mod;
    } catch (e) {
      // Safe-mode: corrupted OTA patch → clear and retry with bundled
      if (isFromOtaPatch) {
        console.warn("[Mori] Corrupted OTA patch — resetting to bundled core.", e);
        localStorage.removeItem("mori_patched_scraper_bin");
        localStorage.removeItem("mori_active_scraper_version");
        _corePromise = null;
        return loadCoreScrapers();
      }
      console.error("[Mori] Fatal init error:", e);
      if (typeof window.showFatalErrorModal === "function") {
        window.showFatalErrorModal(e.message || String(e));
      }
      throw e;
    }
  })();
  return _corePromise;
}

export async function scrapeTikTok(...args) { return (await loadCoreScrapers()).scrapeTikTok(...args); }
export function setTikTokSource(...args) { loadCoreScrapers().then((m) => m.setTikTokSource(...args)); }

export async function scrapeYouTube(...args) { return (await loadCoreScrapers()).scrapeYouTube(...args); }
export function setYouTubeSource(...args) { loadCoreScrapers().then((m) => m.setYouTubeSource(...args)); }

export async function scrapeInstagram(...args) { return (await loadCoreScrapers()).scrapeInstagram(...args); }
export function setInstagramSource(...args) { loadCoreScrapers().then((m) => m.setInstagramSource(...args)); }

export async function scrapeTwitter(...args) { return (await loadCoreScrapers()).scrapeTwitter(...args); }
export function setTwitterSource(...args) { loadCoreScrapers().then((m) => m.setTwitterSource(...args)); }

export async function scrapeSpotify(...args) { return (await loadCoreScrapers()).scrapeSpotify(...args); }
export function setSpotifySource(...args) { loadCoreScrapers().then((m) => m.setSpotifySource(...args)); }

export async function scrapeBilibili(...args) { return (await loadCoreScrapers()).scrapeBilibili(...args); }
export async function scrapePixiv(...args) { return (await loadCoreScrapers()).scrapePixiv(...args); }
export async function scrapeRedNote(...args) { return (await loadCoreScrapers()).scrapeRedNote(...args); }

export async function scrapeDouyin(url, ...rest) {
  const originalUrl = url;
  let targetUrl = url;

  if (typeof url === "string" && (url.includes("v.douyin.com") || url.includes("/share/slides/"))) {
    try {
      let resolvedUrl = url;
      if (url.includes("v.douyin.com")) {
        const fetchRes = await scraperFetch(
          {
            url,
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            rawResponse: true,
          },
          "Douyin Resolver"
        );
        if (fetchRes?.url) resolvedUrl = fetchRes.url;
      }
      const slidesMatch = resolvedUrl.match(new RegExp("share/slides/([0-9]{15,22})", "i"));
      if (slidesMatch?.[1]) {
        targetUrl = "https://www.iesdouyin.com/share/video/" + slidesMatch[1] + "/";
      } else if (resolvedUrl && resolvedUrl !== url) {
        targetUrl = resolvedUrl;
      }
    } catch (e) {
      console.warn("[Mori] Douyin resolver warning:", e);
    }
  }

  const c = await loadCoreScrapers();
  let res;
  try {
    res = await c.scrapeDouyin(targetUrl, ...rest);
    if (!res || !res.status) {
      await new Promise((r) => setTimeout(r, 400));
      res = await c.scrapeDouyin(targetUrl, ...rest);
    }
  } catch (err) {
    await new Promise((r) => setTimeout(r, 400));
    res = await c.scrapeDouyin(targetUrl, ...rest);
  }

  if (res) {
    if (res.result) res.result.sourceUrl = originalUrl;
    if (res.data) res.data.sourceUrl = originalUrl;
    res.sourceUrl = originalUrl;
  }
  return res;
}

export async function scrapeThreads(...args) { return (await loadCoreScrapers()).scrapeThreads(...args); }
export async function scrapePinterest(...args) { return (await loadCoreScrapers()).scrapePinterest(...args); }
export async function scrapeAppleMusic(...args) { return (await loadCoreScrapers()).scrapeAppleMusic(...args); }
export async function scrapeFacebook(...args) { return (await loadCoreScrapers()).scrapeFacebook(...args); }
export async function scrapeBandcamp(...args) { return (await loadCoreScrapers()).scrapeBandcamp(...args); }
export async function scrapeReddit(...args) { return (await loadCoreScrapers()).scrapeReddit(...args); }
export async function scrapeTeraBox(...args) { return (await loadCoreScrapers()).scrapeTeraBox(...args); }
