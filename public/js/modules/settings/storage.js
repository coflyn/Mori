// storage.js — download paths, storage calculation, cache clearing, and data management
import { Filesystem, showToast } from "../../utils/index.js";
import { translations } from "../../i18n/index.js";
import { showConfirm } from "../modals.js";
import { renderHistory } from "../../ui.js";
import { onHistoryItemClick, onHistoryDeleteClick } from "../history.js";
import {
  currentLang,
  pathVal,
  changePathBtn,
  musicPathVal,
  changeMusicPathBtn,
  okConfirmBtn,
  autoClearToggle,
  clearCacheBtn,
  wipeDataBtn,
} from "../core.js";

export let customPath = localStorage.getItem("mori_download_path") || "Mori";
export let customMusicPath =
  localStorage.getItem("mori_music_path") || "Mori/Music";

export function updateDlStatsDisplay() {
  const el = document.getElementById("historyDlStatsVal");
  const historyEl = document.getElementById("historyItemsCountVal");
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const storedCount = parseInt(
    localStorage.getItem("mori_dl_count") || "0",
    10,
  );
  const count = Math.max(storedCount, history.length);
  if (el) el.textContent = count.toLocaleString();
  if (historyEl) historyEl.textContent = history.length.toLocaleString();
}

export function checkAutoClearDays() {
  const daysVal = localStorage.getItem("mori_auto_clear_days") || "off";
  if (daysVal === "off") return;
  const days = parseInt(daysVal, 10);
  if (isNaN(days) || days <= 0) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const initialCount = history.length;
  const filtered = history.filter((item) => {
    const time =
      item.timestamp || (item.date ? new Date(item.date).getTime() : 0);
    return time === 0 || time >= cutoff;
  });
  if (filtered.length !== initialCount) {
    localStorage.setItem("mori_history", JSON.stringify(filtered));
  }
}

export async function getFolderSize(path, directory) {
  let size = 0;
  try {
    const readdir = await Filesystem.readdir({ path, directory });
    for (const file of readdir.files) {
      const filePath = path ? `${path}/${file.name}` : file.name;
      if (file.type === "file") {
        const stats = await Filesystem.stat({ path: filePath, directory });
        size += stats.size;
      } else if (file.type === "directory") {
        size += await getFolderSize(filePath, directory);
      }
    }
  } catch (_) {}
  return size;
}

export async function updateStorageInfo() {
  const storageVal = document.getElementById("storageSizeVal");
  if (!storageVal) return;

  try {
    let totalSize = 0;
    const tauriInvoke =
      window.__TAURI__?.core?.invoke ||
      window.__TAURI_INTERNALS__?.invoke ||
      window.__TAURI__?.invoke;

    if (tauriInvoke) {
      try {
        const desktopSize = await tauriInvoke("tauri_get_folder_size", {
          folder: "Mori",
        });
        if (typeof desktopSize === "number") {
          totalSize = desktopSize;
        }
      } catch (err) {
        console.warn("Tauri folder size error:", err);
      }
    } else if (Filesystem) {
      totalSize += await getFolderSize("", "CACHE");
      const primary = await getFolderSize("Download/Mori", "EXTERNAL_STORAGE");
      const legacy = await getFolderSize("Download/Mori", "EXTERNAL");
      totalSize += Math.max(primary, legacy);
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    storageVal.textContent = `${sizeInMB} MB`;
  } catch (e) {
    console.error("Storage size error:", e);
    storageVal.textContent = "0.00 MB";
  }
}

export async function clearCacheSilently() {
  if (!Filesystem) return;
  try {
    const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    const activeThumbs = new Set(
      history
        .map((item) => item.thumbnail)
        .filter((t) => t && t.startsWith("thumb_")),
    );
    history.forEach((item) => {
      if (item.localThumbnail && item.localThumbnail.startsWith("thumb_")) {
        activeThumbs.add(item.localThumbnail);
      }
    });

    const cacheSize = await getFolderSize("", "CACHE");
    const sizeInMB = cacheSize / (1024 * 1024);

    // Only clear if cache is more than 50MB
    if (sizeInMB > 50) {
      const files = await Filesystem.readdir({ path: "", directory: "CACHE" });
      let clearedCount = 0;
      for (const file of files.files) {
        const isThumb = file.name.startsWith("thumb_");
        // Delete if it's an orphaned thumbnail OR if it's not a thumbnail at all
        if (!isThumb || !activeThumbs.has(file.name)) {
          try {
            if (file.type === "directory") {
              await Filesystem.rmdir({
                path: file.name,
                directory: "CACHE",
                recursive: true,
              });
            } else {
              await Filesystem.deleteFile({
                path: file.name,
                directory: "CACHE",
              });
            }
            clearedCount++;
          } catch (_) {}
        }
      }
      if (clearedCount > 0) {
        updateStorageInfo();
        console.log(`Auto-cleared ${clearedCount} items from cache.`);
      }
    }
  } catch (e) {
    console.error("Silent cache clear failed:", e);
  }
}

/**
 * Initializes download path pickers, storage event listeners, cache logic, and wipe dialogs
 */
export function initStorageSettings() {
  // 1. Initial display
  if (pathVal) pathVal.textContent = `/Download/${customPath}`;
  if (musicPathVal) musicPathVal.textContent = `/Download/${customMusicPath}`;
  updateDlStatsDisplay();

  // 2. Listen for saved files to update stats live
  window.addEventListener("mori_file_saved", () => {
    const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    const storedCount = parseInt(
      localStorage.getItem("mori_dl_count") || "0",
      10,
    );
    const newCount = Math.max(storedCount, history.length) + 1;
    localStorage.setItem("mori_dl_count", newCount);
    updateDlStatsDisplay();
  });

  // 3. Video Download Path Picker
  changePathBtn?.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    showConfirm(
      lang["label-path-video"] || "Video Download Path",
      `<div class="path-picker-ui">
         <div class="path-input-wrapper">
           <span class="path-label-sm">${lang["label-subfolder-downloads"] || "Subfolder in /Download/"}</span>
           <div class="mori-input-with-icon">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
             <input type="text" id="customPathInput" class="mori-input-noborder" value="${customPath}" placeholder="e.g. Mori" spellcheck="false" autocomplete="off">
           </div>
         </div>
         <span class="path-label-sm">${lang["label-path-presets"] || "Presets"}</span>
         <div class="path-presets-container">
           <button class="path-preset-chip" data-path="Mori">Mori</button>
           <button class="path-preset-chip" data-path="Mori/Videos">Mori/Videos</button>
         </div>
         <button id="resetPathBtn" class="reset-path-btn">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
           <span>${lang["btn-reset-default"] || "Reset to Default"}</span>
         </button>
       </div>`,
      () => {
        const input = document.getElementById("customPathInput");
        if (input && input.value.trim()) {
          const newPath = input.value.trim().replace(/[\\:*?"<>|]/g, "");
          customPath = newPath;
          localStorage.setItem("mori_download_path", newPath);
          if (pathVal) pathVal.textContent = `/Download/${newPath}`;
          showToast(lang["toast-path-updated"] || "Path updated");
        }
      },
    );
    setTimeout(() => {
      const input = document.getElementById("customPathInput");
      const chips = document.querySelectorAll(
        ".path-presets-container .path-preset-chip",
      );
      const updateActiveChips = () => {
        const current = input ? input.value.trim() : "";
        chips.forEach((c) => {
          if (c.getAttribute("data-path") === current) {
            c.classList.add("active");
          } else {
            c.classList.remove("active");
          }
        });
      };
      updateActiveChips();
      input?.addEventListener("input", updateActiveChips);

      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          if (input) {
            input.value = chip.getAttribute("data-path");
            updateActiveChips();
            input.focus();
          }
        });
      });
      document.getElementById("resetPathBtn")?.addEventListener("click", () => {
        if (input) {
          input.value = "Mori";
          updateActiveChips();
          input.focus();
        }
      });
    }, 100);
    if (okConfirmBtn) {
      okConfirmBtn.textContent = "SAVE";
      okConfirmBtn.classList.add("neutral-btn");
    }
  });

  // 4. Music Download Path Picker
  changeMusicPathBtn?.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    showConfirm(
      lang["label-path-music"] || "Music Download Path",
      `<div class="path-picker-ui">
         <div class="path-input-wrapper">
           <span class="path-label-sm">${lang["label-subfolder-downloads"] || "Subfolder in /Download/"}</span>
           <div class="mori-input-with-icon">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
             <input type="text" id="customMusicPathInput" class="mori-input-noborder" value="${customMusicPath}" placeholder="e.g. Mori/Music" spellcheck="false" autocomplete="off">
           </div>
         </div>
         <span class="path-label-sm">${lang["label-path-presets"] || "Presets"}</span>
         <div class="path-presets-container">
           <button class="path-preset-chip" data-path="Mori/Music">Mori/Music</button>
           <button class="path-preset-chip" data-path="Music">Music</button>
         </div>
         <button id="resetMusicPathBtn" class="reset-path-btn">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
           <span>${lang["btn-reset-default"] || "Reset to Default"}</span>
         </button>
       </div>`,
      () => {
        const input = document.getElementById("customMusicPathInput");
        if (input && input.value.trim()) {
          const newPath = input.value.trim().replace(/[\\:*?"<>|]/g, "");
          customMusicPath = newPath;
          localStorage.setItem("mori_music_path", newPath);
          if (musicPathVal) musicPathVal.textContent = `/Download/${newPath}`;
          showToast(lang["toast-path-updated"] || "Path updated");
        }
      },
    );
    setTimeout(() => {
      const input = document.getElementById("customMusicPathInput");
      const chips = document.querySelectorAll(
        ".path-presets-container .path-preset-chip",
      );
      const updateActiveChips = () => {
        const current = input ? input.value.trim() : "";
        chips.forEach((c) => {
          if (c.getAttribute("data-path") === current) {
            c.classList.add("active");
          } else {
            c.classList.remove("active");
          }
        });
      };
      updateActiveChips();
      input?.addEventListener("input", updateActiveChips);

      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          if (input) {
            input.value = chip.getAttribute("data-path");
            updateActiveChips();
            input.focus();
          }
        });
      });
      document
        .getElementById("resetMusicPathBtn")
        ?.addEventListener("click", () => {
          if (input) {
            input.value = "Mori/Music";
            updateActiveChips();
            input.focus();
          }
        });
    }, 100);
    if (okConfirmBtn) {
      okConfirmBtn.textContent = "SAVE";
      okConfirmBtn.classList.add("neutral-btn");
    }
  });

  // 5. Auto Clear Cache Toggle & Auto Trigger
  const isAutoClear = localStorage.getItem("mori_auto_clear_cache") === "true";
  if (autoClearToggle) {
    autoClearToggle.checked = isAutoClear;
    autoClearToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_auto_clear_cache", e.target.checked);
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-autoclear-cache-on"] || "Auto-clear cache enabled"
          : lang["toast-autoclear-cache-off"] || "Auto-clear cache disabled",
      );
      if (e.target.checked) {
        clearCacheSilently();
      }
    });
  }

  if (isAutoClear) {
    setTimeout(() => {
      clearCacheSilently();
    }, 2000);
  }

  // 6. Manual Clear Cache Button
  clearCacheBtn?.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    showConfirm(
      lang["label-clearcache"] || "Clear Cache",
      lang["desc-clearcache"] || "Are you sure you want to clear the app cache?",
      async () => {
        try {
          if (Filesystem) {
            try {
              const files = await Filesystem.readdir({
                path: "",
                directory: "CACHE",
              });
              for (const file of files.files) {
                if (file.type === "directory") {
                  await Filesystem.rmdir({
                    path: file.name,
                    directory: "CACHE",
                    recursive: true,
                  });
                } else {
                  await Filesystem.deleteFile({
                    path: file.name,
                    directory: "CACHE",
                  });
                }
              }
            } catch (_) {}
          }
          await updateStorageInfo();
          showToast(lang["label-cache-cleared"] || "Cache cleared");
        } catch (_) {
          showToast(lang["toast-cache-error"] || "Failed to clear cache");
        }
      },
    );
  });

  // 7. Wipe All Data Button
  wipeDataBtn?.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    showConfirm(
      lang["label-wipedata"] || "Wipe Data",
      lang["desc-wipedata"] || "This will reset all data and history. Proceed?",
      async () => {
        try {
          const langPref = localStorage.getItem("mori_lang");
          const theme = localStorage.getItem("mori_theme");
          const vPath = localStorage.getItem("mori_download_path");
          const mPath = localStorage.getItem("mori_music_path");

          localStorage.clear();

          if (langPref) localStorage.setItem("mori_lang", langPref);
          if (theme) localStorage.setItem("mori_theme", theme);
          if (vPath) localStorage.setItem("mori_download_path", vPath);
          if (mPath) localStorage.setItem("mori_music_path", mPath);

          if (Filesystem) {
            try {
              const cacheFiles = await Filesystem.readdir({
                path: "",
                directory: "CACHE",
              });
              for (const file of cacheFiles.files) {
                await Filesystem.deleteFile({
                  path: file.name,
                  directory: "CACHE",
                });
              }
            } catch (_) {}
          }
          await updateStorageInfo();
          renderHistory(onHistoryItemClick, onHistoryDeleteClick);
          showToast(lang["label-data-wiped"] || "All data wiped");
          setTimeout(() => location.reload(), 1500);
        } catch (_) {
          localStorage.clear();
          location.reload();
        }
      },
    );
  });
}
