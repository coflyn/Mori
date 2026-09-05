// nativeDownload.js — native download flow with progress toast
import { translations } from "../i18n/index.js";
import {
  showToast,
  triggerHaptic,
  Filesystem,
  CapacitorHttp,
  showDownloadProgressToast,
  updateDownloadProgressToast,
  completeDownloadProgressToast,
  failDownloadProgressToast,
  cancelDownloadProgressToast,
  playCompletionSound,
  requestWakeLock,
  releaseWakeLock,
  checkWifiOnlyGuard,
  autoClearInputBox,
  getUserAgent,
  getCookiesFromHeaders,
} from "../utils/index.js";
import { currentLang } from "../modules/core.js";
import { scraperFetch } from "../scrapers/httpHelper.js";

export function cancelCurrentDownload() {
  window._moriDownloadCancelled = true;
  // Dispatch event so history spinner can be cleared
  window.dispatchEvent(new CustomEvent("mori_download_cancelled"));
}

// Expose globally so the progress toast cancel button can call it
window._moriCancelDownload = cancelCurrentDownload;

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
      translations[currentLang]["label-error"] + ": Invalid download link",
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
    showToast("File is already stored locally");
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
  let progressListener = null;
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
          translations[currentLang]["btn-processing"] || "Processing...";
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

    const isAudio = /mp3|audio|128k|48k|m4a|wav|flac/i.test(type);
    const isImage =
      /image|photo|jpg|jpeg|png|webp/i.test(type) ||
      /\.(jpg|jpeg|png|webp)/i.test(url);
    let ext = isAudio ? "mp3" : isImage ? "jpg" : "mp4";
    const typeStr = (type || "").toLowerCase();
    const urlLower = (url || "").toLowerCase();
    if (/\.png(\?|$)/i.test(urlLower) || typeStr.includes("png")) ext = "png";
    else if (/\.webp(\?|$)/i.test(urlLower) || typeStr.includes("webp"))
      ext = "webp";
    else if (/\.m4a(\?|$)/i.test(urlLower) || typeStr.includes("m4a"))
      ext = "m4a";
    else if (/\.mp3(\?|$)/i.test(urlLower) || typeStr.includes("mp3"))
      ext = "mp3";
    else if (
      /\.jpe?g(\?|$)/i.test(urlLower) ||
      typeStr.includes("jpg") ||
      typeStr.includes("jpeg")
    )
      ext = "jpg";
    else if (
      /\.mp4(\?|$)/i.test(urlLower) ||
      typeStr.includes("video") ||
      typeStr.includes("mp4") ||
      /\d+p/i.test(typeStr)
    )
      ext = "mp4";

    ext = ext.toLowerCase();

    const cleanTypeLabel = (type || "")
      .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
      .trim();
    const isTrackType = /^\d+\.\s+/.test(cleanTypeLabel);

    let effectiveTitle = title || "Mori Media";
    if (isTrackType) {
      effectiveTitle =
        cleanTypeLabel.replace(/^\d+\.\s+/, "").trim() || cleanTypeLabel;
    }

    let sanitizedTitle = effectiveTitle
      .replace(/[\\/:*?"<>|#%&{}[\]@$^+=~`';,]/g, "")
      .replace(/[^\w\s\-.\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/gi, "")
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 60);

    if (!sanitizedTitle) sanitizedTitle = "Mori_Media";

    const template = localStorage.getItem("mori_filename") || "title";
    let fileName = `${sanitizedTitle}.${ext}`;

    if (template === "title-platform") {
      let platform = "Media";
      const lowerUrl = (sourceUrl || url || "").toLowerCase();
      if (lowerUrl.includes("tiktok") || lowerUrl.includes("douyin"))
        platform = "TikTok";
      else if (lowerUrl.includes("instagram")) platform = "Instagram";
      else if (lowerUrl.includes("youtube") || lowerUrl.includes("youtu.be"))
        platform = "YouTube";
      else if (lowerUrl.includes("twitter") || lowerUrl.includes("x.com"))
        platform = "Twitter";
      else if (lowerUrl.includes("facebook")) platform = "Facebook";
      else if (lowerUrl.includes("pinterest")) platform = "Pinterest";
      else if (lowerUrl.includes("spotify")) platform = "Spotify";
      else if (lowerUrl.includes("rednote") || lowerUrl.includes("xiaohongshu"))
        platform = "RedNote";
      fileName = `${sanitizedTitle}_${platform}.${ext}`;
    } else if (template === "title-date") {
      const dateStr = new Date().toISOString().split("T")[0];
      fileName = `${sanitizedTitle}_${dateStr}.${ext}`;
    } else if (template === "title") {
      fileName = `${sanitizedTitle}.${ext}`;
    } else {
      // default: Title_Timestamp
      fileName = `${sanitizedTitle}_${Date.now()}.${ext}`;
    }

    // Ensure file extension is strictly lowercase for broad device compatibility
    const dotPos = fileName.lastIndexOf(".");
    if (dotPos > 0 && dotPos < fileName.length - 1) {
      fileName =
        fileName.substring(0, dotPos) +
        "." +
        fileName.substring(dotPos + 1).toLowerCase();
    }

    const videoSubfolder = localStorage.getItem("mori_download_path") || "Mori";
    const musicSubfolder =
      localStorage.getItem("mori_music_path") || "Mori/Music";
    const targetFolder = isAudio ? musicSubfolder : videoSubfolder;
    let fullPath = isAudio
      ? `Download/${musicSubfolder}`
      : `Download/${videoSubfolder}`;

    // Auto-Categorize Subfolder per Platform
    if (localStorage.getItem("mori_auto_folder") !== "false") {
      const src = (sourceUrl || url || "").toLowerCase();
      let platformFolder = "Other";
      if (
        src.includes("tiktok") ||
        src.includes("douyin") ||
        src.includes("iesdouyin")
      )
        platformFolder = "TikTok";
      else if (src.includes("instagram") || src.includes("instagr.am"))
        platformFolder = "Instagram";
      else if (src.includes("youtube") || src.includes("youtu.be"))
        platformFolder = "YouTube";
      else if (
        src.includes("twitter") ||
        src.includes("x.com") ||
        src.includes("t.co")
      )
        platformFolder = "Twitter";
      else if (
        src.includes("facebook") ||
        src.includes("fb.watch") ||
        src.includes("fb.com")
      )
        platformFolder = "Facebook";
      else if (src.includes("pinterest") || src.includes("pin.it"))
        platformFolder = "Pinterest";
      else if (src.includes("spotify") || src.includes("spoti.fi"))
        platformFolder = "Spotify";
      else if (src.includes("music.apple.com") || src.includes("apple.com"))
        platformFolder = "AppleMusic";
      else if (src.includes("threads.net") || src.includes("threads.com"))
        platformFolder = "Threads";
      else if (
        src.includes("rednote") ||
        src.includes("xiaohongshu") ||
        src.includes("xhslink")
      )
        platformFolder = "RedNote";
      else if (
        src.includes("bilibili") ||
        src.includes("b23.tv") ||
        src.includes("bili.im")
      )
        platformFolder = "Bilibili";
      else if (
        src.includes("pixiv") ||
        src.includes("pximg") ||
        src.includes("pixiv.me")
      )
        platformFolder = "Pixiv";
      else if (src.includes("bandcamp") || src.includes("bandcamp.com"))
        platformFolder = "Bandcamp";

      fullPath = `${fullPath}/${platformFolder}`;
    }

    const directoriesToTry = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
    let successfulDir = "EXTERNAL_STORAGE";

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

      // Handle duplicate files based on mori_overwrite setting
      const overwriteMode = localStorage.getItem("mori_overwrite") || "rename";
      try {
        let checkExist = null;
        for (const dir of directoriesToTry) {
          checkExist = await Filesystem.stat({
            path: fullPath + "/" + fileName,
            directory: dir,
          }).catch(() => null);
          if (checkExist) break;
        }
        if (checkExist) {
          if (overwriteMode === "skip") {
            // File already exists — skip download silently but mark as saved
            if (btn) {
              const b = btn.querySelector(".dl-badge");
              if (b) b.textContent = "SAVED";
            }
            return {
              success: true,
              skipped: true,
              path: fullPath + "/" + fileName,
            };
          } else if (overwriteMode === "overwrite") {
            // Overwrite: keep same filename, existing file will be replaced
          } else {
            // rename (default): append _1, _2, etc.
            const dotIdx = fileName.lastIndexOf(".");
            const baseName =
              dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
            let counter = 1;
            let newFileName = `${baseName}_${counter}.${ext.toLowerCase()}`;
            while (true) {
              let exist = null;
              for (const dir of directoriesToTry) {
                exist = await Filesystem.stat({
                  path: fullPath + "/" + newFileName,
                  directory: dir,
                }).catch(() => null);
                if (exist) break;
              }
              if (!exist) {
                fileName = newFileName;
                break;
              }
              counter++;
              newFileName = `${baseName}_${counter}.${ext.toLowerCase()}`;
            }
          }
        }
      } catch (e) {}
    }

    if (btn) {
      btn.innerHTML =
        translations[currentLang]["btn-processing"] || "Processing...";
    }

    // Check cancel BEFORE starting resolve phase
    if (window._moriDownloadCancelled) {
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
      return { success: false, error: "Cancelled" };
    }

    let actualDownloadUrl = url;
    const needsResolving =
      (url.includes("ytdown") ||
        url.includes("worker") ||
        url.includes("youtube_resolve:") ||
        url.includes("ytmp3gg_resolve:") ||
        url.includes("soundloaders_resolve:") ||
        url.includes("spotidown_resolve:") ||
        url.includes("applemusic_resolve:") ||
        (url.includes("token=") && url.includes("snapsave"))) &&
      !url
        .toLowerCase()
        .match(/\.(mp4|mp3|m4a|zip|pdf|jpg|jpeg|png|webp)(\?|$)/);

    if (needsResolving) {
      try {
        if (url.startsWith("applemusic_resolve:")) {
          const payloadStr = url.replace("applemusic_resolve:", "");
          let foundLink = "";
          let lastErr = null;
          const maxResolveAttempts = 3;

          for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
            if (window._moriDownloadCancelled) break;
            try {
              if (attempt > 1) {
                updateProgress(
                  20,
                  `Resolving Apple Music track (Retry ${attempt}/${maxResolveAttempts})...`,
                );
                await new Promise((r) => setTimeout(r, 1500 * attempt));
              }
              const res = await scraperFetch({
                method: "POST",
                url: "https://aplmate.com/action/track",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  "User-Agent":
                    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                  "X-Requested-With": "XMLHttpRequest",
                  Referer: "https://aplmate.com/",
                  Origin: "https://aplmate.com",
                },
                data: payloadStr,
              });
              let dd = typeof res === "string" ? JSON.parse(res) : res;
              let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
              if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
              const parser = new DOMParser();
              const doc = parser.parseFromString(dlHtml, "text/html");
              doc.querySelectorAll("a").forEach((a) => {
                const href = a.getAttribute("href");
                const text = a.textContent.trim();
                if (
                  href &&
                  (href.includes("/dl?token=") ||
                    a.classList.contains("abutton"))
                ) {
                  if (
                    href.includes("ko-fi.com") ||
                    href.includes("premium.html")
                  )
                    return;
                  if (
                    text.toLowerCase().includes("another song") ||
                    text.toLowerCase().includes("cover") ||
                    href.includes("cover=")
                  )
                    return;
                  if (!foundLink) {
                    foundLink = href.startsWith("http")
                      ? href
                      : "https://aplmate.com" + href;
                  }
                }
              });
              if (foundLink) break;
            } catch (err) {
              lastErr = err;
            }
          }

          if (foundLink) {
            actualDownloadUrl = foundLink;
          } else {
            throw (
              lastErr ||
              new Error("Could not resolve Apple Music download link")
            );
          }
        } else if (url.startsWith("spotidown_resolve:")) {
          if (btn)
            btn.innerHTML =
              translations[currentLang]["btn-processing"] || "Processing...";
          updateProgress(20, "Resolving Spotify track...");

          const parts = url.replace("spotidown_resolve:", "").split("|||");
          const payloadStr = parts[0];
          let cookiesStr = parts[1] ? decodeURIComponent(parts[1]) : "";

          let foundLink = "";
          let lastErr = null;
          const maxResolveAttempts = 3;

          for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
            if (window._moriDownloadCancelled) break;
            try {
              if (attempt > 1) {
                updateProgress(
                  20,
                  `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
                );
                await new Promise((r) => setTimeout(r, 1500 * attempt));
                // Refresh session cookies from spotidown.app if failed previously
                try {
                  const r1 = await scraperFetch({
                    url: "https://spotidown.app/",
                    headers: { "User-Agent": getUserAgent() },
                    rawResponse: true,
                  });
                  const freshCookies = getCookiesFromHeaders(r1.headers);
                  if (freshCookies) cookiesStr = freshCookies;
                } catch (_) {}
              }

              const reqHeaders = {
                "Content-Type":
                  "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": getUserAgent(),
                "X-Requested-With": "XMLHttpRequest",
                Referer: "https://spotidown.app/",
                Origin: "https://spotidown.app",
              };
              if (cookiesStr) reqHeaders["Cookie"] = cookiesStr;

              const res = await scraperFetch(
                {
                  url: "https://spotidown.app/action/track",
                  method: "POST",
                  headers: reqHeaders,
                  data: payloadStr,
                  rawResponse: true,
                },
                "SpotiDown",
              );
              let dd = res?.data ?? res;
              if (typeof dd === "string") {
                try {
                  dd = JSON.parse(dd);
                } catch (e) {}
              }
              let dlHtml =
                (typeof dd === "object" ? dd?.data || dd?.html : dd) || "";
              if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
              const parser = new DOMParser();
              const doc = parser.parseFromString(dlHtml, "text/html");
              doc.querySelectorAll("a").forEach((a) => {
                const href = a.getAttribute("href");
                const text = a.textContent.trim();
                if (
                  href &&
                  href.startsWith("http") &&
                  !href.includes("premium.html") &&
                  !href.includes("ko-fi.com") &&
                  text !== "Download Another Song"
                ) {
                  if (!foundLink) foundLink = href;
                }
              });
              if (foundLink) break;
            } catch (err) {
              lastErr = err;
            }
          }

          if (foundLink) {
            updateProgress(50, "Starting MP3 download...");
            actualDownloadUrl = foundLink;
          } else {
            throw (
              lastErr || new Error("Could not resolve SpotiDown download link")
            );
          }
        } else if (url.startsWith("soundloaders_resolve:")) {
          if (btn)
            btn.innerHTML =
              translations[currentLang]["btn-processing"] || "Processing...";
          updateProgress(20, "Resolving Spotify track...");

          const parts = url.replace("soundloaders_resolve:", "").split("|||");
          const dataVal = parts[0];
          const tokenVal = parts[1];
          const BASE = "https://soundloaders.app";

          let matchLink = "";
          let lastErr = null;
          const maxResolveAttempts = 3;

          for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
            if (window._moriDownloadCancelled) break;
            try {
              if (attempt > 1) {
                updateProgress(
                  20,
                  `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
                );
                await new Promise((r) => setTimeout(r, 1500 * attempt));
              }

              const res = await scraperFetch(
                {
                  url: BASE + "/action/tracks",
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": getUserAgent(),
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: BASE + "/",
                    Origin: BASE,
                  },
                  data:
                    "data=" +
                    encodeURIComponent(dataVal) +
                    "&track_token=" +
                    encodeURIComponent(tokenVal),
                  rawResponse: true,
                },
                "Soundloaders",
              );
              let dd = res?.data ?? res;
              if (typeof dd === "string") {
                try {
                  dd = JSON.parse(dd);
                } catch (e) {}
              }
              let dlHtml =
                (typeof dd === "object" ? dd?.html || dd?.data : dd) || "";
              const match = dlHtml.match(
                /href=["'](https:\/\/dl\.soundloaders\.app\/cdnv1\?token=[^"']+)["']/,
              );
              if (match && match[1]) {
                matchLink = match[1];
                break;
              }
            } catch (err) {
              lastErr = err;
            }
          }

          if (matchLink) {
            updateProgress(50, "Starting MP3 download...");
            actualDownloadUrl = matchLink;
          } else {
            throw (
              lastErr ||
              new Error("Could not resolve Soundloaders download link")
            );
          }
        } else if (
          url.startsWith("youtube_resolve:") ||
          url.startsWith("ytmp3gg_resolve:")
        ) {
          const raw = url.startsWith("youtube_resolve:")
            ? url.replace("youtube_resolve:", "")
            : url.replace("ytmp3gg_resolve:", "");
          const parts = raw.split("|||");
          const ytId = parts[0];
          const format = parts[1] || "mp3"; // mp3 or mp4
          const quality = parts[2] || "128"; // 128 or 720

          let downloadUrl = null;

          try {
            if (btn)
              btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} (ytmp3)</div>`;
            updateProgress(10, "Converting with ytmp3.mobi...");

            const mobiHeaders = {
              Origin: "https://ytmp3.mobi",
              Referer: "https://ytmp3.mobi/",
              "User-Agent": getUserAgent(),
            };

            const initData = await scraperFetch(
              {
                url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
                headers: mobiHeaders,
              },
              "ytmp3.mobi Init",
            );

            if (initData && !initData.error && initData.convertURL) {
              const convData = await scraperFetch(
                {
                  url: `${initData.convertURL}&v=${ytId}&f=${format}`,
                  headers: mobiHeaders,
                },
                "ytmp3.mobi Convert",
              );

              if (convData && !convData.error) {
                let dlUrl = convData.downloadURL;
                let progUrl = convData.progressURL;
                let progress = 0;
                let attempts = 0;
                const maxAttempts = 30;

                while (progress < 3 && attempts < maxAttempts) {
                  if (window._moriDownloadCancelled) break;

                  await new Promise((r) => setTimeout(r, 1500));
                  if (!progUrl) break;

                  const progData = await scraperFetch(
                    { url: progUrl, headers: mobiHeaders },
                    "ytmp3.mobi Progress",
                  );
                  if (!progData || progData.error) break;
                  progress = progData.progress;
                  if (progData.downloadURL) dlUrl = progData.downloadURL;

                  if (btn) {
                    btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} (${attempts + 1}/${maxAttempts})</div>`;
                  }
                  updateProgress(
                    Math.min(
                      90,
                      10 + Math.round(((attempts + 1) / maxAttempts) * 80),
                    ),
                    `Converting with ytmp3... (${attempts + 1}/${maxAttempts})`,
                  );

                  if (progress >= 3) break;
                  attempts++;
                }

                if (dlUrl && progress >= 3) {
                  if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
                  if (dlUrl.startsWith("/"))
                    dlUrl = "https://ytmp3.mobi" + dlUrl;
                  downloadUrl = dlUrl;
                }
              }
            }
          } catch (mobiErr) {
            console.warn(
              "ytmp3.mobi engine failed, falling back to convert1s:",
              mobiErr,
            );
          }

          if (!downloadUrl && !window._moriDownloadCancelled) {
            try {
              if (btn)
                btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} (convert1s)</div>`;
              updateProgress(15, "Converting with ytmp3.gg...");

              const headers = {
                Origin: "https://media.ytmp3.gg",
                Referer: "https://media.ytmp3.gg/",
                "User-Agent": getUserAgent(),
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
              };

              let conv = null;
              for (let initAttempt = 1; initAttempt <= 2; initAttempt++) {
                if (window._moriDownloadCancelled) break;
                try {
                  if (initAttempt > 1) {
                    await new Promise((r) => setTimeout(r, 1500));
                  }
                  const convRes = await scraperFetch({
                    url: "https://hub.convert1s.com/api/download",
                    method: "POST",
                    headers,
                    data: JSON.stringify({
                      url: `https://www.youtube.com/watch?v=${ytId}`,
                      os: "macos",
                      output: {
                        type: format === "mp4" ? "video" : "audio",
                        format,
                        quality,
                      },
                      audio: { bitrate: "128k" },
                    }),
                  });
                  let parsedConv = convRes;
                  if (typeof parsedConv === "string")
                    parsedConv = JSON.parse(parsedConv);
                  if (parsedConv && !parsedConv.error && parsedConv.statusUrl) {
                    conv = parsedConv;
                    break;
                  }
                } catch (e) {}
              }

              if (conv && conv.statusUrl) {
                let pollCount = 0;
                const maxPolls = 30;
                while (!downloadUrl && pollCount < maxPolls) {
                  if (window._moriDownloadCancelled) break;
                  if (btn)
                    btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} (${pollCount + 1}/${maxPolls})</div>`;
                  updateProgress(
                    Math.min(90, 20 + pollCount * 2),
                    `Converting... (${pollCount + 1}/${maxPolls})`,
                  );

                  await new Promise((r) => setTimeout(r, 1500));
                  try {
                    const pollData = await scraperFetch({
                      url: conv.statusUrl,
                      headers: {
                        Origin: "https://media.ytmp3.gg",
                        Referer: "https://media.ytmp3.gg/",
                        "User-Agent": getUserAgent(),
                        Accept: "application/json, text/plain, */*",
                      },
                    });
                    let poll =
                      typeof pollData === "string"
                        ? JSON.parse(pollData)
                        : pollData;
                    if (
                      poll &&
                      poll.status === "completed" &&
                      poll.downloadUrl
                    ) {
                      downloadUrl = poll.downloadUrl;
                      break;
                    }
                    if (
                      poll &&
                      (poll.status === "error" || poll.status === "failed")
                    ) {
                      break;
                    }
                  } catch (_) {}
                  pollCount++;
                }
              }
            } catch (ggErr) {
              console.warn("convert1s engine failed:", ggErr);
            }
          }

          if (window._moriDownloadCancelled) {
            if (!window._moriPlaylistDownloading) {
              cancelDownloadProgressToast();
            } else {
              const lingering = document.querySelectorAll(
                ".download-progress-toast",
              );
              lingering.forEach((el) => el.remove());
            }
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = originalContent;
            }
            if (progressContainer) progressContainer.classList.add("hidden");
            return { success: false, error: "Cancelled" };
          }

          if (downloadUrl) {
            actualDownloadUrl = downloadUrl;
          } else {
            throw new Error(
              "Failed to convert YouTube track. All download servers were unreachable.",
            );
          }
        } else {
          // Handle SnapSave tokens or general worker resolves
          let resolved = false;
          let pollCount = 0;
          const maxPolls = 20;

          while (!resolved && pollCount < maxPolls) {
            // Check cancel between polls
            if (window._moriDownloadCancelled) {
              if (!window._moriPlaylistDownloading) {
                cancelDownloadProgressToast();
              } else {
                const lingering = document.querySelectorAll(
                  ".download-progress-toast",
                );
                lingering.forEach((el) => el.remove());
              }
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
              }
              if (progressContainer) progressContainer.classList.add("hidden");
              return { success: false, error: "Cancelled" };
            }
            if (btn) {
              btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} ${pollCount > 0 ? `(${pollCount})` : ""}</div>`;
            }
            updateProgress(
              Math.min(90, 10 + pollCount * 4),
              `Resolving URL... (${pollCount + 1}/${maxPolls})`,
            );

            try {
              const statusRes = await scraperFetch(
                {
                  url: actualDownloadUrl,
                  rawResponse: true,
                },
                "Resolver",
              );

              if (statusRes && statusRes.data) {
                let data = statusRes.data;
                if (typeof data === "string") {
                  try {
                    data = JSON.parse(data);
                  } catch (e) {}
                }

                if (data.fileUrl || data.url || data.download_url) {
                  actualDownloadUrl =
                    data.fileUrl || data.url || data.download_url;
                  resolved = true;
                } else if (data.status === "success" && data.download_url) {
                  actualDownloadUrl = data.download_url;
                  resolved = true;
                } else if (
                  typeof data === "string" &&
                  data.includes('"fileUrl":')
                ) {
                  const match = data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
                  if (match) {
                    actualDownloadUrl = match[1];
                    resolved = true;
                  }
                }
              }
            } catch (err) {
              console.warn("Poll attempt failed", err);
            }

            if (!resolved) {
              pollCount++;
              await new Promise((r) => setTimeout(r, 1500)); // Faster polling
            }
          }
          if (!resolved) {
            throw new Error("Unable to resolve download URL");
          }
        }
      } catch (e) {
        console.error("Worker resolve fatal failure", e);
        throw e;
      }
    }

    const isYtmp3GG =
      actualDownloadUrl.includes("ytmp3.gg") ||
      actualDownloadUrl.includes("convert1s.com") ||
      actualDownloadUrl.includes("lilillliiillliillii.shop");

    const isYoutube =
      isYtmp3GG ||
      actualDownloadUrl.includes("ytmp3.mobi") ||
      actualDownloadUrl.includes("ytdown") ||
      actualDownloadUrl.includes("ymcdn.org") ||
      (url && (url.includes("youtube.com") || url.includes("youtu.be"))) ||
      (sourceUrl &&
        (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be")));
    const isTwitter =
      actualDownloadUrl.includes("tweeload") ||
      actualDownloadUrl.includes("twimg.com") ||
      actualDownloadUrl.includes("acxcdn.com") ||
      (url && (url.includes("twitter") || url.includes("x.com")));

    const downloadHeaders = {
      "User-Agent": getUserAgent(),
    };

    const isPixivDirect =
      actualDownloadUrl.includes("pixiv.net") ||
      actualDownloadUrl.includes("pximg.net") ||
      actualDownloadUrl.includes("pixiv.re");
    const isUgoiraCom = actualDownloadUrl.includes("ugoira");
    const isBilibili =
      actualDownloadUrl.includes("bilibili") ||
      actualDownloadUrl.includes("bilivideo") ||
      actualDownloadUrl.includes("bstarstatic") ||
      actualDownloadUrl.includes("akamaized.net") ||
      (url &&
        (url.includes("bilibili") ||
          url.includes("b23.tv") ||
          url.includes("bili.im")));

    if (
      actualDownloadUrl.includes("pindown.io") &&
      actualDownloadUrl.includes("file=")
    ) {
      try {
        const match = actualDownloadUrl.match(
          /file=(https?%3A%2F%2F[^&]+|https?:\/\/[^&]+)/i,
        );
        if (match && match[1]) {
          actualDownloadUrl = decodeURIComponent(match[1]);
        }
      } catch (e) {}
    }

    const isPinterest =
      actualDownloadUrl.includes("pindown.io") ||
      actualDownloadUrl.includes("pinimg.com") ||
      (url && (url.includes("pinterest.com") || url.includes("pin.it"))) ||
      (sourceUrl &&
        (sourceUrl.includes("pinterest.com") || sourceUrl.includes("pin.it")));

    if (isYtmp3GG) {
      downloadHeaders["Referer"] = "https://media.ytmp3.gg/";
      downloadHeaders["Origin"] = "https://media.ytmp3.gg";
    } else if (isYoutube) {
      downloadHeaders["Referer"] = "https://ytmp3.mobi/";
      if (
        actualDownloadUrl.includes("ymcdn.org") ||
        actualDownloadUrl.includes("ytmp3.mobi")
      ) {
        downloadHeaders["Origin"] = "https://ytmp3.mobi";
      }
    }
    if (isPixivDirect) downloadHeaders["Referer"] = "https://www.pixiv.net/";
    if (isUgoiraCom) downloadHeaders["Referer"] = "https://ugoira.com/";
    if (isBilibili) {
      downloadHeaders["Referer"] =
        (sourceUrl || url || "").includes("bilibili.com") ||
        (sourceUrl || url || "").includes("b23.tv") ||
        actualDownloadUrl.includes("bilivideo.com")
          ? "https://www.bilibili.com/"
          : "https://www.bilibili.tv/";
    }
    if (isPinterest) {
      if (actualDownloadUrl.includes("pindown.io")) {
        downloadHeaders["Referer"] = "https://pindown.io/";
      } else {
        downloadHeaders["Referer"] = "https://www.pinterest.com/";
      }
    }
    if (isTwitter) {
      if (actualDownloadUrl.includes("twimg.com")) {
        downloadHeaders["Referer"] = "https://twitter.com/";
      } else {
        downloadHeaders["Referer"] = "https://tweeload.com/";
      }
    }
    if (
      actualDownloadUrl.includes("spotidown") ||
      (url && url.includes("spotify"))
    ) {
      downloadHeaders["Referer"] = "https://spotidown.app/";
      downloadHeaders["Origin"] = "https://spotidown.app";
      downloadHeaders["Accept"] = "*/*";
    }
    if (actualDownloadUrl.includes("soundloaders")) {
      downloadHeaders["Referer"] = "https://soundloaders.app/";
      downloadHeaders["Origin"] = "https://soundloaders.app";
      downloadHeaders["Accept"] = "*/*";
    }
    if (actualDownloadUrl.includes("aplmate")) {
      downloadHeaders["Referer"] = "https://aplmate.com/";
    }

    let savedFile;
    let attempts = 0;
    const isAutoRetry = localStorage.getItem("mori_auto_retry") !== "false";
    const customMaxRetry = parseInt(
      localStorage.getItem("mori_max_retry") || "3",
      10,
    );
    const maxAttempts = isAutoRetry ? customMaxRetry : 1;

    if (tauriInvoke) {
      try {
        const desktopRes = await tauriInvoke("tauri_download_file", {
          url: actualDownloadUrl,
          filename: fileName,
          folder: targetFolder || "",
          headers: downloadHeaders || {},
        });
        if (desktopRes && desktopRes.status) {
          savedFile = { path: desktopRes.path, uri: desktopRes.uri };
        }
      } catch (tErr) {
        console.warn("Tauri native download failed:", tErr);
        throw new Error(
          typeof tErr === "string"
            ? tErr
            : tErr?.message || JSON.stringify(tErr),
        );
      }
    }

    if (!savedFile && Filesystem) {
      for (const dir of directoriesToTry) {
        if (savedFile) break;
        attempts = 0;
        while (attempts < maxAttempts && !savedFile) {
          // Check cancel before each attempt
          if (window._moriDownloadCancelled) break;
          attempts++;
          try {
            if (attempts > 1) {
              await new Promise((r) => setTimeout(r, 1000));
            }
            const isBypassSsl =
              localStorage.getItem("mori_bypass_ssl") === "true";
            const isForceIpv4 =
              localStorage.getItem("mori_force_ipv4") === "true";

            const tempFileName = `${fileName}.tmp`;
            const dlOpts = {
              url: actualDownloadUrl,
              path: fullPath + "/" + tempFileName,
              directory: dir,
              progress: true,
              headers: downloadHeaders,
            };
            if (isBypassSsl) dlOpts.disableSSLValidation = true;
            if (isForceIpv4) dlOpts.ipv4Only = true;

            const tempSaved = await Filesystem.downloadFile(dlOpts);
            if (tempSaved) {
              // Rename .tmp to actual file name atomically on completion
              try {
                await Filesystem.rename({
                  from: fullPath + "/" + tempFileName,
                  to: fullPath + "/" + fileName,
                  directory: dir,
                });
                savedFile = { path: fullPath + "/" + fileName };
              } catch (renameErr) {
                // Fallback copy if rename unsupported
                await Filesystem.copy({
                  from: fullPath + "/" + tempFileName,
                  to: fullPath + "/" + fileName,
                  directory: dir,
                });
                await Filesystem.deleteFile({
                  path: fullPath + "/" + tempFileName,
                  directory: dir,
                }).catch(() => {});
                savedFile = { path: fullPath + "/" + fileName };
              }
              successfulDir = dir;
            }
          } catch (dlErr) {
            console.warn(
              `Download attempt ${attempts} on ${dir} failed:`,
              dlErr,
            );
            // Clean up left over .tmp file on error
            if (Filesystem) {
              await Filesystem.deleteFile({
                path: fullPath + "/" + `${fileName}.tmp`,
                directory: dir,
              }).catch(() => {});
            }
            if (attempts >= maxAttempts && CapacitorHttp) {
              try {
                const httpRes = await CapacitorHttp.get({
                  url: actualDownloadUrl,
                  responseType: "blob",
                  headers: downloadHeaders,
                  connectTimeout: 20000,
                  readTimeout: 30000,
                });
                if (
                  httpRes &&
                  httpRes.status === 200 &&
                  httpRes.data &&
                  typeof httpRes.data === "string"
                ) {
                  await Filesystem.writeFile({
                    path: fullPath + "/" + fileName,
                    data: httpRes.data,
                    directory: dir,
                  });
                  savedFile = { path: fullPath + "/" + fileName };
                  successfulDir = dir;
                }
              } catch (fallbackErr) {
                console.warn(
                  `Http blob fallback on ${dir} failed:`,
                  fallbackErr,
                );
              }
            }
          }
        }
      }
    }

    if (!savedFile) {
      if (window._moriDownloadCancelled) {
        if (Filesystem) {
          for (const dir of directoriesToTry) {
            await Filesystem.deleteFile({
              path: fullPath + "/" + `${fileName}.tmp`,
              directory: dir,
            }).catch(() => {});
          }
        }
        if (!window._moriPlaylistDownloading) {
          cancelDownloadProgressToast();
        } else {
          const lingering = document.querySelectorAll(
            ".download-progress-toast",
          );
          lingering.forEach((el) => el.remove());
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalContent;
        }
        if (progressContainer) progressContainer.classList.add("hidden");
        return;
      }
      // Clean up any remaining .tmp files across directories
      if (Filesystem) {
        for (const dir of directoriesToTry) {
          await Filesystem.deleteFile({
            path: fullPath + "/" + `${fileName}.tmp`,
            directory: dir,
          }).catch(() => {});
        }
      }
      throw new Error(
        translations[currentLang]["toast-download-failed"] || "Download failed",
      );
    }

    if (window._moriActiveSimInterval) {
      clearInterval(window._moriActiveSimInterval);
      window._moriActiveSimInterval = null;
    }

    if (window._moriDownloadCancelled) {
      // File may have been partially/fully written — delete it
      if (Filesystem && savedFile) {
        for (const dir of directoriesToTry) {
          await Filesystem.deleteFile({
            path: savedFile.path,
            directory: dir,
          }).catch(() => {});
        }
      }
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
      return;
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

    // Trigger Haptic & Sound Feedback
    triggerHaptic("success");
    if (!window._moriPlaylistDownloading) {
      playCompletionSound();
      autoClearInputBox();
    }

    // Resolve absolute URI for gallery and preview
    let savedUri = savedFile.uri || savedFile.path;
    if (
      !savedUri.startsWith("file://") &&
      !savedUri.startsWith("_capacitor_file_") &&
      window.Capacitor
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

    // Trigger Android MediaScanner so file appears immediately in Android Gallery
    if (window.MoriMainBridge?.scanMediaFile) {
      try {
        window.MoriMainBridge.scanMediaFile(savedFile.path || savedUri);
      } catch (_) {}
    }

    // Morph progress toast into Saved confirmation
    const completeTitle =
      translations[currentLang]["toast-download-complete"] ||
      "Download Complete";
    const dismissMs = window._moriPlaylistDownloading ? 1200 : 3000;
    completeDownloadProgressToast(
      completeTitle,
      `/Download/${targetFolder}`,
      dismissMs,
    );

    // Trigger System Tray Notification when download finishes
    if (
      !window._moriPlaylistDownloading &&
      window.MoriMainBridge?.showCompleteNotification
    ) {
      try {
        window.MoriMainBridge.showCompleteNotification(
          effectiveTitle,
          `/Download/${targetFolder}/${fileName}`,
        );
      } catch (e) {}
    }

    setTimeout(() => {
      if (btn && !window._moriPlaylistDownloading) {
        btn.disabled = false;
        const b = btn.querySelector(".dl-badge");
        if (b) {
          b.textContent =
            translations[currentLang]["label-download"] || "DOWNLOAD";
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
        translations[currentLang]["toast-connection-lost"] ||
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
      } catch (e) {}
    }

    if (btn) {
      btn.disabled = false;
      const b = btn.querySelector(".dl-badge");
      if (b) {
        if (window._moriPlaylistDownloading) {
          b.textContent = "FAILED";
          b.style.backgroundColor = "var(--color-danger, #ef4444)";
          b.style.color = "#ffffff";
        } else {
          b.textContent =
            translations[currentLang]["label-download"] || "DOWNLOAD";
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
        } catch (e) {}
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
