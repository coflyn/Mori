// Media Helpers (Video Thumbnail Generation, Playback Pause/Stop)

import { Filesystem } from "./plugins.js";

// Generate Thumbnail from Video
export async function getVideoThumbnail(videoUri) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearTimeout(timeout);
      try {
        video.removeEventListener("loadedmetadata", onMetadata);
        video.removeEventListener("durationchange", onMetadata);
        video.onseeked = null;
        video.onerror = null;
        if (video.src && video.src.startsWith("blob:")) {
          URL.revokeObjectURL(video.src);
        }
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        console.warn("Video cleanup warning:", e);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Thumbnail timeout"));
    }, 10000);

    const onMetadata = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration / 2;
        video.removeEventListener("loadedmetadata", onMetadata);
      } else {
        video.currentTime = 1;
      }
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("durationchange", onMetadata);

    video.onseeked = async () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 640;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;
        const scale = Math.min(maxDim / vw, maxDim / vh, 1.0);
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        // Free canvas context references
        canvas.width = 0;
        canvas.height = 0;
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        cleanup();
        console.error("Canvas thumbnail error:", e);
        reject(e);
      }
    };

    video.onerror = (e) => {
      cleanup();
      console.error("Video thumbnail element error:", e);
      reject(new Error("Video error"));
    };

    if (videoUri && (videoUri.startsWith("http://") || videoUri.startsWith("https://"))) {
      video.crossOrigin = "anonymous";
    }
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = videoUri;
    video.load();
  });
}

/**
 * Safely pauses all active video and audio playback elements without destroying their src.
 * @param {HTMLElement|Document} rootEl - Container element or document
 */
export function pauseAllMedia(rootEl = document) {
  if (!rootEl) return;
  try {
    const mediaElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("video, audio")
      : [];
    mediaElements.forEach((el) => {
      try {
        el.autoplay = false;
        el.pause();
      } catch (e) {}
    });
  } catch (err) {}
}

/**
 * Stops, pauses, and cleans up all active video and audio playback elements,
 * revoking Object URLs and executing container cleanup hooks.
 * @param {HTMLElement|Document} rootEl - Container element or document
 */
export function stopAllMedia(rootEl = document) {
  if (!rootEl) return;

  try {
    const mediaElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("video, audio")
      : [];

    mediaElements.forEach((el) => {
      try {
        el._isStopped = true;
        el.autoplay = false;
        el.pause();
        el.currentTime = 0;
        if (el.src && el.src.startsWith("blob:")) {
          URL.revokeObjectURL(el.src);
        }
        el.removeAttribute("src");
        el.load();
      } catch (e) {
        console.warn("Error pausing media element:", e);
      }
    });

    const cleanupElements = rootEl.querySelectorAll
      ? rootEl.querySelectorAll("*")
      : [];
    cleanupElements.forEach((el) => {
      if (typeof el._cleanup === "function") {
        try {
          el._cleanup();
        } catch (e) {}
      }
    });
  } catch (err) {
    console.warn("stopAllMedia error:", err);
  }
}

if (typeof window !== "undefined") {
  window.moriPauseAllMedia = () => pauseAllMedia(document);
  window.moriStopAllMedia = () => stopAllMedia(document);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pauseAllMedia(document);
    }
  });

  window.addEventListener("pagehide", () => {
    pauseAllMedia(document);
  });

  window.addEventListener("blur", () => {
    pauseAllMedia(document);
  });
}
