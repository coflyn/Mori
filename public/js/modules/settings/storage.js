// storage.js — download paths, storage calculation, cache clearing, and data management
import {
  Filesystem,
  showToast,
  pickNativeFolder,
  normalizePathInput,
  normalizeSavedPath,
} from "../../utils/index.js";
import { translations } from "../../i18n/index.js";
import { showConfirm } from "../modals.js";
import { renderHistory } from "../../ui.js";
import { onHistoryItemClick, onHistoryDeleteClick, safeSetHistory } from "../history.js";
import { invalidateGalleryCache } from "../gallery.js";
import { clearToolsTempCache } from "../tools/index.js";
import {
  currentLang,
  pathVal,
  changePathBtn,
  musicPathVal,
  changeMusicPathBtn,
  okConfirmBtn,
  clearCacheBtn,
  wipeDataBtn,
} from "../core.js";

export function formatPathDisplay(pathStr) {
  if (!pathStr) return "/";
  if (pathStr.startsWith("/") || /^[a-zA-Z]:[/\\]/.test(pathStr)) {
    return pathStr;
  }
  return `/${pathStr}`;
}

export let customPath = (() => {
  const p = localStorage.getItem("mori_download_path");
  if (!p || p === "Mori") return "Download/Mori";
  return normalizeSavedPath(p);
})();

export let customMusicPath = (() => {
  const p = localStorage.getItem("mori_music_path");
  if (!p || p === "Mori/Music" || p === "Music/Mori") {
    const isAndroid = window.Capacitor?.getPlatform?.() === "android";
    if (isAndroid) return "Download/Mori/Music";
    return p || "Music/Mori";
  }
  return normalizeSavedPath(p);
})();

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
    safeSetHistory(filtered);
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
    if (Filesystem) {
      totalSize += await getFolderSize("", "CACHE");
      const vPath = customPath || "Download/Mori";
      const mPath = customMusicPath || "Music/Mori";
      const primaryV = await getFolderSize(vPath, "EXTERNAL_STORAGE");
      const legacyV = await getFolderSize(vPath, "EXTERNAL");
      totalSize += Math.max(primaryV, legacyV);
      if (mPath !== vPath) {
        const primaryM = await getFolderSize(mPath, "EXTERNAL_STORAGE");
        const legacyM = await getFolderSize(mPath, "EXTERNAL");
        totalSize += Math.max(primaryM, legacyM);
      }
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    storageVal.textContent = `${sizeInMB} MB`;
  } catch (e) {
    console.error("Storage size error:", e);
    storageVal.textContent = "0.00 MB";
  }
}

export async function clearCacheSilently() {
  invalidateGalleryCache();
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
  const isAndroid = window.Capacitor?.getPlatform?.() === "android";
  const isIos = window.Capacitor?.getPlatform?.() === "ios";

  // 1. Initial display
  if (pathVal) pathVal.textContent = formatPathDisplay(customPath);
  if (musicPathVal) musicPathVal.textContent = formatPathDisplay(customMusicPath);
  updateDlStatsDisplay();

  // All Files Access UI on Android (always visible on Android in compact single-row design)
  const updateAllFilesUI = () => {
    const item = document.getElementById("allFilesAccessItem");
    const chip = document.getElementById("allFilesStatusChip");
    if (!item || !isAndroid) return;

    item.style.display = "flex";
    const granted = window.MoriMainBridge?.hasAllFilesPermission
      ? window.MoriMainBridge.hasAllFilesPermission()
      : false;

    const lang = translations[currentLang] || translations.en;
    item.title = lang["desc-all-files-access"] || "Required to save & play media in any folder";
    if (chip) {
      chip.textContent = granted
        ? (lang["status-granted"] || "Granted")
        : (lang["status-not-granted"] || "Not Granted");
      chip.className = "mori-status-chip " + (granted ? "granted" : "warning");
    }

    // If permission is revoked / not granted, immediately fallback any outside path to Download/Mori
    if (!granted) {
      let changed = false;
      const currentVideo = (localStorage.getItem("mori_download_path") || customPath || "").trim();
      if (
        currentVideo &&
        !currentVideo.toLowerCase().startsWith("download") &&
        currentVideo !== "Mori"
      ) {
        customPath = "Download/Mori";
        localStorage.setItem("mori_download_path", "Download/Mori");
        if (pathVal) pathVal.textContent = formatPathDisplay("Download/Mori");
        changed = true;
      }

      const currentMusic = (localStorage.getItem("mori_music_path") || customMusicPath || "").trim();
      if (
        currentMusic &&
        !currentMusic.toLowerCase().startsWith("download") &&
        currentMusic !== "Mori/Music"
      ) {
        customMusicPath = "Download/Mori/Music";
        localStorage.setItem("mori_music_path", "Download/Mori/Music");
        if (musicPathVal) musicPathVal.textContent = formatPathDisplay("Download/Mori/Music");
        changed = true;
      }

      if (changed) {
        updateStorageInfo();
      }
    }
  };
  updateAllFilesUI();
  document.getElementById("allFilesAccessItem")?.addEventListener("click", () => {
    if (window.MoriMainBridge?.requestAllFilesPermission) {
      window.MoriMainBridge.requestAllFilesPermission();
    }
  });
  window.addEventListener("mori_app_resumed", updateAllFilesUI);

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

  // Helper for preset chips
  const getVideoPresets = () => {
    if (isAndroid) {
      return ["Download/Mori", "Movies/Mori", "DCIM/Mori", "Download"];
    }
    return ["Mori", "Videos"];
  };

  const getMusicPresets = () => {
    if (isAndroid) {
      return ["Download/Mori/Music", "Music/Mori", "Download/Mori"];
    }
    return ["Music", "Mori/Music"];
  };

  // 3. Video Download Path Picker
  changePathBtn?.addEventListener("click", () => {
    const lang = translations[currentLang] || translations.en;
    const presets = getVideoPresets();
    const canBrowse = isAndroid;
    const hasPerm = isAndroid && window.MoriMainBridge?.hasAllFilesPermission
      ? window.MoriMainBridge.hasAllFilesPermission()
      : true;

    const permBannerHtml = !hasPerm
      ? `<div id="pathPermBanner" class="path-permission-banner" style="display:flex;align-items:center;gap:8px;font-size:11px;padding:8px 10px;border-radius:8px;background:rgba(234,179,8,0.12);color:#eab308;margin-bottom:12px;cursor:pointer;">
           <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
           <span>${lang["desc-all-files-access"] || "Tip: Grant All Files Access to save & play in any directory."}</span>
         </div>`
      : "";

    const browseBtnHtml = canBrowse
      ? `<button type="button" id="browseFolderBtn" class="path-preset-chip browse-chip" style="display:inline-flex;align-items:center;gap:5px;">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
           <span>${lang["btn-browse-folder"] || "Browse Folder"}</span>
         </button>`
      : "";

    showConfirm(
      lang["label-path-video"] || "Video Download Path",
      `<div class="path-picker-ui">
         ${permBannerHtml}
         <div class="path-input-wrapper">
           <span class="path-label-sm">${lang["label-custom-directory"] || "Target Directory"}</span>
           <div class="mori-input-with-icon">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
             <input type="text" id="customPathInput" class="mori-input-noborder" value="${customPath}" placeholder="e.g. Movies/Mori" spellcheck="false" autocomplete="off">
           </div>
         </div>
         <span class="path-label-sm">${lang["label-path-presets"] || "Presets"}</span>
         <div class="path-presets-container">
           ${browseBtnHtml}
           ${presets.map((p) => `<button type="button" class="path-preset-chip" data-path="${p}">${p}</button>`).join("")}
         </div>
         <button id="resetPathBtn" class="reset-path-btn">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
           <span>${lang["btn-reset-default"] || "Reset to Default"}</span>
         </button>
       </div>`,
      () => {
        const input = document.getElementById("customPathInput");
        if (input && input.value.trim()) {
          const newPath = normalizePathInput(input.value);
          const hasPerm = isAndroid && window.MoriMainBridge?.hasAllFilesPermission
            ? window.MoriMainBridge.hasAllFilesPermission()
            : true;

          if (isAndroid && !hasPerm && !newPath.toLowerCase().startsWith("download")) {
            showToast(lang["desc-all-files-access"] || "All Files Access required. Reverted to Download/Mori.");
            customPath = "Download/Mori";
            localStorage.setItem("mori_download_path", "Download/Mori");
            if (pathVal) pathVal.textContent = formatPathDisplay("Download/Mori");
          } else {
            customPath = newPath;
            localStorage.setItem("mori_download_path", newPath);
            if (pathVal) pathVal.textContent = formatPathDisplay(newPath);
            showToast(lang["toast-path-updated"] || "Path updated");
          }
          updateStorageInfo();
          updateAllFilesUI();
        }
      },
    );
    setTimeout(() => {
      const input = document.getElementById("customPathInput");
      const chips = document.querySelectorAll(
        ".path-presets-container .path-preset-chip:not(.browse-chip)",
      );
      const updateActiveChips = () => {
        const current = input ? normalizePathInput(input.value) : "";
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

      document.getElementById("browseFolderBtn")?.addEventListener("click", async () => {
        const chosen = await pickNativeFolder();
        if (chosen && input) {
          input.value = chosen;
          updateActiveChips();
          input.focus();
        }
      });

      document.getElementById("pathPermBanner")?.addEventListener("click", () => {
        if (window.MoriMainBridge?.requestAllFilesPermission) {
          window.MoriMainBridge.requestAllFilesPermission();
        }
      });

      document.getElementById("resetPathBtn")?.addEventListener("click", () => {
        if (input) {
          input.value = isAndroid ? "Download/Mori" : "Movies/Mori";
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
    const presets = getMusicPresets();
    const canBrowse = isAndroid;
    const hasPerm = isAndroid && window.MoriMainBridge?.hasAllFilesPermission
      ? window.MoriMainBridge.hasAllFilesPermission()
      : true;

    const permBannerHtml = !hasPerm
      ? `<div id="musicPathPermBanner" class="path-permission-banner" style="display:flex;align-items:center;gap:8px;font-size:11px;padding:8px 10px;border-radius:8px;background:rgba(234,179,8,0.12);color:#eab308;margin-bottom:12px;cursor:pointer;">
           <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
           <span>${lang["desc-all-files-access"] || "Tip: Grant All Files Access to save & play in any directory."}</span>
         </div>`
      : "";

    const browseBtnHtml = canBrowse
      ? `<button type="button" id="browseMusicFolderBtn" class="path-preset-chip browse-chip" style="display:inline-flex;align-items:center;gap:5px;">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
           <span>${lang["btn-browse-folder"] || "Browse Folder"}</span>
         </button>`
      : "";

    showConfirm(
      lang["label-path-music"] || "Music Download Path",
      `<div class="path-picker-ui">
         ${permBannerHtml}
         <div class="path-input-wrapper">
           <span class="path-label-sm">${lang["label-custom-directory"] || "Target Directory"}</span>
           <div class="mori-input-with-icon">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
             <input type="text" id="customMusicPathInput" class="mori-input-noborder" value="${customMusicPath}" placeholder="e.g. Music/Mori" spellcheck="false" autocomplete="off">
           </div>
         </div>
         <span class="path-label-sm">${lang["label-path-presets"] || "Presets"}</span>
         <div class="path-presets-container">
           ${browseBtnHtml}
           ${presets.map((p) => `<button type="button" class="path-preset-chip" data-path="${p}">${p}</button>`).join("")}
         </div>
         <button id="resetMusicPathBtn" class="reset-path-btn">
           <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
           <span>${lang["btn-reset-default"] || "Reset to Default"}</span>
         </button>
       </div>`,
      () => {
        const input = document.getElementById("customMusicPathInput");
        if (input && input.value.trim()) {
          const newPath = normalizePathInput(input.value);
          const hasPerm = isAndroid && window.MoriMainBridge?.hasAllFilesPermission
            ? window.MoriMainBridge.hasAllFilesPermission()
            : true;

          if (isAndroid && !hasPerm && !newPath.toLowerCase().startsWith("download")) {
            showToast(lang["desc-all-files-access"] || "All Files Access required. Reverted to Download/Mori.");
            customMusicPath = "Download/Mori/Music";
            localStorage.setItem("mori_music_path", "Download/Mori/Music");
            if (musicPathVal) musicPathVal.textContent = formatPathDisplay("Download/Mori/Music");
          } else {
            customMusicPath = newPath;
            localStorage.setItem("mori_music_path", newPath);
            if (musicPathVal) musicPathVal.textContent = formatPathDisplay(newPath);
            showToast(lang["toast-path-updated"] || "Path updated");
          }
          updateStorageInfo();
          updateAllFilesUI();
        }
      },
    );
    setTimeout(() => {
      const input = document.getElementById("customMusicPathInput");
      const chips = document.querySelectorAll(
        ".path-presets-container .path-preset-chip:not(.browse-chip)",
      );
      const updateActiveChips = () => {
        const current = input ? normalizePathInput(input.value) : "";
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

      document.getElementById("browseMusicFolderBtn")?.addEventListener("click", async () => {
        const chosen = await pickNativeFolder();
        if (chosen && input) {
          input.value = chosen;
          updateActiveChips();
          input.focus();
        }
      });

      document.getElementById("musicPathPermBanner")?.addEventListener("click", () => {
        if (window.MoriMainBridge?.requestAllFilesPermission) {
          window.MoriMainBridge.requestAllFilesPermission();
        }
      });

      document.getElementById("resetMusicPathBtn")?.addEventListener("click", () => {
        if (input) {
          input.value = "Music/Mori";
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

  // 5. Manual Clear Cache Button
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
          await clearToolsTempCache();
          invalidateGalleryCache();
          await updateStorageInfo();
          showToast(lang["label-cache-cleared"] || "Cache cleared");
        } catch (_) {
          showToast(lang["toast-cache-error"] || "Failed to clear cache");
        }
      },
    );
  });

  // 6. Tools Auto-Clean Toggle
  const toolsAutoCleanToggle = document.getElementById("toolsAutoCleanToggle");
  if (toolsAutoCleanToggle) {
    toolsAutoCleanToggle.checked =
      localStorage.getItem("mori_tools_auto_clean") !== "false";
    toolsAutoCleanToggle.addEventListener("change", (e) => {
      const isEnabled = e.target.checked;
      localStorage.setItem("mori_tools_auto_clean", isEnabled);
      const lang = translations[currentLang] || translations.en;
      showToast(
        isEnabled
          ? lang["toast-tools-autoclean-on"] || "Tools auto-clean enabled"
          : lang["toast-tools-autoclean-off"] || "Tools auto-clean disabled",
      );
    });
  }

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
          invalidateGalleryCache();
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
