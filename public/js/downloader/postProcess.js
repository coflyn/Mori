// postProcess.js — post-download feedback, media scanning, notifications, and button reset
import {
  Filesystem,
  triggerHaptic,
  playCompletionSound,
  autoClearInputBox,
  completeDownloadProgressToast,
} from "../utils/index.js";
import { translations } from "../i18n/index.js";
import { currentLang } from "../modules/core.js";

/**
 * Handles all post-download actions: sound, haptics, URI resolution, MediaScanner, notifications, and UI reset
 */
export async function handlePostDownload({
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
}) {
  triggerHaptic("success");
  if (!window._moriPlaylistDownloading) {
    playCompletionSound();
    autoClearInputBox();
  }

  let savedUri = savedFile.uri || savedFile.path;
  if (
    !savedUri.startsWith("file://") &&
    !savedUri.startsWith("_capacitor_file_") &&
    window.Capacitor &&
    Filesystem
  ) {
    try {
      const uriObj = await Filesystem.getUri({
        path: savedFile.path,
        directory: successfulDir,
      });
      if (uriObj?.uri) savedUri = uriObj.uri;
    } catch (_) {}
  }

  try {
    if (savedUri.startsWith("file://")) {
      savedUri = decodeURI(savedUri);
    }
  } catch (_) {}

  window.dispatchEvent(
    new CustomEvent("mori_file_saved", {
      detail: {
        url: sourceUrl || url,
        path: savedFile.path,
        uri: savedUri,
        title: effectiveTitle,
      },
    }),
  );

  if (window.MoriMainBridge?.scanMediaFile) {
    try {
      window.MoriMainBridge.scanMediaFile(savedFile.path || savedUri);
    } catch (_) {}
  }

  const completeTitle =
    translations[currentLang]?.["toast-download-complete"] ||
    "Download Complete";
  const dismissMs = window._moriPlaylistDownloading ? 1200 : 3000;
  completeDownloadProgressToast(
    completeTitle,
    `/Download/${targetFolder}`,
    dismissMs,
  );

  if (
    !window._moriPlaylistDownloading &&
    window.MoriMainBridge?.showCompleteNotification
  ) {
    try {
      window.MoriMainBridge.showCompleteNotification(
        effectiveTitle,
        `/Download/${targetFolder}/${fileName}`,
      );
    } catch (_) {}
  }

  setTimeout(() => {
    if (btn && !window._moriPlaylistDownloading) {
      btn.disabled = false;
      const b = btn.querySelector(".dl-badge");
      if (b) {
        b.textContent =
          translations[currentLang]?.["label-download"] || "DOWNLOAD";
      } else {
        btn.innerHTML = originalContent;
      }
    }
    if (!window._moriPlaylistDownloading) {
      progressContainer?.classList.add("hidden");
    }
  }, 2500);

  return {
    success: true,
    path: savedFile.path,
    uri: savedUri,
    title: effectiveTitle,
  };
}
