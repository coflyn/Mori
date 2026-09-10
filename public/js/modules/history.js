// history.js — history CRUD, callbacks, auto-clear
import { translations } from "../i18n/index.js";
import { getVideoThumbnail, Filesystem, cleanUrl } from "../utils/index.js";
import { showModal, renderHistory, setUIState } from "../ui.js";
import { showConfirm } from "./modals.js";
import {
  currentLang,
  downloadBtn,
  editHistoryBtn,
  doneEditBtn,
  clearAllBtn,
  setIsEditingHistory,
  clearCacheSilently,
  updateGreeting,
  updateStorageInfo,
  switchToSingleMode,
} from "./core.js";

// History Edit Handlers
editHistoryBtn?.addEventListener("click", () => {
  setIsEditingHistory(true);
  setUIState({ isEditingHistory: true });
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);
});

doneEditBtn?.addEventListener("click", () => {
  setIsEditingHistory(false);
  setUIState({ isEditingHistory: false });
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);
});

clearAllBtn?.addEventListener("click", () => {
  showConfirm(
    translations[currentLang]["btn-clear-all"] || "Clear All",
    translations[currentLang]["msg-clear-all-confirm"] ||
      "Are you sure you want to delete all download history?",
    async () => {
      // Clean up physical thumbnail files
      const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
      const thumbs = [];
      for (const item of history) {
        thumbs.push(item.thumbnail, item.localThumbnail);
        for (const f of item.localFiles || []) thumbs.push(f.thumbnail);
      }
      for (const t of thumbs) {
        if (t && t.startsWith("thumb_") && Filesystem) {
          try {
            await Filesystem.deleteFile({ path: t, directory: "CACHE" });
          } catch (e) {}
        }
      }

      localStorage.removeItem("mori_history");
      setIsEditingHistory(false);
      setUIState({ isEditingHistory: false });
      renderHistory(onHistoryItemClick, onHistoryDeleteClick);
    },
  );
});

// History Callbacks
export function onHistoryItemClick(item) {
  showModal(item, (url) => {
    switchToSingleMode(url);
    document.querySelector('.nav-item[data-page="home"]')?.click();
    downloadBtn.click();
  });
}

export async function onHistoryDeleteClick(url) {
  showConfirm(
    translations[currentLang]["btn-delete"] || "Delete Item",
    translations[currentLang]["msg-delete-item-confirm"] ||
      "Remove this item from history?",
    async () => {
      let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
      const index = history.findIndex((h) => h.url === url);
      if (index === -1) return;
      const itemToDelete = history[index];

      // Delete physical thumbnail if it exists
      const thumbs = [
        itemToDelete.thumbnail,
        itemToDelete.localThumbnail,
        ...(itemToDelete.localFiles || []).map((f) => f.thumbnail),
      ];
      for (const t of thumbs) {
        if (t && t.startsWith("thumb_") && Filesystem) {
          try {
            await Filesystem.deleteFile({
              path: t,
              directory: "CACHE",
            });
          } catch (e) {
            console.warn("Could not delete thumbnail file:", e);
          }
        }
      }

      history.splice(index, 1);
      localStorage.setItem("mori_history", JSON.stringify(history));
      renderHistory(onHistoryItemClick, onHistoryDeleteClick);
    },
  );
}

// Global Event for File Saved (Syncing UI and History)
window.addEventListener("mori_file_saved", async (e) => {
  if (localStorage.getItem("mori_incognito") === "true") return;
  const { url, path, uri } = e.detail;
  const target = cleanUrl(url);
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");

  const isVideo = path.toLowerCase().endsWith(".mp4");
  const isAudio = path.toLowerCase().endsWith(".mp3");
  const isImage = /\.(jpg|jpeg|png|webp)/i.test(path);
  const fileUri = uri || path;

  let matched = false;
  history = history.map((item, index) => {
    const itemClean = cleanUrl(item.url);
    const sourceClean = item.sourceUrl ? cleanUrl(item.sourceUrl) : "";
    const isUrlMatch =
      (itemClean && itemClean === target) ||
      (sourceClean && sourceClean === target) ||
      (item.url && item.url.includes(url)) ||
      (url && url.includes(item.url)) ||
      (item.sourceUrl &&
        (item.sourceUrl.includes(url) || url.includes(item.sourceUrl)));

    if (!matched && isUrlMatch) {
      matched = true;
      const localFiles = item.localFiles || [];
      const trackTitle = e.detail.title;
      if (!localFiles.find((f) => f.path === path)) {
        localFiles.push({
          path,
          uri: fileUri,
          type: isVideo ? "VIDEO" : isAudio ? "MP3" : "IMAGE",
          thumbnail: item.thumbnail || item.localThumbnail || null,
          title: trackTitle || item.title,
        });
      }
      // Preserve original playlist title & playlist thumbnail intact!
      return { ...item, localFiles, localUri: fileUri };
    }
    return item;
  });

  const limitVal = localStorage.getItem("mori_history_limit") || "unlimited";
  if (limitVal !== "unlimited") {
    const maxItems = parseInt(limitVal, 10);
    if (!isNaN(maxItems) && history.length > maxItems) {
      history = history.slice(0, maxItems);
    }
  }

  localStorage.setItem("mori_history", JSON.stringify(history));
  renderHistory(onHistoryItemClick, onHistoryDeleteClick);

  if (isVideo) {
    try {
      let localThumbnail = null;
      if (window.MoriMainBridge?.getVideoThumbnail) {
        try {
          localThumbnail = window.MoriMainBridge.getVideoThumbnail(
            path || fileUri,
          );
        } catch (_) {}
      }
      if (!localThumbnail && window.Capacitor) {
        const videoSrc = window.Capacitor.convertFileSrc(fileUri);
        localThumbnail = await getVideoThumbnail(
          videoSrc,
          path || fileUri,
        ).catch(() => null);
      }
      if (!localThumbnail) {
        history = JSON.parse(localStorage.getItem("mori_history") || "[]");
        const found = history.find((h) => cleanUrl(h.url) === target);
        if (found?.thumbnail) localThumbnail = found.thumbnail;
      }

      if (localThumbnail) {
        history = JSON.parse(localStorage.getItem("mori_history") || "[]");
        history = history.map((item) => {
          if (cleanUrl(item.url) === target) {
            const localFiles = item.localFiles || [];
            localFiles.forEach((f) => {
              if (f.path === path) f.thumbnail = localThumbnail;
            });
            return {
              ...item,
              localFiles,
              localThumbnail: localThumbnail || item.localThumbnail,
              thumbnail: localThumbnail || item.thumbnail,
              thumbVersion: 3,
              versionCode: 17,
              versionName: "4.3.1",
              thumbRepaired: true,
            };
          }
          return item;
        });
        localStorage.setItem("mori_history", JSON.stringify(history));
        renderHistory(onHistoryItemClick, onHistoryDeleteClick);
      }
    } catch (err) {
      console.warn("Failed to generate video thumbnail", err);
    }
  }

  updateGreeting();
  updateStorageInfo();
});

// History Storage Helper
export function saveToHistory(result, url) {
  if (localStorage.getItem("mori_incognito") === "true") return;
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");

  let cleanTitle = (result.title || "Content")
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // SMART MATCHING: Use cleaned URL to find existing entries
  const targetUrl = cleanUrl(url);
  const existingIndex = history.findIndex((h) => cleanUrl(h.url) === targetUrl);
  const existingItem = existingIndex !== -1 ? history[existingIndex] : null;

  const newItem = {
    title: cleanTitle,
    thumbnail: result.thumbnail,
    url: url, // Keep the latest URL version
    sourceUrl: result.sourceUrl || url,
    timestamp: Date.now(),
    downloads:
      result.downloads || (existingItem ? existingItem.downloads || [] : []),
    localFiles: existingItem ? existingItem.localFiles || [] : [],
    localUri: existingItem ? existingItem.localUri : null,
    localThumbnail: existingItem ? existingItem.localThumbnail : null,
  };

  // Remove old entry if exists (using targetUrl match)
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift(newItem);

  // Apply user-configured history limit
  const limitVal = localStorage.getItem("mori_history_limit") || "unlimited";
  if (limitVal !== "unlimited") {
    let maxItems = 100;
    const parsed = parseInt(limitVal, 10);
    if (!isNaN(parsed) && parsed > 0) maxItems = parsed;
    history = history.slice(0, maxItems);
  }
  localStorage.setItem("mori_history", JSON.stringify(history));

  // Refresh UI if defined
  if (typeof renderHistory === "function") {
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);
  }

  if (typeof updateGreeting === "function") {
    updateGreeting();
  }
}

// Auto-Clear Old History (Items > 30 days)
export async function autoClearOldHistory() {
  const daysVal = localStorage.getItem("mori_auto_clear_days") || "off";
  if (daysVal === "off") return;

  const days = parseInt(daysVal, 10);
  if (isNaN(days) || days <= 0) return;

  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const cutoffTime = days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const filtered = history.filter((item) => {
    return now - (item.timestamp || 0) < cutoffTime;
  });

  if (filtered.length !== history.length) {
    console.log(
      `[CLEANUP] Removed ${history.length - filtered.length} old history items older than ${days} days`,
    );
    localStorage.setItem("mori_history", JSON.stringify(filtered));
    renderHistory(onHistoryItemClick, onHistoryDeleteClick);

    // Delete orphaned thumbnail files to prevent storage bloat
    if (Filesystem) {
      const removed = history.filter((item) => !filtered.includes(item));
      for (const item of removed) {
        const thumbs = [
          item.thumbnail,
          item.localThumbnail,
          ...(item.localFiles || []).map((f) => f.thumbnail),
        ];
        for (const t of thumbs) {
          if (t && t.startsWith("thumb_") && Filesystem) {
            try {
              await Filesystem.deleteFile({
                path: t,
                directory: "CACHE",
              });
            } catch (e) {}
          }
        }
      }
    }
  }
}

export function autoClearOldCache() {
  const cacheDaysVal =
    localStorage.getItem("mori_auto_clear_cache_days") || "off";
  if (cacheDaysVal === "off") return;

  const days = parseInt(cacheDaysVal, 10);
  if (isNaN(days) || days <= 0) return;

  const lastCleanup = parseInt(
    localStorage.getItem("mori_last_cache_cleanup_ts") || "0",
    10,
  );
  const cutoffTime = days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - lastCleanup >= cutoffTime) {
    console.log(
      `[CLEANUP] Executing auto clear cache (retention: ${days} days)`,
    );
    clearCacheSilently();
    localStorage.setItem("mori_last_cache_cleanup_ts", String(now));
  }
}

let isRefreshingThumbnails = false;
export function refreshAllVideoThumbnails() {
  if (!window.MoriMainBridge?.getVideoThumbnail || isRefreshingThumbnails)
    return;
  try {
    const modalOverlay = document.getElementById("modalOverlay");
    if (
      window._moriIsModalOpen ||
      (modalOverlay &&
        !modalOverlay.classList.contains("hidden") &&
        modalOverlay.style.display !== "none")
    ) {
      setTimeout(refreshAllVideoThumbnails, 3000);
      return;
    }

    const raw = localStorage.getItem("mori_history");
    if (!raw) return;
    let history = JSON.parse(raw);

    const pendingIndices = [];
    for (let i = 0; i < history.length; i++) {
      if (history[i].thumbVersion !== 3) {
        pendingIndices.push(i);
      }
    }

    if (pendingIndices.length === 0) return;

    isRefreshingThumbnails = true;

    const processNext = (idxListIndex) => {
      const currentModal = document.getElementById("modalOverlay");
      if (
        window._moriIsModalOpen ||
        (currentModal &&
          !currentModal.classList.contains("hidden") &&
          currentModal.style.display !== "none")
      ) {
        setTimeout(() => processNext(idxListIndex), 3000);
        return;
      }

      if (idxListIndex >= pendingIndices.length) {
        isRefreshingThumbnails = false;
        return;
      }

      const itemIdx = pendingIndices[idxListIndex];
      const currentHistory = JSON.parse(
        localStorage.getItem("mori_history") || "[]",
      );
      if (!currentHistory[itemIdx]) {
        setTimeout(() => processNext(idxListIndex + 1), 300);
        return;
      }

      const item = currentHistory[itemIdx];
      let videoPath = null;
      if (item.localFiles && item.localFiles.length > 0) {
        const vf = item.localFiles.find(
          (f) =>
            f.type === "VIDEO" ||
            /\.(mp4|mov|mkv|webm)/i.test(f.path || f.name || ""),
        );
        if (vf) videoPath = vf.path || vf.uri;
      }
      if (
        !videoPath &&
        item.localUri &&
        /\.(mp4|mov|mkv|webm)/i.test(item.localUri)
      ) {
        videoPath = item.localUri;
      }

      if (videoPath) {
        try {
          const freshThumb = window.MoriMainBridge.getVideoThumbnail(videoPath);
          if (freshThumb) {
            item.localThumbnail = freshThumb;
            item.thumbnail = freshThumb;
            if (item.localFiles) {
              item.localFiles.forEach((f) => {
                if (f.path === videoPath || f.uri === videoPath)
                  f.thumbnail = freshThumb;
              });
            }
          }
        } catch (_) {}
      }
      item.thumbVersion = 3;
      localStorage.setItem("mori_history", JSON.stringify(currentHistory));

      const historyList = document.querySelector(".history-list");
      if (historyList) {
        const cards = historyList.querySelectorAll(".history-item");
        if (cards[itemIdx] && item.localThumbnail) {
          const img = cards[itemIdx].querySelector(".hist-img");
          if (img) img.src = item.localThumbnail;
        }
      }

      setTimeout(() => processNext(idxListIndex + 1), 400);
    };

    setTimeout(() => processNext(0), 500);
  } catch (err) {
    console.warn("Auto refresh thumbnails error:", err);
    isRefreshingThumbnails = false;
  }
}
