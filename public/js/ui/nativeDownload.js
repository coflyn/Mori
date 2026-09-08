// nativeDownload.js — native download orchestrator with progress toast
import { translations, t } from "../i18n/index.js";
import {
  showToast,
  Filesystem,
  showDownloadProgressToast,
  updateDownloadProgressToast,
  failDownloadProgressToast,
  cancelDownloadProgressToast,
  requestWakeLock,
  releaseWakeLock,
  checkWifiOnlyGuard,
} from "../utils/index.js";
import { currentLang } from "../modules/core.js";
import {
  resolveExtension,
  sanitizeTitle,
  generateFileName,
  detectPlatformFolder,
  resolveUniqueFileName,
} from "../downloader/filename.js";
import { cleanDownloadUrl, buildDownloadHeaders } from "../downloader/headers.js";
import { needsAsyncResolving, resolveDownloadUrl } from "../downloader/resolver.js";
import { saveToStorage } from "../downloader/storage.js";
import { handlePostDownload } from "../downloader/postProcess.js";

export function cancelCurrentDownload() {
  window._moriDownloadCancelled = true;
  // Dispatch event so history spinner can be cleared
  window.dispatchEvent(new CustomEvent("mori_download_cancelled"));
}

// Expose globally so the progress toast cancel button can call it
window._moriCancelDownload = cancelCurrentDownload;

function handleCancelCleanup(btn, originalContent, progressContainer) {
  if (!window._moriPlaylistDownloading) {
    cancelDownloadProgressToast();
  } else {
    const lingering = document.querySelectorAll(".download-progress-toast");
    lingering.forEach((el) => el.remove());
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
  if (progressContainer) progressContainer.classList.add("hidden");
}

export async function startNativeDownload(
  url,
  type,
  title,
  btn,
  sourceUrl,
  resetCancelFlag = true,
) {
  if (!url || typeof url !== "string" || !url.trim()) {
    showToast(
      (translations[currentLang]?.["label-error"] || "Error") +
        ": Invalid download link",
    );
    return { success: false, error: "Invalid download link" };
  }

  if (!(await checkWifiOnlyGuard())) {
    return { success: false, error: "Wifi only guard" };
  }

  if (
    url.startsWith("file://") ||
    url.includes("_capacitor_file_") ||
    url.startsWith("content://")
  ) {
    showToast(t("toast-already-local"));
    return { success: true, skipped: true };
  }

  const tauriInvoke =
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke;

  if (!Filesystem && !tauriInvoke) {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      a.target = "_blank";
      a.click();
    } catch (_) {
      window.open(url, "_blank");
    }
    return { success: true };
  }

  if (resetCancelFlag) {
    window._moriDownloadCancelled = false;
  }
  // If batch already cancelled, bail immediately
  if (window._moriDownloadCancelled) {
    return { success: false, error: "Cancelled" };
  }

  window._moriActiveDownloadUrl = sourceUrl || url;
  window.dispatchEvent(
    new CustomEvent("mori_download_started", {
      detail: { url: sourceUrl || url },
    }),
  );

  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const originalContent = btn ? btn.innerHTML : "";

  if (window.Capacitor?.getPlatform?.() === "android") {
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== "granted") {
        await Filesystem.requestPermissions().catch(() => {});
      }
    } catch (e) {
      console.warn("Permission check failed", e);
    }
  }

  // Show floating progress toast ONLY AFTER validation and permissions pass
  const platformLabel = (() => {
    const src = (sourceUrl || url || "").toLowerCase();
    if (src.includes("tiktok")) return "TikTok";
    if (src.includes("instagram")) return "Instagram";
    if (src.includes("youtube")) return "YouTube";
    if (src.includes("twitter") || src.includes("x.com")) return "Twitter";
    if (src.includes("facebook")) return "Facebook";
    if (src.includes("pinterest")) return "Pinterest";
    if (src.includes("douyin")) return "Douyin";
    if (src.includes("bilibili") || src.includes("b23.tv")) return "Bilibili";
    if (src.includes("spotify")) return "Spotify";
    if (src.includes("bandcamp")) return "Bandcamp";
    if (src.includes("pixiv") || src.includes("pximg")) return "Pixiv";
    if (src.includes("xiaohongshu") || src.includes("rednote"))
      return "RedNote";
    if (src.includes("threads")) return "Threads";
    if (src.includes("snapchat")) return "Snapchat";
    return "Media";
  })();

  if (window._moriActiveSimInterval) {
    clearInterval(window._moriActiveSimInterval);
    window._moriActiveSimInterval = null;
  }

  const hideProgress = localStorage.getItem("mori_hide_progress") === "true";
  if (!hideProgress) {
    showDownloadProgressToast(platformLabel, type);
  }

  let currentProgressVal = 0;
  const updateProgress = (pct, statusText) => {
    if (hideProgress) return;
    if (typeof pct === "number" && !isNaN(pct)) {
      const maxCap = pct >= 100 ? 100 : 99;
      const targetPct = Math.min(
        maxCap,
        Math.max(currentProgressVal, Math.round(pct)),
      );
      currentProgressVal = targetPct;
    }
    if (progressBar) progressBar.style.width = `${currentProgressVal}%`;
    updateDownloadProgressToast(currentProgressVal, statusText);
  };

  let effectiveTitle = title || "Mori Media";

  try {
    if (btn) btn.disabled = true;
    if (progressContainer) progressContainer.classList.remove("hidden");
    updateProgress(0, "Downloading...");

    // Acquire Wake Lock & Start Native Foreground Service
    requestWakeLock();
    if (window.MoriMainBridge?.startDownloadService) {
      try {
        window.MoriMainBridge.startDownloadService(
          `Downloading ${platformLabel} ${type || ""}`,
        );
      } catch (e) {
        console.warn("Foreground service start error", e);
      }
    }

    const initialBadge = btn ? btn.querySelector(".dl-badge") : null;
    if (btn) {
      if (initialBadge) {
        initialBadge.textContent = "...";
      } else {
        btn.innerHTML =
          translations[currentLang]?.["btn-processing"] || "Processing...";
      }
    }
    console.log("Starting download for:", url);

    let simProgress = 0;
    let realProgressReceived = false;
    window._moriActiveSimInterval = setInterval(() => {
      if (realProgressReceived) return;
      if (simProgress < 50) {
        simProgress += 6 + Math.random() * 4;
      } else if (simProgress < 80) {
        simProgress += 2.5 + Math.random() * 2.5;
      } else if (simProgress < 95) {
        simProgress += 0.6 + Math.random() * 0.9;
      }
      const currentPct = Math.min(95, Math.round(simProgress));
      updateProgress(currentPct, "Downloading...");
    }, 160);

    // Remove any existing listeners first to avoid double-firing
    if (window._moriProgressListener) {
      try {
        await window._moriProgressListener.remove();
      } catch (_) {}
      window._moriProgressListener = null;
    }

    // Listen for real progress if Filesystem exists
    if (Filesystem?.addListener) {
      try {
        window._moriProgressListener = await Filesystem.addListener(
          "downloadProgress",
          (progress) => {
            realProgressReceived = true;
            let percentage = 0;
            if (progress.contentLength > 0) {
              percentage = Math.round(
                (progress.bytesWritten / progress.contentLength) * 100,
              );
            } else if (progress.bytesWritten > 0) {
              percentage = Math.min(
                95,
                Math.round(progress.bytesWritten / 10240),
              );
            }
            updateProgress(Math.min(95, percentage), "Downloading...");
          },
        );
      } catch (e) {
        console.warn("Could not attach Filesystem progress listener:", e);
      }
    }

    const ext = resolveExtension(type, url);
    const cleanTypeLabel = (type || "")
      .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
      .trim();
    const isTrackType = /^\d+\.\s+/.test(cleanTypeLabel);
    if (isTrackType) {
      effectiveTitle =
        cleanTypeLabel.replace(/^\d+\.\s+/, "").trim() || cleanTypeLabel;
    }

    const sanitizedTitle = sanitizeTitle(title, type);
    let fileName = generateFileName(sanitizedTitle, ext, sourceUrl, url);

    const isAudio = /mp3|audio|128k|48k|m4a|wav|flac/i.test(type);
    const videoSubfolder =
      localStorage.getItem("mori_download_path") || "Mori";
    const musicSubfolder =
      localStorage.getItem("mori_music_path") || "Mori/Music";
    const targetFolder = isAudio ? musicSubfolder : videoSubfolder;
    let fullPath = isAudio
      ? `Download/${musicSubfolder}`
      : `Download/${videoSubfolder}`;

    // Auto-Categorize Subfolder per Platform
    if (localStorage.getItem("mori_auto_folder") !== "false") {
      const platformFolder = detectPlatformFolder(sourceUrl, url);
      fullPath = `${fullPath}/${platformFolder}`;
    }

    const directoriesToTry = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];

    if (Filesystem) {
      for (const dir of directoriesToTry) {
        await Filesystem.mkdir({
          path: fullPath,
          directory: dir,
          recursive: true,
        }).catch((e) => {
          console.warn(`Mkdir on ${dir} failed or exists:`, e);
        });
      }

      const uniqueRes = await resolveUniqueFileName(
        fullPath,
        fileName,
        ext,
        directoriesToTry,
        Filesystem,
        btn,
      );
      if (uniqueRes.skipped) {
        return {
          success: true,
          skipped: true,
          path: uniqueRes.path,
        };
      }
      fileName = uniqueRes.fileName;
    }

    const checkCancelled = () => Boolean(window._moriDownloadCancelled);

    if (checkCancelled()) {
      handleCancelCleanup(btn, originalContent, progressContainer);
      return { success: false, error: "Cancelled" };
    }

    let actualDownloadUrl = url;
    if (needsAsyncResolving(url)) {
      const resolveRes = await resolveDownloadUrl({
        url,
        btn,
        updateProgress,
        checkCancelled,
      });
      if (resolveRes.cancelled || checkCancelled()) {
        handleCancelCleanup(btn, originalContent, progressContainer);
        return { success: false, error: "Cancelled" };
      }
      actualDownloadUrl = resolveRes.url;
    }

    actualDownloadUrl = cleanDownloadUrl(actualDownloadUrl);
    const downloadHeaders = buildDownloadHeaders(
      actualDownloadUrl,
      sourceUrl,
      url,
    );

    const { savedFile, successfulDir, cancelled } = await saveToStorage({
      actualDownloadUrl,
      fileName,
      fullPath,
      targetFolder,
      downloadHeaders,
      directoriesToTry,
      checkCancelled,
    });

    if (cancelled || checkCancelled()) {
      handleCancelCleanup(btn, originalContent, progressContainer);
      return { success: false, error: "Cancelled" };
    }

    if (window._moriActiveSimInterval) {
      clearInterval(window._moriActiveSimInterval);
      window._moriActiveSimInterval = null;
    }

    updateProgress(100, "Downloading...");
    if (btn) {
      const b = btn.querySelector(".dl-badge");
      if (b) {
        b.textContent = "SAVED";
        b.style.backgroundColor = "";
        b.style.color = "";
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SAVED`;
      }
    }

    return await handlePostDownload({
      savedFile,
      successfulDir,
      sourceUrl,
      url,
      effectiveTitle,
      fileName,
      targetFolder,
      btn,
      originalContent,
      progressContainer,
    });
  } catch (err) {
    console.error("Download failed", err);
    if (window._moriActiveSimInterval) {
      clearInterval(window._moriActiveSimInterval);
      window._moriActiveSimInterval = null;
    }

    let errorMsg = err?.message || "Download failed";
    if (
      errorMsg.includes("Network") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("connection")
    ) {
      errorMsg =
        translations[currentLang]?.["toast-connection-lost"] ||
        "Network connection error";
    }

    const failDismissMs = window._moriPlaylistDownloading ? 2000 : 3500;
    failDownloadProgressToast(errorMsg, failDismissMs);

    // Trigger System Tray Notification when download fails
    if (
      !window._moriPlaylistDownloading &&
      window.MoriMainBridge?.showFailedNotification
    ) {
      try {
        window.MoriMainBridge.showFailedNotification(
          effectiveTitle || "Media",
          errorMsg,
        );
      } catch (_) {}
    }

    if (btn) {
      btn.disabled = false;
      const b = btn.querySelector(".dl-badge");
      if (b) {
        if (window._moriPlaylistDownloading) {
          b.textContent = t("status-failed");
          b.style.backgroundColor = "var(--color-danger, #ef4444)";
          b.style.color = "#ffffff";
        } else {
          b.textContent =
            translations[currentLang]?.["label-download"] || "DOWNLOAD";
        }
      } else {
        btn.innerHTML = originalContent;
      }
    }
    if (!window._moriPlaylistDownloading && progressContainer) {
      progressContainer.classList.add("hidden");
    }

    return {
      success: false,
      error: errorMsg,
    };
  } finally {
    window._moriActiveDownloadUrl = null;
    window.dispatchEvent(new CustomEvent("mori_download_ended"));
    if (!window._moriPlaylistDownloading) {
      releaseWakeLock();
      if (window.MoriMainBridge?.stopDownloadService) {
        try {
          window.MoriMainBridge.stopDownloadService();
        } catch (_) {}
      }
    }
    if (window._moriActiveSimInterval) {
      clearInterval(window._moriActiveSimInterval);
      window._moriActiveSimInterval = null;
    }
    if (window._moriProgressListener) {
      await window._moriProgressListener.remove();
      window._moriProgressListener = null;
    }
  }
}
