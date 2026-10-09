// gallery.js — scan Mori download folders into a media gallery
import { Filesystem, pauseAllMedia, showToast } from "../utils/index.js";
import { t } from "../i18n/index.js";
import { createVideoPlayer } from "../components/player.js";

const VIDEO_EXT = /\.(mp4|mov|mkv|webm|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|opus|flac|wav|ogg)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;
const DOC_EXT = /\.(pdf)$/i;

let galleryItems = [];
let galleryFilter = "all";
let gallerySort = "newest";
let galleryQuery = "";
let scanInProgress = false;

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
  if (DOC_EXT.test(name)) return "doc";
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
    raw.startsWith("asset://") ||
    raw.startsWith("tauri://")
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

  const tauriConvert =
    window.__TAURI__?.core?.convertFileSrc ||
    window.__TAURI_INTERNALS__?.convertFileSrc ||
    window.__TAURI__?.convertFileSrc;
  if (tauriConvert) return tauriConvert(p.replace(/^\/+/, "").replace(/^([a-zA-Z]:)[/\\]/, "$1/"));

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
    if (path && !folders.includes(path)) folders.push(path);
  };
  add(localStorage.getItem("mori_download_path"));
  add(localStorage.getItem("mori_video_path"));
  add(localStorage.getItem("mori_music_path"));
  add(localStorage.getItem("mori_photo_path"));
  add(localStorage.getItem("mori_pdf_path"));
  if (folders.length === 0) {
    add("Download/Mori");
    add("Music/Mori");
    add("Pictures/Mori");
  }
  return folders;
}

export async function scanGallery(force = false) {
  if (scanInProgress) return galleryItems;
  if (!force && galleryItems.length > 0) return galleryItems;
  scanInProgress = true;
  const folders = getGalleryScanFolders();
  const tauriInvoke =
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke;
  const items = [];
  const seen = new Set();

  // Recursively collect files from directories (handles nested music folders)
  async function collectRecursive(dirPath, directory) {
    try {
      const res = await Filesystem.readdir({ path: dirPath, directory });
      for (const file of res.files || []) {
        if (file.type === "directory") {
          // Recurse into subdirectory
          const subPath = dirPath ? `${dirPath}/${file.name}` : file.name;
          await collectRecursive(subPath, directory);
        } else {
          const cat = fileCategory(file.name);
          if (!cat) continue;
          const relPath = dirPath ? `${dirPath}/${file.name}` : file.name;
          const key = `${directory}::${relPath}`;
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

  if (tauriInvoke) {
    for (const folder of folders) {
      try {
        const entries = await tauriInvoke("tauri_list_dir", { folder });
        for (const entry of entries || []) {
          const name = entry.name || "";
          const cat = fileCategory(name);
          if (!cat) continue;
          const key = `desktop::${folder}::${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({
            name,
            path: `${folder}/${name}`.replace(/\/+/g, "/"),
            directory: "DESKTOP",
            category: cat,
            size: entry.size || 0,
            mtime: entry.modified ? entry.modified * 1000 : 0,
            folder: folder,
          });
        }
      } catch (_) {}
    }
  } else if (Filesystem) {
    const dirs = [
      { directory: "EXTERNAL_STORAGE" },
      { directory: "EXTERNAL" },
      { directory: "DOCUMENTS" },
    ];
    for (const folder of folders) {
      for (const dir of dirs) {
        // Use recursive scan to find files in nested folders (e.g. Music subfolder)
        await collectRecursive(folder, dir.directory);
      }
    }
  }

  items.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  galleryItems = items;
  scanInProgress = false;
  return items;
}

function sortItems(items) {
  const sorted = [...items];
  switch (gallerySort) {
    case "oldest":
      return sorted.sort((a, b) => a.mtime - b.mtime);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "largest":
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    case "smallest":
      return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    default:
      return sorted.sort((a, b) => b.mtime - a.mtime);
  }
}

function filteredItems() {
  let items = galleryItems;
  if (galleryFilter !== "all") items = items.filter((i) => i.category === galleryFilter);
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

function createVideoThumb(mediaUrl, name) {
  const video = document.createElement("video");
  video.className = "gallery-video-thumb";
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("playsinline", "");
  video.setAttribute("aria-label", name || "video");
  const canFragment = /^(https?|file|asset|tauri):/i.test(mediaUrl) || mediaUrl.startsWith("/");
  video.src = canFragment ? `${mediaUrl}#t=1` : mediaUrl;
  video.addEventListener("loadeddata", () => {
    try {
      const mark = Math.min(1.5, (video.duration || 2) * 0.15);
      if (mark > 0.2 && video.currentTime < mark) video.currentTime = mark;
    } catch (_) {}
  });
  video.addEventListener("error", () => {
    video.replaceWith(galleryFallbackIcon("video"));
  });
  return video;
}

function buildItem(item) {
  const card = document.createElement("div");
  card.className = `gallery-item cat-${item.category}`;
  card.setAttribute("data-name", item.name);

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
    img.src = mediaUrl;
    img.alt = item.name;
    thumb.appendChild(img);
  } else if (item.category === "video") {
    thumb.appendChild(createVideoThumb(mediaUrl, item.name));
    const play = document.createElement("span");
    play.className = "gallery-play-badge";
    play.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    thumb.appendChild(play);
  } else {
    thumb.appendChild(galleryFallbackIcon(item.category));
  }
  thumb.appendChild(label);

  const meta = document.createElement("div");
  meta.className = "gallery-meta";
  meta.innerHTML = `
    <h4 title="${esc(item.name)}">${esc(item.name.length > 34 ? item.name.slice(0, 31) + "..." : item.name)}</h4>
    <p>${item.mtime ? new Date(item.mtime).toLocaleDateString([], { dateStyle: "medium" }) : ""}${formatBytes(item.size) ? " · " + formatBytes(item.size) : ""}</p>
  `;
  card.appendChild(thumb);
  card.appendChild(meta);
  card.addEventListener("click", () => openGalleryViewer(item));
  return card;
}

function renderGallery() {
  const page = document.getElementById("galleryPage");
  if (!page) return;
  const empty = page.querySelector(".gallery-empty");
  const grid = page.querySelector(".gallery-grid");
  if (!grid) return;

  const countEl = page.querySelector(".gallery-count");
  const items = filteredItems();
  if (countEl) {
    countEl.textContent = `${items.length} ${t("gallery-count-items")}`;
  }

  grid.innerHTML = "";
  if (items.length === 0) {
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  const frag = document.createDocumentFragment();
  items.forEach((item) => frag.appendChild(buildItem(item)));
  grid.appendChild(frag);
}

export function renderGalleryToolbar() {
  const page = document.getElementById("galleryPage");
  if (!page) return;
  const chips = page.querySelectorAll(".gallery-chip");
  chips.forEach((chip) => {
    chip.classList.toggle("active", chip.getAttribute("data-filter") === galleryFilter);
  });
  const sortSel = page.querySelector(".gallery-sort");
  if (sortSel) sortSel.value = gallerySort;
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
  `;

  const body = document.createElement("div");
  body.className = "gallery-viewer-body";

  const mediaUrl = toLocalMediaUrl(item.path);

  if (item.category === "image") {
    const img = document.createElement("img");
    img.src = mediaUrl;
    img.referrerPolicy = "no-referrer";
    body.appendChild(img);
  } else if (item.category === "doc") {
    const frame = document.createElement("iframe");
    frame.src = mediaUrl;
    body.appendChild(frame);
  } else if (item.category === "audio") {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = mediaUrl;
    body.appendChild(audio);
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
    body.appendChild(player);
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
    overlay._onKeyRemove?.();
    origRemove();
  };
}

export function initGallery() {
  const page = document.getElementById("galleryPage");
  if (!page || page._galleryInit) return;
  page._galleryInit = true;

  page.querySelector(".gallery-rescan")?.addEventListener("click", async () => {
    if (scanInProgress) return;
    scanInProgress = true;
    const btn = page.querySelector(".gallery-rescan");
    if (btn) btn.classList.add("scanning");
    await scanGallery(true);
    scanInProgress = false;
    if (btn) btn.classList.remove("scanning");
    renderGallery();
    showToast(t("gallery-rescan-done"));
  });

  page.querySelectorAll(".gallery-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      galleryFilter = chip.getAttribute("data-filter") || "all";
      renderGalleryToolbar();
      renderGallery();
    });
  });

  const sortSel = page.querySelector(".gallery-sort");
  sortSel?.addEventListener("change", () => {
    gallerySort = sortSel.value || "newest";
    renderGallery();
  });

  const searchInput = page.querySelector(".gallery-search");
  searchInput?.addEventListener("input", () => {
    galleryQuery = searchInput.value.trim();
    renderGallery();
  });
}

export function refreshGalleryPage() {
  initGallery();
  renderGalleryToolbar();
  renderGallery();
  scanGallery().then(() => renderGallery());
}
