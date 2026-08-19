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
  playCompletionSound,
  requestWakeLock,
  releaseWakeLock,
  checkWifiOnlyGuard,
  autoClearInputBox,
} from "../utils/index.js";
import { currentLang } from "../modules/core.js";

export async function startNativeDownload(url, type, title, btn, sourceUrl) {
  if (!url || typeof url !== "string" || !url.trim()) {
    showToast(
      translations[currentLang]["label-error"] + ": Invalid download link",
    );
    return;
  }

  if (!(await checkWifiOnlyGuard())) return;

  if (
    url.startsWith("file://") ||
    url.includes("_capacitor_file_") ||
    url.startsWith("content://")
  ) {
    showToast("File is already stored locally");
    return;
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
    return;
  }

  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const originalContent = btn ? btn.innerHTML : "";

  // Request permissions for Android FIRST before showing progress toast (non-blocking for Android 13+)
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

  showDownloadProgressToast(platformLabel, type);
  let progressListener = null;
  let currentProgressVal = 0;
  const updateProgress = (pct, statusText) => {
    if (typeof pct === "number" && !isNaN(pct)) {
      const targetPct = Math.min(
        99,
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

    // Acquire Wake Lock if enabled
    requestWakeLock();

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

    // Smooth adaptive progress animation up to 95% until download completes
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

    const isAudio = /mp3|audio|128k|48k|m4a/i.test(type);
    const isImage =
      /image|photo|jpg|png|webp/i.test(type) ||
      /\.(jpg|jpeg|png|webp)/i.test(url);
    let ext = isAudio ? "MP3" : isImage ? "JPG" : "MP4";
    if (/\.png(\?|$)/i.test(url) || type.toLowerCase().includes("png"))
      ext = "PNG";
    if (/\.webp(\?|$)/i.test(url) || type.toLowerCase().includes("webp"))
      ext = "WEBP";
    if (/\.mp4(\?|$)/i.test(url) || type.toLowerCase().includes("video"))
      ext = "MP4";

    const cleanTypeLabel = (type || "")
      .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
      .trim();
    const isTrackType = /^\d+\.\s+/.test(cleanTypeLabel);

    let effectiveTitle = title || "Mori Media";
    if (isTrackType) {
      effectiveTitle = cleanTypeLabel.replace(/^\d+\.\s+/, "").trim() || cleanTypeLabel;
    }

    let sanitizedTitle = effectiveTitle
      .replace(/[\\/:*?"<>|#%&{}[\]()@$^+=~`';,]/g, "")
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

    const videoSubfolder = localStorage.getItem("mori_download_path") || "Mori";
    const musicSubfolder =
      localStorage.getItem("mori_music_path") || "Mori/Music";
    const targetFolder = isAudio ? musicSubfolder : videoSubfolder;
    let fullPath = isAudio
      ? `Download/${musicSubfolder}`
      : `Download/${videoSubfolder}`;

    // Auto-Categorize Subfolder per Platform
    if (localStorage.getItem("mori_auto_folder") === "true") {
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

      // Ensure unique filename if file already exists on disk
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
          const dotIdx = fileName.lastIndexOf(".");
          const baseName =
            dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
          let counter = 1;
          let newFileName = `${baseName}_${counter}.${ext}`;
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
            newFileName = `${baseName}_${counter}.${ext}`;
          }
        }
      } catch (e) {}
    }

    if (btn) {
      btn.innerHTML =
        translations[currentLang]["btn-processing"] || "Processing...";
    }

    let actualDownloadUrl = url;
    const needsResolving =
      (url.includes("ytdown") ||
        url.includes("worker") ||
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
          const res = await CapacitorHttp.post({
            url: "https://aplmate.com/action/track",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
              "X-Requested-With": "XMLHttpRequest",
              Referer: "https://aplmate.com/",
              Origin: "https://aplmate.com",
            },
            data: payloadStr,
          });
          let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
          if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
          const parser = new DOMParser();
          const doc = parser.parseFromString(dlHtml, "text/html");
          let foundLink = "";
          doc.querySelectorAll("a").forEach((a) => {
            const href = a.getAttribute("href");
            const text = a.textContent.trim();
            if (
              href &&
              (href.includes("/dl?token=") || a.classList.contains("abutton"))
            ) {
              if (href.includes("ko-fi.com") || href.includes("premium.html")) return;
              if (text.toLowerCase().includes("another song")) return;
              if (!foundLink) {
                foundLink = href.startsWith("http") ? href : "https://aplmate.com" + href;
              }
            }
          });
          if (foundLink) {
            actualDownloadUrl = foundLink;
          } else {
            throw new Error("Could not resolve Apple Music download link");
          }
        } else if (url.startsWith("spotidown_resolve:")) {
          const payloadStr = url.replace("spotidown_resolve:", "");
          const res = await CapacitorHttp.post({
            url: "https://spotidown.app/action/track",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
              "X-Requested-With": "XMLHttpRequest",
              Referer: "https://spotidown.app/",
              Origin: "https://spotidown.app",
            },
            data: payloadStr,
          });
          let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
          if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
          const parser = new DOMParser();
          const doc = parser.parseFromString(dlHtml, "text/html");
          let foundLink = "";
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
          if (foundLink) {
            actualDownloadUrl = foundLink;
          } else {
            throw new Error("Could not resolve SpotiDown download link");
          }
        } else if (url.startsWith("soundloaders_resolve:")) {
          const parts = url.replace("soundloaders_resolve:", "").split("|||");
          const dataVal = parts[0];
          const tokenVal = parts[1];
          const BASE = "https://soundloaders.app";
          const res = await CapacitorHttp.post({
            url: BASE + "/action/tracks",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
              "X-Requested-With": "XMLHttpRequest",
              Referer: BASE + "/",
              Origin: BASE,
            },
            data: "data=" + encodeURIComponent(dataVal) + "&track_token=" + encodeURIComponent(tokenVal),
          });
          let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          let dlHtml = dd?.html || "";
          const match = dlHtml.match(/href=["'](https:\/\/dl\.soundloaders\.app\/cdnv1\?token=[^"']+)["']/);
          if (match && match[1]) {
            actualDownloadUrl = match[1];
          } else {
            throw new Error("Could not resolve Soundloaders download link");
          }
        } else {
        // Handle SnapSave tokens or general worker resolves
        let resolved = false;
        let pollCount = 0;
        const maxPolls = 15;

        while (!resolved && pollCount < maxPolls) {
          if (btn) {
            btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} ${pollCount > 0 ? `(${pollCount})` : ""}</div>`;
          }
          updateProgress(
            Math.min(90, 10 + pollCount * 5),
            `Resolving URL... (${pollCount + 1}/${maxPolls})`,
          );

          try {
            const statusRes = await CapacitorHttp.get({
              url: actualDownloadUrl,
            });

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

    const isYoutube =
      actualDownloadUrl.includes("ytmp3.mobi") ||
      actualDownloadUrl.includes("ytdown");
    const isTwitter =
      actualDownloadUrl.includes("tweeload") ||
      actualDownloadUrl.includes("twimg.com") ||
      actualDownloadUrl.includes("acxcdn.com") ||
      (url && (url.includes("twitter") || url.includes("x.com")));

    const downloadHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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

    if (isYoutube) downloadHeaders["Referer"] = "https://ytmp3.mobi/";
    if (isPixivDirect) downloadHeaders["Referer"] = "https://www.pixiv.net/";
    if (isUgoiraCom) downloadHeaders["Referer"] = "https://ugoira.com/";
    if (isBilibili) downloadHeaders["Referer"] = "https://www.bilibili.tv/";
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

    let savedFile;
    let attempts = 0;
    const isAutoRetry = localStorage.getItem("mori_auto_retry") !== "false";
    const maxAttempts = isAutoRetry ? 3 : 1;

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
          attempts++;
          try {
            if (attempts > 1) {
              // Silent auto-retry: retry in background while keeping progress UI at 85% / Downloading...
              await new Promise((r) => setTimeout(r, 1000));
            }
            const isBypassSsl =
              localStorage.getItem("mori_bypass_ssl") === "true";
            const isForceIpv4 =
              localStorage.getItem("mori_force_ipv4") === "true";

            const dlOpts = {
              url: actualDownloadUrl,
              path: fullPath + "/" + fileName,
              directory: dir,
              progress: true,
              headers: downloadHeaders,
            };
            if (isBypassSsl) dlOpts.disableSSLValidation = true;
            if (isForceIpv4) dlOpts.ipv4Only = true;

            savedFile = await Filesystem.downloadFile(dlOpts);
            successfulDir = dir;
          } catch (dlErr) {
            console.warn(
              `Download attempt ${attempts} on ${dir} failed:`,
              dlErr,
            );
            if (attempts >= maxAttempts && CapacitorHttp) {
              try {
                const httpRes = await CapacitorHttp.get({
                  url: actualDownloadUrl,
                  responseType: "blob",
                  headers: downloadHeaders,
                });
                if (
                  httpRes &&
                  httpRes.data &&
                  typeof httpRes.data === "string"
                ) {
                  await Filesystem.writeFile({
                    path: fullPath + "/" + fileName,
                    directory: dir,
                    data: httpRes.data,
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
      throw new Error(
        translations[currentLang]["label-error"] + ": Download failed",
      );
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
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SAVED`;
      }
    }

    // Trigger Haptic & Sound Feedback
    triggerHaptic("success");
    playCompletionSound();

    // Auto-Clear Input Box after Download
    autoClearInputBox();

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

    window.dispatchEvent(
      new CustomEvent("mori_file_saved", {
        detail: { url: sourceUrl || url, path: savedFile.path, uri: savedUri, title: effectiveTitle },
      }),
    );

    // Morph the progress toast into the Saved confirmation toast seamlessly!
    const completeTitle =
      translations[currentLang]["toast-download-complete"] ||
      "Download Complete";
    completeDownloadProgressToast(
      completeTitle,
      `/Download/${targetFolder}`,
      3000,
    );

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        const b = btn.querySelector(".dl-badge");
        if (b) {
          b.textContent = translations[currentLang]["label-download"] || "DOWNLOAD";
        } else {
          btn.innerHTML = originalContent;
        }
      }
      progressContainer?.classList.add("hidden");
    }, 2500);
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

    // Morph progress toast into Error toast seamlessly!
    failDownloadProgressToast(errorMsg, 3500);

    if (btn) {
      btn.disabled = false;
      const b = btn.querySelector(".dl-badge");
      if (b) {
        b.textContent = translations[currentLang]["label-download"] || "DOWNLOAD";
      } else {
        btn.innerHTML = originalContent;
      }
    }
    if (progressContainer) progressContainer.classList.add("hidden");
  } finally {
    releaseWakeLock();
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
