import {
  requestWakeLock,
  releaseWakeLock,
  playCompletionSound,
  showToast,
} from "../utils/index.js";

export class DownloadManager {
  constructor() {
    this.activeDownloads = new Set();
    this.maxRetries = 3;
  }

  async startDownload(mediaItem, filenameTemplate = "default") {
    let retries = 0;
    await requestWakeLock();

    try {
      while (retries <= this.maxRetries) {
        try {
          console.log(
            `[DOWNLOAD] Attempting download for ${mediaItem.type} (Attempt ${retries + 1}/${this.maxRetries + 1})`,
          );

          if (!mediaItem.url) throw new Error("Invalid download URL.");

          // Emulate or trigger download link
          const a = document.createElement("a");
          a.href = mediaItem.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.click();

          playCompletionSound();
          break;
        } catch (err) {
          retries++;
          if (retries > this.maxRetries) {
            throw err;
          }
          console.warn(
            `[DOWNLOAD RETRY] Attempt ${retries} failed: ${err.message}. Retrying in 2 seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } finally {
      releaseWakeLock();
    }
  }
}

export const downloadManager = new DownloadManager();
