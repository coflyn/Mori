import {
  Filesystem,
  pauseAllMedia,
  stopAllMedia,
  showToast,
  triggerHaptic,
} from "../utils/index.js";
import { showConfirm } from "./modals.js";
import { t } from "../i18n/index.js";
import { createVideoPlayer } from "../components/player.js";

const VIDEO_EXT = /\.(mp4|mov|mkv|webm|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|opus|flac|wav|ogg)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;
const PDF_EXT = /\.(pdf)$/i;

let galleryItems = [];
let galleryFilter = "all";
let gallerySort = localStorage.getItem("mori_gallery_sort") || "newest";
let galleryQuery = "";
let activeScanPromise = null;
let searchDebounceTimer = null;
const cardCache = new Map();
let galleryNeedsRescan = false;

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fileCategory(name) {
  if (VIDEO_EXT.test(name)) return "video";
  if (AUDIO_EXT.test(name)) return "audio";
  if (IMAGE_EXT.test(name)) return "image";
  if (PDF_EXT.test(name)) return "pdf";
  return null;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function toLocalMediaUrl(pathOrUri) {
  if (!pathOrUri) return "";
  const raw = String(pathOrUri);
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("content://") ||
    raw.startsWith("capacitor://") ||
    raw.startsWith("asset://")
  ) {
    return raw;
  }
  let p = raw;
  try {
    p = decodeURIComponent(p);
  } catch (_) {}
  if (p.includes("_capacitor_file_")) {
    p = p.substring(p.indexOf("_capacitor_file_") + 16);
  }
  p = p.replace(/^file:\/\//i, "");

  const platform = window.Capacitor?.getPlatform?.();
  if (!p.startsWith("/")) {
    if (platform === "android") p = "/storage/emulated/0/" + p;
    else p = "/" + p;
  }
  return window.Capacitor?.convertFileSrc
    ? window.Capacitor.convertFileSrc("file://" + p)
    : "file://" + p;
}

export function getGalleryScanFolders() {
  const folders = [];
  const add = (path) => {
    if (path && typeof path === "string") {
      const trimmed = path.trim();
      if (trimmed && !folders.includes(trimmed)) folders.push(trimmed);
    }
  };
  add(localStorage.getItem("mori_download_path") || "Download/Mori");
  add(localStorage.getItem("mori_video_path"));
  add(localStorage.getItem("mori_music_path") || "Music/Mori");
  add("Download/Mori/Music");
  add(localStorage.getItem("mori_photo_path") || "Pictures/Mori");
  add(localStorage.getItem("mori_pdf_path") || "Documents/Mori");
  return folders;
}

export function isGalleryEnabled() {
  return localStorage.getItem("mori_show_gallery") !== "false";
}

export async function scanGallery(force = false) {
  if (!isGalleryEnabled()) return [];
  if (activeScanPromise) return activeScanPromise;
  if (!force && galleryItems.length > 0) return galleryItems;

  activeScanPromise = (async () => {
    try {
      const folders = getGalleryScanFolders();
      const items = [];
      const seen = new Set();

      // Recursively collect files from directories (handles nested music folders)
      async function collectRecursive(dirPath, directory) {
        try {
          const res = await Filesystem.readdir({ path: dirPath, directory });
          for (const file of res.files || []) {
            if (file.type === "directory") {
              const subPath = dirPath ? `${dirPath}/${file.name}` : file.name;
              await collectRecursive(subPath, directory);
            } else {
              const cat = fileCategory(file.name);
              if (!cat) continue;
              const relPath = (
                dirPath ? `${dirPath}/${file.name}` : file.name
              ).replace(/\/+/g, "/");
              const key = relPath.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              items.push({
                name: file.name,
                path: relPath,
                directory,
                category: cat,
                size: file.size || 0,
                mtime: file.mtime ? new Date(file.mtime).getTime() : 0,
                folder: null,
              });
            }
          }
        } catch (_) {}
      }

      if (Filesystem) {
        const dirs = [
          { directory: "EXTERNAL_STORAGE" },
          { directory: "EXTERNAL" },
          { directory: "DOCUMENTS" },
        ];
        for (const folder of folders) {
          for (const dir of dirs) {
            await collectRecursive(folder, dir.directory);
          }
        }
      }

      items.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
      galleryItems = items;
      const validPaths = new Set(items.map((i) => i.path));
      for (const [cachedPath, cachedCard] of cardCache.entries()) {
        if (!validPaths.has(cachedPath)) {
          stopAllMedia(cachedCard);
          cardCache.delete(cachedPath);
        }
      }
      return items;
    } finally {
      activeScanPromise = null;
    }
  })();

  return activeScanPromise;
}

let cachedHistoryList = null;
let lastHistoryLoadTime = 0;
let historyPathMap = new Map();
let historyNameMap = new Map();
let historyBaseMap = new Map();

function buildHistoryIndices(history) {
  historyPathMap = new Map();
  historyNameMap = new Map();
  historyBaseMap = new Map();
  if (!Array.isArray(history)) return;

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (!h) continue;

    const addIndex = (rawP, rawN) => {
      if (rawP) {
        const p = String(rawP).toLowerCase().trim();
        if (p) {
          historyPathMap.set(p, h);
          const slashIdx = p.lastIndexOf("/");
          if (slashIdx !== -1) {
            historyNameMap.set(p.slice(slashIdx + 1), h);
          }
        }
      }
      if (rawN) {
        const n = String(rawN).toLowerCase().trim();
        if (n) {
          historyNameMap.set(n, h);
          const base = n.replace(/\.[^.]+$/, "");
          if (base) historyBaseMap.set(base, h);
        }
      }
    };

    if (h.localUri) addIndex(h.localUri, null);

    if (Array.isArray(h.localFiles)) {
      for (const f of h.localFiles) {
        addIndex(f.path || f.uri, f.name || f.title);
      }
    }

    if (Array.isArray(h.downloads)) {
      for (const dl of h.downloads) {
        addIndex(dl.path || dl.uri, dl.filename || dl.name);
      }
    }

    if (h.title) {
      const cleanHTitle = String(h.title)
        .toLowerCase()
        .replace(/[\W_]+/g, " ")
        .trim();
      if (cleanHTitle) historyBaseMap.set(cleanHTitle, h);
    }
  }
}

function getCachedHistory() {
  const now = Date.now();
  if (!cachedHistoryList || now - lastHistoryLoadTime > 800) {
    try {
      cachedHistoryList = JSON.parse(
        localStorage.getItem("mori_history") || "[]",
      );
      lastHistoryLoadTime = now;
      buildHistoryIndices(cachedHistoryList);
    } catch (_) {
      cachedHistoryList = [];
      buildHistoryIndices([]);
    }
  }
  return cachedHistoryList;
}

function findHistoryRecord(item, historyList = null) {
  if (!item) return null;
  getCachedHistory();

  const rawPath = String(item.path || "").toLowerCase().trim();
  const rawName = String(item.name || "").toLowerCase().trim();
  const itemBase = rawName.replace(/\.[^.]+$/, "");

  // 1. O(1) direct path match
  if (rawPath && historyPathMap.has(rawPath)) {
    return historyPathMap.get(rawPath);
  }

  // 2. O(1) filename match
  if (rawName && historyNameMap.has(rawName)) {
    return historyNameMap.get(rawName);
  }

  // 3. O(1) basename match
  if (itemBase && historyBaseMap.has(itemBase)) {
    return historyBaseMap.get(itemBase);
  }

  // 4. O(1) sanitized title match
  const cleanItemBase = itemBase.replace(/[\W_]+/g, " ").trim();
  if (cleanItemBase && historyBaseMap.has(cleanItemBase)) {
    return historyBaseMap.get(cleanItemBase);
  }

  return null;
}

function sortItems(items) {
  const history = getCachedHistory();
  const favInfoMap = new Map();
  for (const item of items) {
    const h = findHistoryRecord(item, history);
    favInfoMap.set(item.path, {
      isFav: !!h?.favorite,
      favTime: h?.favoriteAt || h?.timestamp || item.mtime || 0,
    });
  }

  const sorted = [...items];
  return sorted.sort((a, b) => {
    const favA = favInfoMap.get(a.path)?.isFav;
    const favB = favInfoMap.get(b.path)?.isFav;

    // Favorites always at the top!
    if (favA && !favB) return -1;
    if (!favA && favB) return 1;
    if (favA && favB) {
      const diff =
        (favInfoMap.get(b.path)?.favTime || 0) -
        (favInfoMap.get(a.path)?.favTime || 0);
      if (diff !== 0) return diff;
    }

    switch (gallerySort) {
      case "oldest":
        return a.mtime - b.mtime;
      case "name":
        return a.name.localeCompare(b.name);
      case "largest":
        return (b.size || 0) - (a.size || 0);
      case "smallest":
        return (a.size || 0) - (b.size || 0);
      default:
        return b.mtime - a.mtime;
    }
  });
}

function filteredItems() {
  let items = galleryItems;
  if (galleryFilter !== "all") {
    items = items.filter(
      (i) =>
        i.category === galleryFilter ||
        (galleryFilter === "pdf" && i.category === "doc"),
    );
  }
  if (galleryQuery) {
    const q = galleryQuery.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q));
  }
  return sortItems(items);
}

function galleryFallbackIcon(category) {
  const placeholder = document.createElement("div");
  placeholder.className = "gallery-media-icon";
  const icons = {
    video:
      '<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>',
    audio:
      '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>',
    doc: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>',
  };
  placeholder.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">${icons[category] || icons.doc}</svg>`;
  return placeholder;
}

const TRANSPARENT_POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
const GALLERY_THUMB_KEY = "mori_gallery_thumbs";
const GALLERY_THUMB_VER = "6";
const memoryThumbCache = new Map();

function loadPersistentThumbs() {
  try {
    const curVer = localStorage.getItem("mori_gallery_thumb_ver");
    if (curVer !== GALLERY_THUMB_VER) {
      localStorage.removeItem(GALLERY_THUMB_KEY);
      localStorage.setItem("mori_gallery_thumb_ver", GALLERY_THUMB_VER);
      return;
    }
    const raw = localStorage.getItem(GALLERY_THUMB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.length > 0) {
          memoryThumbCache.set(k, v);
        }
      }
    }
  } catch (_) {}
}
loadPersistentThumbs();

let saveThumbTimeout = null;
function persistThumb(path, dataUrl) {
  if (!path || !dataUrl) return;
  memoryThumbCache.set(path, dataUrl);
  if (saveThumbTimeout) clearTimeout(saveThumbTimeout);
  saveThumbTimeout = setTimeout(() => {
    try {
      const obj = {};
      const entries = Array.from(memoryThumbCache.entries()).slice(-250);
      for (const [k, v] of entries) {
        obj[k] = v;
      }
      localStorage.setItem(GALLERY_THUMB_KEY, JSON.stringify(obj));
    } catch (_) {}
  }, 500);
}

function isValidThumb(t) {
  return typeof t === "string" && t.length > 0 && !t.startsWith("thumb_");
}

function getThumbFromHistory(item) {
  if (!item) return null;
  try {
    const h = findHistoryRecord(item);
    if (!h) return null;

    const rawPath = String(item.path || "").toLowerCase();
    const rawName = String(item.name || "").toLowerCase();
    const itemBase = rawName.replace(/\.[^.]+$/, "");

    if (Array.isArray(h.localFiles)) {
      for (const f of h.localFiles) {
        const fp = String(f.path || f.uri || "").toLowerCase();
        const fn = String(f.name || f.title || "").toLowerCase();
        const fBase = fn.replace(/\.[^.]+$/, "");
        if (
          (fp && (fp === rawPath || fp.endsWith("/" + rawName))) ||
          (fn && (fn === rawName || fBase === itemBase))
        ) {
          const cand = f.thumbnail || h.localThumbnail || h.thumbnail;
          if (cand && isValidThumb(cand)) return toLocalMediaUrl(cand);
        }
      }
    }

    const cand = h.localThumbnail || h.thumbnail;
    if (cand && isValidThumb(cand)) {
      return toLocalMediaUrl(cand);
    }
    return null;
  } catch (_) {
    return null;
  }
}

export async function deleteGalleryItem(item) {
  if (!item) return false;
  let deleted = false;

  // 1. Android Native Bridge
  if (window.MoriMainBridge?.deleteFile) {
    try {
      deleted = window.MoriMainBridge.deleteFile(item.path);
      if (!deleted && !item.path?.startsWith("/")) {
        deleted = window.MoriMainBridge.deleteFile(
          "/storage/emulated/0/" + (item.path || "").replace(/^\/+/, ""),
        );
      }
    } catch (e) {
      console.warn("MoriMainBridge.deleteFile failed:", e);
    }
  }

  // 2. Capacitor Filesystem fallback
  if (!deleted && Filesystem) {
    if (item.directory && item.path) {
      try {
        await Filesystem.deleteFile({
          path: item.path,
          directory: item.directory,
        });
        deleted = true;
      } catch (_) {}
    }
    if (!deleted && item.path) {
      let clean = item.path
        .replace(/^.*\/storage\/emulated\/0\//, "")
        .replace(/^\//, "");
      try {
        clean = decodeURIComponent(clean);
      } catch (_) {}
      const dirs = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
      for (const d of dirs) {
        try {
          await Filesystem.deleteFile({ path: clean, directory: d });
          deleted = true;
          break;
        } catch (_) {}
      }
    }
  }

  // Update gallery state & cache
  const idx = galleryItems.findIndex((i) => i.path === item.path);
  if (idx !== -1) {
    galleryItems.splice(idx, 1);
  }
  const cachedCard = cardCache.get(item.path);
  if (cachedCard) {
    stopAllMedia(cachedCard);
    cachedCard.remove();
    cardCache.delete(item.path);
  }
  memoryThumbCache.delete(item.path);
  memoryThumbCache.delete(item.name);

  // Clean from mori_history localFiles / localUri if referenced
  try {
    const rawHist = localStorage.getItem("mori_history");
    if (rawHist) {
      const hist = JSON.parse(rawHist);
      let changed = false;
      const itemName = String(item.name || "").toLowerCase();
      const itemPath = String(item.path || "").toLowerCase();
      for (const h of hist) {
        if (Array.isArray(h.localFiles)) {
          const prevLen = h.localFiles.length;
          h.localFiles = h.localFiles.filter((f) => {
            const fp = String(f.path || f.uri || "").toLowerCase();
            const fn = String(f.name || f.title || "").toLowerCase();
            return !(
              fp === itemPath ||
              fn === itemName ||
              (itemPath && fp.endsWith("/" + itemName))
            );
          });
          if (h.localFiles.length !== prevLen) changed = true;
        }
        if (h.localUri) {
          const lu = String(h.localUri).toLowerCase();
          if (lu === itemPath || lu.endsWith("/" + itemName)) {
            delete h.localUri;
            changed = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem("mori_history", JSON.stringify(hist));
        cachedHistoryList = null;
        window.dispatchEvent(new CustomEvent("mori_history_updated"));
      }
    }
  } catch (_) {}

  renderGallery();
  return deleted;
}

export function confirmDeleteGalleryItem(item, onDeleted = null) {
  if (!item) return;
  const title = t("gallery-delete-title") || t("btn-delete") || "Delete File";
  const msg =
    t("gallery-delete-confirm") ||
    `Delete "${item.name}" permanently from your device?`;

  showConfirm(title, msg, async () => {
    try {
      await deleteGalleryItem(item);
      onDeleted?.();
      showToast(t("gallery-file-deleted") || "File deleted");
    } catch (e) {
      console.error("Failed to delete gallery item:", e);
      showToast(t("toast-delete-fail") || "Failed to delete file");
    }
  });
}

// Queue for asynchronous native / canvas thumbnail extraction
const thumbQueue = [];
let activeThumbWorkers = 0;
const MAX_CONCURRENT_THUMBS = 2;

function enqueueThumbTask(workFn) {
  thumbQueue.push(workFn);
  processNextThumbTask();
}

function processNextThumbTask() {
  while (activeThumbWorkers < MAX_CONCURRENT_THUMBS && thumbQueue.length > 0) {
    activeThumbWorkers++;
    const workFn = thumbQueue.shift();
    let doneCalled = false;
    const onDone = () => {
      if (doneCalled) return;
      doneCalled = true;
      activeThumbWorkers--;
      processNextThumbTask();
    };
    try {
      workFn(onDone);
    } catch (_) {
      onDone();
    }
  }
}

function extractCanvasThumb(mediaUrl, onData) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.poster = TRANSPARENT_POSTER;
  video.setAttribute("playsinline", "");

  let done = false;
  let timer = null;
  const cleanup = () => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    video.removeAttribute("src");
    try {
      video.load();
    } catch (_) {}
  };

  const capture = () => {
    if (done) return;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      done = true;
      if (timer) clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 640;
        const scale = Math.min(
          maxDim / video.videoWidth,
          maxDim / video.videoHeight,
          1.0,
        );
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        onData(dataUrl);
      } catch (_) {}
      cleanup();
    }
  };

  timer = setTimeout(cleanup, 3500);

  video.addEventListener("loadeddata", () => {
    try {
      const mark = Math.min(1.0, Math.max(0.1, (video.duration || 2) * 0.1));
      if (mark > 0.1 && video.currentTime < mark) {
        setTimeout(capture, 400);
        video.currentTime = mark;
        return;
      }
    } catch (_) {}
    capture();
  });

  video.addEventListener("seeked", capture);
  video.addEventListener("error", cleanup);

  const canFragment =
    /^(https?|file|asset):/i.test(mediaUrl) || mediaUrl.startsWith("/");
  video.src = canFragment ? `${mediaUrl}#t=0.5` : mediaUrl;
}

function loadVideoThumbnailAsync(item, img) {
  // 1. Memory / localStorage cache
  const cached =
    memoryThumbCache.get(item.path) || memoryThumbCache.get(item.name);
  if (cached) {
    img.src = cached;
    return;
  }

  // 2. High priority: Mori download history cache (instant synchronous cover)
  const fromHist = getThumbFromHistory(item);
  if (fromHist) {
    persistThumb(item.path, fromHist);
    img.src = fromHist;
    return;
  }

  // 3. Native Android / iOS bridge or fallback canvas
  enqueueThumbTask(async (onDone) => {
    try {
      let thumb = null;
      if (window.MoriMainBridge?.getVideoThumbnail) {
        try {
          thumb = window.MoriMainBridge.getVideoThumbnail(item.path);
          if (!thumb && !item.path?.startsWith("/")) {
            thumb = window.MoriMainBridge.getVideoThumbnail(
              "/storage/emulated/0/" + (item.path || "").replace(/^\/+/, ""),
            );
          }
        } catch (_) {}
      } else if (window.Capacitor?.Plugins?.MoriSecurity?.getVideoThumbnail) {
        try {
          const res = await window.Capacitor.Plugins.MoriSecurity.getVideoThumbnail({
            path: item.path,
          }).catch(() => null);
          if (res?.thumbnail) thumb = res.thumbnail;
        } catch (_) {}
      }

      if (thumb && typeof thumb === "string" && !thumb.startsWith("thumb_")) {
        persistThumb(item.path, thumb);
        img.src = thumb;
        onDone();
        return;
      }

      // 4. Fallback: Video element canvas capture
      const mediaUrl = toLocalMediaUrl(item.path);
      extractCanvasThumb(mediaUrl, (dataUrl) => {
        if (dataUrl) {
          persistThumb(item.path, dataUrl);
          img.src = dataUrl;
        }
      });
      setTimeout(onDone, 200);
    } catch (_) {
      onDone();
    }
  });
}

function createVideoThumb(item) {
  const img = document.createElement("img");
  img.className = "gallery-video-thumb";
  img.alt = item.name || "video";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.style.opacity = "0";

  img.onload = () => {
    img.style.opacity = "1";
    img.classList.add("loaded");
  };
  img.onerror = () => {
    img.remove();
  };

  loadVideoThumbnailAsync(item, img);

  return img;
}

function defaultPdfThumbHTML() {
  return `
    <div class="gallery-pdf-icon-wrap">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    </div>
  `;
}

let pdfjsLibPromise = null;
async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/vendor/pdf.min.js";
      script.onload = () => resolve(window.pdfjsLib);
      script.onerror = () => {
        pdfjsLibPromise = null;
        reject(new Error("Failed to load pdf.min.js"));
      };
      document.head.appendChild(script);
    });
  }
  return pdfjsLibPromise;
}

async function generatePdfCoverThumbnail(item) {
  try {
    await ensurePdfJs();
    if (!window.pdfjsLib) return null;
    const bytes = await fetchPdfBytes(item);
    if (!bytes || bytes.length === 0) return null;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "js/vendor/pdf.worker.min.js";
    const loadingTask = window.pdfjsLib.getDocument({
      data: bytes,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
    });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 1.0 });
    const targetW = 640;
    const scale = targetW / vp.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    try {
      pdfDoc.destroy();
    } catch (_) {}
    return dataUrl;
  } catch (_) {
    return null;
  }
}

function createPdfThumb(item) {
  const wrap = document.createElement("div");
  wrap.className = "gallery-pdf-thumb";

  const img = document.createElement("img");
  img.className = "gallery-video-thumb";
  img.alt = item?.name || "pdf";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.style.opacity = "0";

  img.onload = () => {
    wrap.classList.add("has-image");
    img.style.opacity = "1";
    img.classList.add("loaded");
  };
  img.onerror = () => {
    wrap.classList.remove("has-image");
    img.remove();
  };
  wrap.appendChild(img);

  const fallback = document.createElement("div");
  fallback.className = "gallery-pdf-fallback-content";
  fallback.innerHTML = defaultPdfThumbHTML();
  wrap.appendChild(fallback);

  // 1. Check memory / localStorage cache
  const cached =
    item && (memoryThumbCache.get(item.path) || memoryThumbCache.get(item.name));
  if (cached) {
    img.src = cached;
    return wrap;
  }

  // 2. Check history
  const fromHist = item && getThumbFromHistory(item);
  if (fromHist) {
    persistThumb(item.path, fromHist);
    img.src = fromHist;
    return wrap;
  }

  // 3. Fallback: generate page 1 thumbnail from PDF bytes
  if (item) {
    enqueueThumbTask(async (onDone) => {
      try {
        const cover = await generatePdfCoverThumbnail(item);
        if (cover) {
          persistThumb(item.path, cover);
          img.src = cover;
        }
      } finally {
        onDone();
      }
    });
  }

  return wrap;
}

function createAudioThumb(item) {
  const wrap = document.createElement("div");
  wrap.className = "gallery-audio-thumb";

  const fallback = document.createElement("div");
  fallback.className = "gallery-audio-fallback-content";
  fallback.innerHTML = `
    <div class="gallery-audio-icon-wrap">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    </div>
  `;
  wrap.appendChild(fallback);

  const img = document.createElement("img");
  img.alt = item?.name || "audio";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.style.opacity = "0";

  img.onload = () => {
    wrap.classList.add("has-image");
    img.style.opacity = "1";
    img.classList.add("loaded");
  };
  img.onerror = () => {
    wrap.classList.remove("has-image");
    img.remove();
  };
  wrap.appendChild(img);

  // 1. Check memory / localStorage cache
  const cached =
    item && (memoryThumbCache.get(item.path) || memoryThumbCache.get(item.name));
  if (cached) {
    img.src = cached;
    return wrap;
  }

  // 2. Check history
  const fromHist = item && getThumbFromHistory(item);
  if (fromHist) {
    persistThumb(item.path, fromHist);
    img.src = fromHist;
    return wrap;
  }

  return wrap;
}

function buildItem(item) {
  const card = document.createElement("div");
  card.className = `gallery-item cat-${item.category}`;
  card.setAttribute("data-name", item.name);
  card.setAttribute("data-path", item.path);

  const hRecord = findHistoryRecord(item);
  const isFav = !!hRecord?.favorite;
  if (isFav) {
    card.classList.add("is-favorite");
  }

  const mediaUrl = toLocalMediaUrl(item.path);
  const thumb = document.createElement("div");
  thumb.className = "gallery-thumb";
  const label = document.createElement("span");
  label.className = "gallery-cat-badge";
  label.textContent = item.category;

  if (item.category === "image") {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.alt = item.name;
    img.style.opacity = "0";
    img.onload = () => {
      img.style.opacity = "1";
    };
    img.onerror = () => {
      img.remove();
    };
    img.src = mediaUrl;
    if (img.complete && img.naturalWidth > 0) img.style.opacity = "1";
    thumb.appendChild(img);
  } else if (item.category === "video") {
    thumb.appendChild(createVideoThumb(item));
    const play = document.createElement("span");
    play.className = "gallery-play-badge";
    play.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    thumb.appendChild(play);
  } else if (item.category === "audio") {
    thumb.appendChild(createAudioThumb(item));
    const play = document.createElement("span");
    play.className = "gallery-play-badge";
    play.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    thumb.appendChild(play);
  } else if (item.category === "pdf" || item.category === "doc") {
    thumb.appendChild(createPdfThumb(item));
  } else {
    thumb.appendChild(galleryFallbackIcon(item.category));
  }
  thumb.appendChild(label);

  if (isFav) {
    const favBadge = document.createElement("span");
    favBadge.className = "gallery-fav-badge";
    favBadge.setAttribute("title", "Favorite");
    favBadge.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="#ff3b5c" stroke="#ff3b5c" stroke-width="1.5">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    `;
    thumb.appendChild(favBadge);
  }

  const meta = document.createElement("div");
  meta.className = "gallery-meta";
  meta.innerHTML = `
    <div class="gallery-meta-text">
      <h4 title="${esc(item.name)}">${esc(item.name.length > 34 ? item.name.slice(0, 31) + "..." : item.name)}</h4>
      <p>${item.mtime ? new Date(item.mtime).toLocaleDateString([], { dateStyle: "medium" }) : ""}${formatBytes(item.size) ? " · " + formatBytes(item.size) : ""}</p>
    </div>
    <button class="gallery-card-del-btn" type="button" aria-label="${t("btn-delete") || "Delete"}" title="${t("btn-delete") || "Delete"}">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    </button>
  `;
  card.appendChild(thumb);
  card.appendChild(meta);

  meta.querySelector(".gallery-card-del-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    confirmDeleteGalleryItem(item);
  });

  let pressTimer = null;
  let isLongPress = false;
  let startX = 0;
  let startY = 0;

  const startPress = (e) => {
    isLongPress = false;
    if (e.touches && e.touches[0]) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
    pressTimer = setTimeout(() => {
      isLongPress = true;
      try {
        window.getSelection()?.removeAllRanges();
      } catch (_) {}
      triggerHaptic?.("medium");
      confirmDeleteGalleryItem(item);
    }, 550);
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const movePress = (e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 || dy > 10) cancelPress();
    }
  };

  card.addEventListener("touchstart", startPress, { passive: true });
  card.addEventListener("touchend", cancelPress);
  card.addEventListener("touchmove", movePress, { passive: true });
  card.addEventListener("touchcancel", cancelPress);
  card.addEventListener("mousedown", (e) => {
    if (e.button === 0) startPress(e);
  });
  card.addEventListener("mouseup", cancelPress);
  card.addEventListener("mouseleave", cancelPress);
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    confirmDeleteGalleryItem(item);
  });

  card.addEventListener("click", (e) => {
    if (e.target.closest(".gallery-card-del-btn")) return;
    if (isLongPress) {
      e.preventDefault();
      e.stopPropagation();
      isLongPress = false;
      return;
    }
    openGalleryViewer(item);
  });

  return card;
}

function syncCardFavoriteState(card, item) {
  const hRecord = findHistoryRecord(item);
  const isFav = !!hRecord?.favorite;
  card.classList.toggle("is-favorite", isFav);

  const thumb = card.querySelector(".gallery-thumb");
  if (!thumb) return;
  const favBadge = thumb.querySelector(".gallery-fav-badge");
  if (isFav) {
    if (!favBadge) {
      const badge = document.createElement("span");
      badge.className = "gallery-fav-badge";
      badge.setAttribute("title", "Favorite");
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="#ff3b5c" stroke="#ff3b5c" stroke-width="1.5">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      `;
      thumb.appendChild(badge);
    }
  } else if (favBadge) {
    favBadge.remove();
  }
}

const BATCH_SIZE = 24;
let galleryRenderLimit = BATCH_SIZE;
let galleryScrollObserver = null;

function setupGalleryInfiniteScroll(sentinel) {
  if (galleryScrollObserver) {
    galleryScrollObserver.disconnect();
  }
  galleryScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreGalleryItems();
      }
    },
    { rootMargin: "350px" },
  );
  galleryScrollObserver.observe(sentinel);
}

function loadMoreGalleryItems() {
  const items = filteredItems();
  if (galleryRenderLimit >= items.length) return;
  galleryRenderLimit += BATCH_SIZE;
  renderGallery(false);
}

function renderGallery(resetLimit = false) {
  const page = document.getElementById("galleryPage");
  if (!page) return;
  const empty = page.querySelector(".gallery-empty");
  const grid = page.querySelector(".gallery-grid");
  if (!grid) return;

  grid.querySelectorAll(".gallery-skeleton-card").forEach((s) => s.remove());

  const countEl = page.querySelector(".gallery-count");
  const items = filteredItems();
  if (countEl) {
    countEl.textContent = `${items.length} ${t("gallery-count-items")}`;
  }

  if (items.length === 0) {
    grid.innerHTML = "";
    empty?.classList.remove("hidden");
    if (galleryScrollObserver) {
      galleryScrollObserver.disconnect();
      galleryScrollObserver = null;
    }
    return;
  }
  empty?.classList.add("hidden");

  if (resetLimit) {
    galleryRenderLimit = BATCH_SIZE;
  }

  const visibleItems = items.slice(0, galleryRenderLimit);
  const visiblePathSet = new Set(visibleItems.map((i) => i.path));
  const existingCards = new Map();

  grid.querySelectorAll(".gallery-item").forEach((card) => {
    const p = card.getAttribute("data-path");
    if (!p || !visiblePathSet.has(p) || existingCards.has(p)) {
      card.remove();
    } else {
      existingCards.set(p, card);
    }
  });

  // Reorder and append cards without destroying existing DOM nodes
  const frag = document.createDocumentFragment();
  visibleItems.forEach((item) => {
    let card = existingCards.get(item.path) || cardCache.get(item.path);
    if (!card) {
      card = buildItem(item);
    } else {
      syncCardFavoriteState(card, item);
    }
    cardCache.set(item.path, card);
    frag.appendChild(card);
  });

  // Prune disconnected cards from cardCache to prevent memory leaks on huge galleries
  if (cardCache.size > 120) {
    for (const [cp, cCard] of cardCache.entries()) {
      if (!cCard.isConnected) {
        stopAllMedia(cCard);
        cardCache.delete(cp);
        if (cardCache.size <= 80) break;
      }
    }
  }

  grid.appendChild(frag);

  // Setup infinite scroll sentinel
  let sentinel = grid.querySelector(".gallery-scroll-sentinel");
  if (items.length > galleryRenderLimit) {
    if (!sentinel) {
      sentinel = document.createElement("div");
      sentinel.className = "gallery-scroll-sentinel";
      sentinel.style.cssText =
        "grid-column: 1 / -1; height: 30px; pointer-events: none; opacity: 0;";
      grid.appendChild(sentinel);
    } else {
      grid.appendChild(sentinel);
    }
    setupGalleryInfiniteScroll(sentinel);
  } else if (sentinel) {
    sentinel.remove();
    if (galleryScrollObserver) {
      galleryScrollObserver.disconnect();
      galleryScrollObserver = null;
    }
  }
}

export function renderGallerySkeleton() {
  const page = document.getElementById("galleryPage");
  const grid = page?.querySelector(".gallery-grid");
  const empty = page?.querySelector(".gallery-empty");
  if (!grid) return;
  empty?.classList.add("hidden");
  grid.innerHTML = `
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
    <div class="gallery-skeleton-card"><div class="gallery-skeleton-thumb"></div><div class="gallery-skeleton-meta"><div class="gallery-skeleton-line title"></div><div class="gallery-skeleton-line short"></div></div></div>
  `;
}

export function renderGalleryToolbar() {
  const page = document.getElementById("galleryPage");
  if (!page) return;
  const chips = page.querySelectorAll(".gallery-chip");
  chips.forEach((chip) => {
    chip.classList.toggle(
      "active",
      chip.getAttribute("data-filter") === galleryFilter,
    );
  });
  const sortText = page.querySelector("#gallerySortText");
  const sortItems = page.querySelectorAll(".gallery-sort-item");
  sortItems.forEach((item) => {
    const isAct = item.getAttribute("data-value") === gallerySort;
    item.classList.toggle("active", isAct);
    if (isAct && sortText) {
      sortText.textContent = item.textContent.trim();
    }
  });
  const searchInput = page.querySelector(".gallery-search");
  if (searchInput && searchInput.value !== galleryQuery) {
    searchInput.value = galleryQuery;
  }
}

function openFileExternal(item) {
  const rawPath = item.path || "";
  // 1. Android Native Bridge
  if (window.MoriMainBridge?.openFile) {
    try {
      if (window.MoriMainBridge.openFile(rawPath)) return;
    } catch (_) {}
  }
  // 2. Fallback
  const url = toLocalMediaUrl(rawPath);
  if (url) {
    window.open(url, "_blank");
  }
}

async function fetchPdfBytes(item) {

  const url = toLocalMediaUrl(item.path);
  if (url) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 0) return new Uint8Array(buf);
      }
    } catch (_) {}
  }

  if (
    window.Capacitor?.isNativePlatform?.() &&
    window.Capacitor.Plugins?.Filesystem
  ) {
    const { Filesystem } = window.Capacitor.Plugins;
    let clean = item.path
      .replace(/^.*\/storage\/emulated\/0\//, "")
      .replace(/^\//, "");
    try {
      clean = decodeURIComponent(clean);
    } catch (_) {}
    const dirs = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
    for (const d of dirs) {
      try {
        const res = await Filesystem.readFile({ path: clean, directory: d });
        if (res && res.data) {
          const bin = atob(res.data);
          const len = bin.length;
          const u8 = new Uint8Array(len);
          for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
          return u8;
        }
      } catch (_) {}
    }
  }

  throw new Error("Unable to read PDF file data");
}

function renderPdfInViewer(body, item, overlay, header) {
  body.classList.add("pdf-mode");

  const extBtn = document.createElement("button");
  extBtn.className = "gallery-viewer-external-btn";
  extBtn.setAttribute("type", "button");
  extBtn.setAttribute(
    "title",
    t("gallery-open-file") || "Open PDF in external app",
  );
  extBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
    </svg>
  `;
  extBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openFileExternal(item);
  });
  const actions = header.querySelector(".gallery-viewer-actions");
  if (actions) {
    actions.insertBefore(extBtn, actions.firstChild);
  } else {
    header.appendChild(extBtn);
  }

  const container = document.createElement("div");
  container.className = "gallery-pdf-viewer";
  container.innerHTML = `
    <div class="gallery-pdf-loading">
      <div class="gallery-pdf-spinner"></div>
      <span>${t("gallery-pdf-loading") || "Loading PDF..."}</span>
    </div>
  `;
  body.appendChild(container);

  let isDestroyed = false;
  let pdfDoc = null;
  let observer = null;

  overlay._pdfCleanup = () => {
    isDestroyed = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (pdfDoc) {
      try {
        pdfDoc.destroy();
      } catch (_) {}
      pdfDoc = null;
    }
  };

  (async () => {
    try {
      await ensurePdfJs();
      if (!window.pdfjsLib) {
        throw new Error("PDF renderer not available");
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "js/vendor/pdf.worker.min.js";

      const bytes = await fetchPdfBytes(item);
      if (isDestroyed) return;

      const loadingTask = window.pdfjsLib.getDocument({
        data: bytes,
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
        cMapPacked: true,
      });

      pdfDoc = await loadingTask.promise;
      if (isDestroyed) {
        pdfDoc.destroy();
        return;
      }

      container.innerHTML = "";

      const subTitle = header.querySelector(".gallery-viewer-title p");
      if (subTitle) {
        subTitle.textContent = `${pdfDoc.numPages} ${t("gallery-pdf-pages") || "pages"} · ${formatBytes(item.size)}`;
      }

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const wrap = document.createElement("div");
        wrap.className = "gallery-pdf-page-wrap";
        wrap.dataset.page = String(pageNum);

        const badge = document.createElement("div");
        badge.className = "gallery-pdf-page-indicator";
        badge.textContent = `${pageNum} / ${pdfDoc.numPages}`;
        wrap.appendChild(badge);

        const canvas = document.createElement("canvas");
        canvas.className = "gallery-pdf-canvas";
        wrap.appendChild(canvas);

        container.appendChild(wrap);
      }

      const renderPage = async (pageNum, canvas, wrap) => {
        if (canvas._rendered || canvas._rendering || isDestroyed) return;
        canvas._rendering = true;
        try {
          const page = await pdfDoc.getPage(pageNum);
          if (isDestroyed) return;

          const containerWidth =
            Math.min(container.clientWidth - 24, 680) || 360;
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: scale * dpr });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${containerWidth}px`;
          canvas.style.height = `${unscaledViewport.height * scale}px`;
          wrap.style.minHeight = `${unscaledViewport.height * scale}px`;

          const ctx = canvas.getContext("2d", { alpha: false });
          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
          canvas._rendered = true;
        } catch (err) {
          if (!isDestroyed) console.warn(`Render page ${pageNum} error:`, err);
        } finally {
          canvas._rendering = false;
        }
      };

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const wrap = entry.target;
              const pNum = parseInt(wrap.dataset.page, 10);
              const c = wrap.querySelector("canvas");
              if (c) renderPage(pNum, c, wrap);
            }
          });
        },
        { root: container, rootMargin: "350px 0px" },
      );

      container.querySelectorAll(".gallery-pdf-page-wrap").forEach((wrap) => {
        observer.observe(wrap);
      });
    } catch (err) {
      if (isDestroyed) return;
      console.error("PDF viewer load failed:", err);
      container.innerHTML = `
        <div class="gallery-doc-card">
          <div class="gallery-doc-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 4V9c0-.55-.45-1-1-1h-2v6h2c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1v-2h1c.55 0 1-.45 1-1zm-2 1h1v1h-1v-1z"/>
            </svg>
          </div>
          <h4 class="gallery-doc-title" title="${esc(item.name)}">${esc(item.name)}</h4>
          <p class="gallery-doc-size">${formatBytes(item.size)}</p>
          <button class="gallery-doc-open-btn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            <span>${t("gallery-open-file") || "Open in External App"}</span>
          </button>
        </div>
      `;
      const btn = container.querySelector(".gallery-doc-open-btn");
      btn?.addEventListener("click", () => openFileExternal(item));
    }
  })();
}

function renderAudioInViewer(body, item, mediaUrl) {
  body.classList.add("audio-mode");

  const card = document.createElement("div");
  card.className = "gallery-audio-card";

  const thumbUrl = getThumbFromHistory(item);
  const makePlaceholder = () => {
    const ph = document.createElement("div");
    ph.className = "gallery-audio-placeholder";
    ph.innerHTML = `
      <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    `;
    return ph;
  };

  if (thumbUrl) {
    const img = document.createElement("img");
    img.className = "gallery-audio-cover";
    img.src = thumbUrl;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      img.replaceWith(makePlaceholder());
    };
    card.appendChild(img);
  } else {
    card.appendChild(makePlaceholder());
  }

  const titleEl = document.createElement("div");
  titleEl.className = "gallery-audio-title";
  titleEl.textContent = item.name ? item.name.replace(/\.[^.]+$/, "") : "Audio";
  card.appendChild(titleEl);

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.style.width = "100%";
  const autoPlaySetting = localStorage.getItem("mori_autoplay") !== "false";
  const loopSetting = localStorage.getItem("mori_loop") !== "false";
  audio.autoplay = false;
  audio.loop = loopSetting;
  if (loopSetting) audio.setAttribute("loop", "");

  audio.addEventListener("ended", () => {
    if (localStorage.getItem("mori_loop") !== "false") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  });

  audio.src = mediaUrl;
  if (autoPlaySetting) audio.play().catch(() => {});

  let audioRetried = false;
  audio.onerror = async () => {
    if (
      !audioRetried &&
      (cleanPath.includes("_capacitor_file_") ||
        cleanPath.startsWith("file://")) &&
      window.Capacitor?.isNativePlatform?.() &&
      window.Capacitor?.Plugins?.Filesystem
    ) {
      audioRetried = true;
      try {
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        let relPath = cleanPath
          .replace(/^.*\/storage\/emulated\/0\//, "")
          .replace(/^\//, "");
        let res;
        for (const d of ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"]) {
          try {
            res = await Filesystem.readFile({ path: relPath, directory: d });
            if (res && res.data) break;
          } catch (_) {}
        }
        if (res && res.data) {
          const byteChars = atob(res.data);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++)
            byteArr[i] = byteChars.charCodeAt(i);
          const mime = cleanPath.toLowerCase().endsWith(".m4a")
            ? "audio/mp4"
            : "audio/mpeg";
          const blob = new Blob([byteArr], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          audio._blobUrl = blobUrl;
          audio.src = blobUrl;
          audio.load();
          if (autoPlaySetting) audio.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Gallery audio Filesystem fallback failed:", err);
      }
    }
  };

  card.appendChild(audio);
  body.appendChild(card);
}

function openGalleryViewer(item) {
  pauseAllMedia(document);
  const overlay = document.createElement("div");
  overlay.className = "gallery-viewer";

  const header = document.createElement("div");
  header.className = "gallery-viewer-header";
  header.innerHTML = `
    <button class="gallery-viewer-back" aria-label="Back">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
    </button>
    <div class="gallery-viewer-title">
      <h3 title="${esc(item.name)}">${esc(item.name)}</h3>
      <p>${esc(item.path)}</p>
    </div>
    <div class="gallery-viewer-actions">
      <button class="gallery-viewer-del-btn" type="button" aria-label="${t("btn-delete") || "Delete"}" title="${t("btn-delete") || "Delete"}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  `;

  header.querySelector(".gallery-viewer-del-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    confirmDeleteGalleryItem(item, () => overlay._close?.());
  });

  const body = document.createElement("div");
  body.className = "gallery-viewer-body";

  const mediaUrl = toLocalMediaUrl(item.path);

  if (item.category === "image") {
    const img = document.createElement("img");
    img.src = mediaUrl;
    img.referrerPolicy = "no-referrer";
    body.appendChild(img);
  } else if (item.category === "pdf" || item.category === "doc") {
    renderPdfInViewer(body, item, overlay, header);
  } else if (item.category === "audio") {
    renderAudioInViewer(body, item, mediaUrl);
  } else {
    const player = createVideoPlayer(
      {
        url: mediaUrl,
        rawUri: item.path,
        rawPath: item.path,
        type: "VIDEO",
        isLocal: true,
        filename: item.name,
        title: item.name,
      },
      0,
      null,
    );
    player.style.maxHeight = "100%";
    player.style.height = "100%";
    player.style.width = "100%";
    body.appendChild(player);
    const autoPlay = localStorage.getItem("mori_autoplay") !== "false";
    if (autoPlay && typeof player._tryAutoPlay === "function") {
      player._tryAutoPlay();
    }
  }

  const info = document.createElement("div");
  info.className = "gallery-viewer-info";
  info.innerHTML = `
    <span>${item.mtime ? new Date(item.mtime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
    ${formatBytes(item.size) ? `<span>${formatBytes(item.size)}</span>` : ""}
  `;

  overlay.appendChild(header);
  overlay.appendChild(body);
  overlay.appendChild(info);
  document.body.appendChild(overlay);

  const close = () => {
    overlay._pdfCleanup?.();
    pauseAllMedia(overlay);
    const player = overlay.querySelector(".mori-player-container");
    if (player && typeof player._cleanup === "function") player._cleanup();
    overlay.querySelectorAll("video, audio").forEach((el) => {
      try {
        el._isStopped = true;
        el.pause();
        if (el.src && el.src.startsWith("blob:")) URL.revokeObjectURL(el.src);
        el.removeAttribute("src");
        el.load();
      } catch (_) {}
    });
    overlay.remove();
  };

  overlay._close = close;
  header.querySelector(".gallery-viewer-back").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  overlay._onKeyRemove = () => document.removeEventListener("keydown", onKey);
  const origRemove = overlay.remove.bind(overlay);
  overlay.remove = () => {
    overlay._pdfCleanup?.();
    overlay._onKeyRemove?.();
    origRemove();
  };
}

function areItemsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].path !== b[i].path ||
      a[i].size !== b[i].size ||
      a[i].mtime !== b[i].mtime
    ) {
      return false;
    }
  }
  return true;
}

export function invalidateGalleryCache() {
  cardCache.clear();
  memoryThumbCache.clear();
  try {
    localStorage.removeItem(GALLERY_THUMB_KEY);
  } catch (_) {}
  galleryItems = [];
  galleryNeedsRescan = true;
  const page = document.getElementById("galleryPage");
  const grid = page?.querySelector(".gallery-grid");
  if (grid) {
    stopAllMedia(grid);
    grid.innerHTML = "";
  }
}

export function initGallery() {
  const page = document.getElementById("galleryPage");
  if (!page || page._galleryInit) return;
  page._galleryInit = true;

  page.querySelector(".gallery-rescan")?.addEventListener("click", async () => {
    if (activeScanPromise) return;
    const btn = page.querySelector(".gallery-rescan");
    if (btn) btn.classList.add("scanning");
    try {
      cardCache.clear();
      const grid = page.querySelector(".gallery-grid");
      if (grid) grid.innerHTML = "";
      await scanGallery(true);
      galleryNeedsRescan = false;
      renderGallery();
      showToast(t("gallery-rescan-done"));
    } finally {
      if (btn) btn.classList.remove("scanning");
    }
  });

  page.querySelectorAll(".gallery-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      galleryFilter = chip.getAttribute("data-filter") || "all";
      renderGalleryToolbar();
      renderGallery(true);
    });
  });

  const sortSelect = page.querySelector("#gallerySortSelect");
  const sortMenu = page.querySelector("#gallerySortMenu");

  sortSelect?.addEventListener("click", (e) => {
    e.stopPropagation();
    sortMenu?.classList.toggle("hidden");
    sortSelect.classList.toggle(
      "active",
      !sortMenu?.classList.contains("hidden"),
    );
  });

  page.querySelectorAll(".gallery-sort-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      gallerySort = item.getAttribute("data-value") || "newest";
      localStorage.setItem("mori_gallery_sort", gallerySort);
      sortMenu?.classList.add("hidden");
      sortSelect?.classList.remove("active");
      renderGalleryToolbar();
      renderGallery(true);
    });
  });

  document.addEventListener("click", () => {
    if (sortMenu && !sortMenu.classList.contains("hidden")) {
      sortMenu.classList.add("hidden");
      sortSelect?.classList.remove("active");
    }
  });

  const searchInput = page.querySelector(".gallery-search");
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      galleryQuery = searchInput.value.trim();
      renderGallery(true);
    }, 150);
  });
}

// Global Event Listeners for real-time favorite & download sync across tabs
window.addEventListener("mori_favorite_toggled", () => {
  cachedHistoryList = null;
  const p = document.getElementById("galleryPage");
  if (p && !p.classList.contains("hidden")) {
    renderGallery();
  }
});

window.addEventListener("mori_history_updated", () => {
  cachedHistoryList = null;
  const p = document.getElementById("galleryPage");
  if (p && !p.classList.contains("hidden")) {
    renderGallery();
  }
});

const handleDownloadUpdate = () => {
  if (!isGalleryEnabled()) return;
  galleryNeedsRescan = true;
  const p = document.getElementById("galleryPage");
  if (p && !p.classList.contains("hidden")) {
    const prev = [...galleryItems];
    scanGallery(true).then((items) => {
      galleryNeedsRescan = false;
      if (!areItemsEqual(prev, items)) renderGallery();
    });
  }
};

window.addEventListener("mori_download_ended", handleDownloadUpdate);
window.addEventListener("mori_file_saved", handleDownloadUpdate);
window.addEventListener("mori_app_resumed", handleDownloadUpdate);

export function refreshGalleryPage() {
  if (!isGalleryEnabled()) return;
  initGallery();
  renderGalleryToolbar();
  cachedHistoryList = null;
  const page = document.getElementById("galleryPage");
  const grid = page?.querySelector(".gallery-grid");
  const hasRealCards = grid && grid.querySelector(".gallery-item");

  if (galleryItems.length === 0 && !hasRealCards) {
    renderGallerySkeleton();
    scanGallery(true).then(() => {
      galleryNeedsRescan = false;
      renderGallery(true);
    });
  } else {
    // Immediately re-render with updated history favorites without waiting for scan
    renderGallery(true);
    const prev = [...galleryItems];
    scanGallery(true).then((items) => {
      galleryNeedsRescan = false;
      if (!areItemsEqual(prev, items)) {
        renderGallery(true);
      }
    });
  }
}
