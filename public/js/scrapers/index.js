// Protected under GNU General Public License v3.0.
// All rights reserved (C) 2026 coflyn.

import * as utils from "../utils/index.js";
import * as urlUtils from "../utils/urlUtils.js";
import * as core from "../modules/core.js";

export * from "./httpHelper.js";

// Expose dependencies to global bridge for the compiled core
window.__moriDeps = { utils, urlUtils, core };

let _corePromise = null;

async function obtainEngineSecret(challenge) {
  if (typeof window.MoriMainBridge?.getEngineSecurityKey === "function") {
    try {
      const hex = window.MoriMainBridge.getEngineSecurityKey(challenge);
      if (hex === "UNAUTHORIZED_CLONE") {
        throw new Error("Mori Engine: Unauthorized application distribution.");
      }
      if (hex && hex.length >= 32) return hex;
    } catch (e) {
      if (e.message?.includes("Unauthorized")) throw e;
    }
  }

  if (
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke
  ) {
    const invoke =
      window.__TAURI__?.core?.invoke ||
      window.__TAURI_INTERNALS__?.invoke ||
      window.__TAURI__?.invoke;
    try {
      const hex = await invoke("tauri_get_engine_key", { challenge });
      if (hex && hex.length >= 32) return hex;
    } catch (_) {}
  }

  throw new Error("Mori Engine: Native security verification failed.");
}

async function loadCoreScrapers() {
  if (_corePromise) return _corePromise;
  _corePromise = (async () => {
    try {
      let arrayBuf = null;

      if (
        window.__TAURI__?.core?.invoke ||
        window.__TAURI_INTERNALS__?.invoke ||
        window.__TAURI__?.invoke
      ) {
        const invoke =
          window.__TAURI__?.core?.invoke ||
          window.__TAURI_INTERNALS__?.invoke ||
          window.__TAURI__?.invoke;
        try {
          const rawBytes = await invoke("tauri_read_file_bytes", {
            path: "public/js/scrapers.bin",
          });
          arrayBuf = new Uint8Array(rawBytes).buffer;
        } catch (_) {}
      }

      if (!arrayBuf && window.Capacitor?.Plugins?.Filesystem) {
        try {
          const fs = window.Capacitor.Plugins.Filesystem;
          const readRes = await fs.readFile({ path: "public/js/scrapers.bin" });
          if (readRes?.data) {
            const binStr = atob(readRes.data);
            const len = binStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
            arrayBuf = bytes.buffer;
          }
        } catch (_) {}
      }

      if (!arrayBuf) {
        const binUrls = [
          "js/scrapers.bin",
          "/js/scrapers.bin",
          "./js/scrapers.bin",
        ];
        for (const u of binUrls) {
          try {
            const res = await fetch(u);
            if (res.ok) {
              arrayBuf = await res.arrayBuffer();
              break;
            }
          } catch (_) {}
        }
      }

      if (!arrayBuf)
        throw new Error("Could not locate scrapers.bin binary payload");

      const bytes = new Uint8Array(arrayBuf);

      const challenge =
        Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const hexKey = await obtainEngineSecret(challenge);

      if (!hexKey || hexKey.length < 32) {
        throw new Error("Security verification handshake failed");
      }

      const key = new Uint8Array(hexKey.length / 2);
      for (let i = 0; i < key.length; i++) {
        const encByte = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
        const ch = challenge.charCodeAt(i % challenge.length);
        key[i] = encByte ^ ch;
      }

      const deobf = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        deobf[i] = bytes[i] ^ key[i % key.length] ^ ((i * 7) & 0xff);
      }

      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(deobf);
      writer.close();
      const decompressedBuf = await new Response(ds.readable).arrayBuffer();
      const scriptText = new TextDecoder().decode(decompressedBuf);

      const fn = new Function(
        scriptText +
          "\nreturn typeof __MoriCoreScrapers !== 'undefined' ? __MoriCoreScrapers : window.__MoriCoreScrapers;",
      );
      const mod = fn();

      if (!mod) {
        throw new Error("Core engine exports missing after execution");
      }

      window.__MoriCoreScrapers = mod;
      return mod;
    } catch (e) {
      console.error("[Mori Engine] Core runtime loading failed:", e);
      throw e;
    }
  })();
  return _corePromise;
}

export async function scrapeTikTok(...args) {
  return (await loadCoreScrapers()).scrapeTikTok(...args);
}
export function setTikTokSource(...args) {
  loadCoreScrapers().then((m) => m.setTikTokSource(...args));
}

export async function scrapeYouTube(...args) {
  return (await loadCoreScrapers()).scrapeYouTube(...args);
}
export function setYouTubeSource(...args) {
  loadCoreScrapers().then((m) => m.setYouTubeSource(...args));
}

export async function scrapeInstagram(...args) {
  return (await loadCoreScrapers()).scrapeInstagram(...args);
}
export function setInstagramSource(...args) {
  loadCoreScrapers().then((m) => m.setInstagramSource(...args));
}

export async function scrapeTwitter(...args) {
  return (await loadCoreScrapers()).scrapeTwitter(...args);
}
export function setTwitterSource(...args) {
  loadCoreScrapers().then((m) => m.setTwitterSource(...args));
}

export async function scrapeSpotify(...args) {
  return (await loadCoreScrapers()).scrapeSpotify(...args);
}
export function setSpotifySource(...args) {
  loadCoreScrapers().then((m) => m.setSpotifySource(...args));
}

export async function scrapeBilibili(...args) {
  return (await loadCoreScrapers()).scrapeBilibili(...args);
}
export async function scrapePixiv(...args) {
  return (await loadCoreScrapers()).scrapePixiv(...args);
}
export async function scrapeRedNote(...args) {
  return (await loadCoreScrapers()).scrapeRedNote(...args);
}
export async function scrapeDouyin(...args) {
  return (await loadCoreScrapers()).scrapeDouyin(...args);
}
export async function scrapeThreads(...args) {
  return (await loadCoreScrapers()).scrapeThreads(...args);
}
export async function scrapePinterest(...args) {
  return (await loadCoreScrapers()).scrapePinterest(...args);
}
export async function scrapeAppleMusic(...args) {
  return (await loadCoreScrapers()).scrapeAppleMusic(...args);
}
export async function scrapeFacebook(...args) {
  return (await loadCoreScrapers()).scrapeFacebook(...args);
}
export async function scrapeBandcamp(...args) {
  return (await loadCoreScrapers()).scrapeBandcamp(...args);
}
