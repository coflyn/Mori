// download.js — main download flow (analyze + batch download)
import { translations } from "../i18n/index.js";
import { convertImagesToPdf } from "../utils/pdfHelper.js";
import {
  Filesystem,
  showToast,
  cleanUrl,
  handleScrapeError,
  checkWifiOnlyGuard,
  getNetworkStatus,
  autoClearInputBox,
} from "../utils/index.js";
import { startNativeDownload, renderResult } from "../ui.js";
import { showConfirm, hideConfirm } from "./modals.js";
import { saveToHistory } from "./history.js";
import { extractBatchUrls, analyzeUrlSilent } from "./batchManager.js";
import {
  setTikTokSource,
  scrapeTikTok,
  setInstagramSource,
  scrapeInstagram,
  setYouTubeSource,
  scrapeYouTube,
  setTwitterSource,
  scrapeTwitter,
  setSpotifySource,
  scrapeSpotify,
  scrapePinterest,
  scrapeAppleMusic,
  scrapeFacebook,
  scrapeRedNote,
  scrapeDouyin,
  scrapeBilibili,
  scrapeThreads,
  scrapeBandcamp,
  scrapePixiv,
} from "../scrapers/index.js";
import {
  decodeHtmlEntities,
  isBatchMode,
  batchUrlInput,
  batchModalOverlay,
  batchProgressList,
  batchModalCounter,
  batchDownloadAllBtn,
  resultSection,
  loader,
  downloadBtn,
  urlInput,
  currentLang,
  currentSlideIndex,
  slideData,
  setCurrentSlideIndex,
  setSlideData,
  confirmTitle,
  confirmMessage,
  confirmOverlay,
  okConfirmBtn,
  cancelConfirmBtn,
  updateGreeting,
} from "./core.js";

downloadBtn.addEventListener("click", async () => {
  if (isBatchMode) {
    const rawBatchText = batchUrlInput ? batchUrlInput.value : "";
    const batchUrls = extractBatchUrls(rawBatchText);

    if (batchUrls.length === 0) {
      showToast(
        translations[currentLang]["toast-no-batch-urls"] ||
          "No valid URLs found in text",
      );
      return;
    }

    const preferServer = localStorage.getItem("mori_prefer_server") || "auto";

    if (batchModalOverlay && batchProgressList) {
      batchProgressList.innerHTML = "";
      if (batchModalCounter) {
        batchModalCounter.textContent = `0 / ${batchUrls.length}`;
      }
      if (batchDownloadAllBtn) batchDownloadAllBtn.classList.add("hidden");
      batchModalOverlay.classList.remove("hidden");

      const batchResults = [];
      let completedCount = 0;

      // Render initial pending queue list
      batchUrls.forEach((bUrl, idx) => {
        const itemEl = document.createElement("div");
        itemEl.className = "batch-item";
        itemEl.id = `batchItem_${idx}`;
        itemEl.innerHTML = `
          <div class="batch-item-info">
            <div class="batch-item-title">Link ${idx + 1}</div>
            <div class="batch-item-url">${bUrl}</div>
          </div>
          <div class="batch-item-status pending">PENDING</div>
        `;
        batchProgressList.appendChild(itemEl);
      });

      // Execute sequential analysis
      for (let i = 0; i < batchUrls.length; i++) {
        const bUrl = batchUrls[i];
        const statusEl = document.querySelector(
          `#batchItem_${i} .batch-item-status`,
        );
        const titleEl = document.querySelector(
          `#batchItem_${i} .batch-item-title`,
        );

        if (statusEl) {
          statusEl.className = "batch-item-status analyzing";
          statusEl.textContent = "ANALYZING...";
        }

        const data = await analyzeUrlSilent(bUrl, preferServer);
        completedCount++;
        if (batchModalCounter) {
          batchModalCounter.textContent = `${completedCount} / ${batchUrls.length}`;
        }

        if (data && data.status) {
          const decodedTitle = decodeHtmlEntities(
            data.result?.title || "Media File",
          );
          batchResults.push({ url: bUrl, data });
          if (titleEl) {
            titleEl.textContent = decodedTitle;
          }
          if (statusEl) {
            statusEl.className = "batch-item-status success";
            statusEl.textContent = "READY";
          }

          // Save to history automatically (each batch item saved as an individual separate entry)
          if (localStorage.getItem("mori_incognito") !== "true") {
            const history = JSON.parse(
              localStorage.getItem("mori_history") || "[]",
            );
            const newHistoryItem = {
              id: Date.now() + i + Math.floor(Math.random() * 1000),
              url: bUrl,
              sourceUrl: data.result.sourceUrl || bUrl,
              title: decodedTitle,
              author: data.result.author || "Creator",
              thumbnail: data.result.thumbnail || "",
              downloads: data.result.downloads || [],
              date: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              timestamp: Date.now() + i,
            };

            history.unshift(newHistoryItem);
            localStorage.setItem("mori_history", JSON.stringify(history));
            if (typeof updateGreeting === "function") updateGreeting();
          }
        } else {
          if (statusEl) {
            if (data && data.isPlaylist) {
              statusEl.className = "batch-item-status skipped";
              statusEl.textContent = "SKIPPED (PLAYLIST)";
            } else {
              statusEl.className = "batch-item-status error";
              statusEl.textContent = "FAILED";
            }
          }
        }
      }

      if (batchResults.length > 0 && batchDownloadAllBtn) {
        const dlAllText =
          translations[currentLang]["batch-download-all"] || "DOWNLOAD ALL";
        batchDownloadAllBtn.textContent = `${dlAllText} (${batchResults.length})`;
        batchDownloadAllBtn.classList.remove("hidden");

        batchDownloadAllBtn.onclick = async () => {
          batchDownloadAllBtn.disabled = true;
          const batchPhotoMode =
            localStorage.getItem("mori_batch_photo_mode") || "all";

          for (let i = 0; i < batchResults.length; i++) {
            const item = batchResults[i];
            const idx = batchUrls.indexOf(item.url);
            const statusEl = document.querySelector(
              `#batchItem_${idx} .batch-item-status`,
            );
            if (statusEl) {
              statusEl.className = "batch-item-status downloading";
              statusEl.textContent = "DOWNLOADING...";
            }

            const downloadsList = item.data.result?.downloads || [];
            const itemTitle = decodeHtmlEntities(
              item.data.result?.title || "Media",
            );

            if (downloadsList.length > 0) {
              const isVideoPost = downloadsList.some(
                (d) =>
                  /video/i.test(d.type) ||
                  /\.mp4/i.test(d.url) ||
                  d.type === "MP4",
              );

              if (isVideoPost) {
                // Video posts (TikTok, Reels, Shorts, etc.) -> download primary video only
                const primaryVideo = downloadsList[0];
                await startNativeDownload(
                  primaryVideo.url,
                  primaryVideo.type,
                  itemTitle,
                  null,
                  item.url,
                );
              } else {
                // Photo Carousel / Slideshow posts -> apply Batch Photo Mode
                if (batchPhotoMode === "first") {
                  const dlObj = downloadsList[0];
                  await startNativeDownload(
                    dlObj.url,
                    dlObj.type,
                    itemTitle,
                    null,
                    item.url,
                  );
                } else if (batchPhotoMode === "pdf") {
                  const imageItems = downloadsList.filter(
                    (d) =>
                      /image|photo|jpg|png|webp/i.test(d.type) ||
                      /\.(jpg|jpeg|png|webp)/i.test(d.url),
                  );

                  if (imageItems.length > 1) {
                    try {
                      const imageUrls = imageItems.map((img) => img.url);
                      const pdfBuffer = await convertImagesToPdf(imageUrls);
                      const sanitizedTitle =
                        itemTitle
                          .replace(/[\\/:*?"<>|#%&{}[\]@$^+=~`';,]/g, "")
                          .trim()
                          .substring(0, 60) || "Mori_Batch_Album";

                      const pdfFileName = `${sanitizedTitle}.pdf`;

                      if (
                        window.Capacitor?.isNativePlatform?.() &&
                        Filesystem
                      ) {
                        const base64Pdf = btoa(
                          pdfBuffer.reduce(
                            (acc, byte) => acc + String.fromCharCode(byte),
                            "",
                          ),
                        );
                        await Filesystem.writeFile({
                          path: `Download/Mori/${pdfFileName}`,
                          directory: "EXTERNAL_STORAGE",
                          data: base64Pdf,
                          recursive: true,
                        }).catch(() => {
                          return Filesystem.writeFile({
                            path: `Download/Mori/${pdfFileName}`,
                            directory: "DOCUMENTS",
                            data: base64Pdf,
                            recursive: true,
                          });
                        });
                      } else {
                        const blob = new Blob([pdfBuffer], {
                          type: "application/pdf",
                        });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = pdfFileName;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }
                    } catch (pdfErr) {
                      console.warn(
                        "PDF generation failed, falling back to all photos download:",
                        pdfErr,
                      );
                      for (let dIdx = 0; dIdx < downloadsList.length; dIdx++) {
                        const dlObj = downloadsList[dIdx];
                        const titleWithIdx =
                          downloadsList.length > 1
                            ? `${itemTitle}_${dIdx + 1}`
                            : itemTitle;
                        await startNativeDownload(
                          dlObj.url,
                          dlObj.type,
                          titleWithIdx,
                          null,
                          item.url,
                        );
                      }
                    }
                  } else {
                    const dlObj = downloadsList[0];
                    await startNativeDownload(
                      dlObj.url,
                      dlObj.type,
                      itemTitle,
                      null,
                      item.url,
                    );
                  }
                } else {
                  // "all" (Default): Download all slide photos in carousel
                  for (let dIdx = 0; dIdx < downloadsList.length; dIdx++) {
                    const dlObj = downloadsList[dIdx];
                    const titleWithIdx =
                      downloadsList.length > 1
                        ? `${itemTitle}_${dIdx + 1}`
                        : itemTitle;
                    await startNativeDownload(
                      dlObj.url,
                      dlObj.type,
                      titleWithIdx,
                      null,
                      item.url,
                    );
                  }
                }
              }
            }

            if (statusEl) {
              statusEl.className = "batch-item-status completed";
              statusEl.textContent = "SAVED";
            }
          }
          batchDownloadAllBtn.disabled = false;
          showToast(
            translations[currentLang]["label-download-complete"] ||
              "Batch download complete!",
          );
        };
      }
    }
    return;
  }

  const url = urlInput.value.trim();
  if (!url) return;

  // Wi-Fi Only Check
  if (!(await checkWifiOnlyGuard())) return;

  // Cellular Data Warning Guard Check
  const isCellularWarning =
    localStorage.getItem("mori_cellular_warning") === "true";
  if (isCellularWarning) {
    const netStatus = await getNetworkStatus();
    if (netStatus.connectionType === "cellular") {
      const confirmed = await new Promise((resolve) => {
        showConfirm(
          "Cellular Data Warning",
          translations[currentLang]["msg-cellular-warning"] ||
            "You are connected to Cellular Data. Proceed with media download?",
          () => resolve(true),
          () => resolve(false),
        );
      });
      if (!confirmed) return;
    }
  }

  const phrases = translations[currentLang]["loader-phrases"];
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const loaderText = loader.querySelector("p");
  if (loaderText) loaderText.textContent = randomPhrase;

  const supportedSection = document.querySelector(".supported-section");
  resultSection.classList.add("hidden");
  // Hide supportedSection when starting a download/preview
  if (supportedSection) supportedSection.classList.add("hidden");

  // Stop any previous media playing in background
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.src = "";
    v.load();
  });

  loader.classList.remove("hidden");
  downloadBtn.disabled = true;
  downloadBtn.textContent = translations[currentLang]["btn-processing"];

  try {
    let data;
    const preferServer = localStorage.getItem("mori_prefer_server") || "ask";
    if (url.includes("tiktok.com")) {
      if (preferServer === "server1") setTikTokSource("tiktokio");
      else if (preferServer === "server2") setTikTokSource("snaptik");
      else setTikTokSource(null);
      data = await scrapeTikTok(url);
      if (data && data.requireSource) {
        confirmTitle.textContent = "Choose Server";
        confirmMessage.textContent =
          "Server 1: TikTokIO (HD Video · MP3 · Photo Slideshow)\nServer 2: SnapTik (HD/MP4 Video · Photo Slideshow)";
        if (cancelConfirmBtn) cancelConfirmBtn.textContent = "SERVER 2";
        if (okConfirmBtn) {
          okConfirmBtn.textContent = "SERVER 1";
          okConfirmBtn.style.color = "var(--primary)";
        }
        confirmOverlay.classList.remove("hidden");
        confirmOverlay.style.display = "flex";
        const chosen = await new Promise((resolve) => {
          confirmOverlay._onDismissOutside = () => {
            hideConfirm();
            resolve("tiktokio");
          };
          okConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("tiktokio");
          };
          cancelConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("snaptik");
          };
        });
        setTikTokSource(chosen);
        data = await scrapeTikTok(url);
      }
    } else if (url.includes("instagram.com")) {
      if (preferServer === "server1") setInstagramSource("indown");
      else if (preferServer === "server2") setInstagramSource("downreels");
      else setInstagramSource(null);
      data = await scrapeInstagram(url);
      if (data && data.requireSource) {
        confirmTitle.textContent = "Choose Server";
        confirmMessage.textContent =
          "Server 1: InDown (Reels, Posts & Photos)\nServer 2: DownReels (Reels, Posts & Photos)";
        if (cancelConfirmBtn) cancelConfirmBtn.textContent = "SERVER 2";
        if (okConfirmBtn) {
          okConfirmBtn.textContent = "SERVER 1";
          okConfirmBtn.style.color = "var(--primary)";
        }
        confirmOverlay.classList.remove("hidden");
        confirmOverlay.style.display = "flex";
        const chosen = await new Promise((resolve) => {
          confirmOverlay._onDismissOutside = () => {
            hideConfirm();
            resolve("indown");
          };
          okConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("indown");
          };
          cancelConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("downreels");
          };
        });
        setInstagramSource(chosen);
        data = await scrapeInstagram(url);
      }
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      if (preferServer === "server1") setYouTubeSource("gg");
      else if (preferServer === "server2") setYouTubeSource("mobi");
      else setYouTubeSource(null);
      data = await scrapeYouTube(url);
      if (data && data.requireSource) {
        confirmTitle.textContent = "Choose Server";
        confirmMessage.textContent =
          "Server 1: YTMP3.gg (Multi Resolution 1080p - 360p + MP3)\nServer 2: YTMP3.mobi (Fast & Stable MP4 / MP3)";
        if (cancelConfirmBtn) cancelConfirmBtn.textContent = "SERVER 2";
        if (okConfirmBtn) {
          okConfirmBtn.textContent = "SERVER 1";
          okConfirmBtn.style.color = "var(--primary)";
        }
        confirmOverlay.classList.remove("hidden");
        confirmOverlay.style.display = "flex";
        const chosen = await new Promise((resolve) => {
          confirmOverlay._onDismissOutside = () => {
            hideConfirm();
            resolve("gg");
          };
          okConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("gg");
          };
          cancelConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("mobi");
          };
        });
        setYouTubeSource(chosen);
        data = await scrapeYouTube(url);
      }
    } else if (
      url.includes("twitter.com") ||
      url.includes("x.com") ||
      url.includes("fixupx.com") ||
      url.includes("fxtwitter.com") ||
      url.includes("vxtwitter.com")
    ) {
      if (preferServer === "server1") setTwitterSource("tweeload");
      else if (preferServer === "server2") setTwitterSource("tvd");
      else setTwitterSource(null);
      data = await scrapeTwitter(url);
      if (data && data.requireSource) {
        confirmTitle.textContent = "Choose Server";
        confirmMessage.textContent =
          "Server 1: TweeLoad (Multi Resolution HD / SD Video)\nServer 2: TVD (Multi Resolution HD / SD Video)";
        if (cancelConfirmBtn) cancelConfirmBtn.textContent = "SERVER 2";
        if (okConfirmBtn) {
          okConfirmBtn.textContent = "SERVER 1";
          okConfirmBtn.style.color = "var(--primary)";
        }
        confirmOverlay.classList.remove("hidden");
        confirmOverlay.style.display = "flex";
        const chosen = await new Promise((resolve) => {
          confirmOverlay._onDismissOutside = () => {
            hideConfirm();
            resolve("tweeload");
          };
          okConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("tweeload");
          };
          cancelConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("tvd");
          };
        });
        setTwitterSource(chosen);
        data = await scrapeTwitter(url);
      }
    } else if (url.includes("spotify.com")) {
      if (preferServer === "server1") setSpotifySource("spotidown");
      else if (preferServer === "server2") setSpotifySource("soundloaders");
      else setSpotifySource(null);
      data = await scrapeSpotify(url);
      if (data && data.requireSource) {
        confirmTitle.textContent = "Choose Server";
        confirmMessage.textContent =
          "Server 1: SpotiDown (Playlist & Single Track)\nServer 2: SoundLoaders (Playlist & Single Track)";
        if (cancelConfirmBtn) cancelConfirmBtn.textContent = "SERVER 2";
        if (okConfirmBtn) {
          okConfirmBtn.textContent = "SERVER 1";
          okConfirmBtn.style.color = "var(--primary)";
        }
        confirmOverlay.classList.remove("hidden");
        confirmOverlay.style.display = "flex";
        const chosen = await new Promise((resolve) => {
          confirmOverlay._onDismissOutside = () => {
            hideConfirm();
            resolve("spotidown");
          };
          okConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("spotidown");
          };
          cancelConfirmBtn.onclick = () => {
            confirmOverlay._onDismissOutside = null;
            hideConfirm();
            resolve("soundloaders");
          };
        });
        setSpotifySource(chosen);
        data = await scrapeSpotify(url);
      }
    } else if (url.includes("pinterest.com") || url.includes("pin.it")) {
      data = await scrapePinterest(url);
    } else if (url.includes("music.apple.com")) {
      data = await scrapeAppleMusic(url);
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      data = await scrapeFacebook(url);
    } else if (
      url.includes("xiaohongshu.com") ||
      url.includes("rednote.com") ||
      url.includes("xhslink.com") ||
      url.includes("xhslink.cn")
    ) {
      data = await scrapeRedNote(url);
    } else if (url.includes("douyin.com")) {
      data = await scrapeDouyin(url);
    } else if (
      url.includes("bilibili.com") ||
      url.includes("b23.tv") ||
      url.includes("bili.im") ||
      url.includes("bilibili.tv")
    ) {
      data = await scrapeBilibili(url);
    } else if (url.includes("threads.net") || url.includes("threads.com")) {
      data = await scrapeThreads(url);
    } else if (url.includes("bandcamp.com")) {
      data = await scrapeBandcamp(url);
    } else if (url.includes("pixiv.net")) {
      data = await scrapePixiv(url);
    } else {
      data = { status: false, message: "URL not supported yet." };
    }

    if (data && data.status) {
      const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
      const existing = history.find(
        (item) => cleanUrl(item.url) === cleanUrl(url),
      );
      if (existing && existing.localFiles && existing.localFiles.length > 0) {
        for (const dl of data.result.downloads) {
          const match = existing.localFiles.find((lf) => lf.type === dl.type);
          if (match && Filesystem) {
            try {
              const uriObj = await Filesystem.getUri({
                path: match.path,
                directory: "EXTERNAL_STORAGE",
              }).catch(() => null);
              if (uriObj && uriObj.uri) {
                dl.localUrl = window.Capacitor.convertFileSrc(uriObj.uri);
              }
            } catch (e) {
              console.warn(
                "Local file listed in history but not found on disk:",
                match.path,
              );
            }
          }
        }
      }

      saveToHistory(data.result, url);
      const state = renderResult(data.result, url);
      if (state) {
        setSlideData(state.slideData || []);
        setCurrentSlideIndex(state.currentSlideIndex || 0);
      }
      loader.classList.add("hidden");

      // Auto-Clear Input Box
      autoClearInputBox();

      // Auto Download Link if enabled
      if (localStorage.getItem("mori_auto_download") === "true") {
        setTimeout(() => {
          const dlBtn = document.querySelector(
            "#resultSection .dl-item, #resultSection .btn-download, #resultSection .dl-btn, #resultSection [data-url]",
          );
          if (dlBtn) dlBtn.click();
        }, 500);
      }
    } else {
      const errMsg = data?.message || "Unknown error occurred.";
      handleScrapeError(data, data?.statusCode);
      if (loaderText)
        loaderText.textContent =
          translations[currentLang]["label-error"] + ": " + errMsg;
      setTimeout(() => loader.classList.add("hidden"), 3000);
      if (supportedSection) supportedSection.classList.remove("hidden");
    }
  } catch (err) {
    console.error("[CRITICAL] Download Flow Error:", err);
    if (loaderText)
      loaderText.textContent =
        translations[currentLang]["label-fatal"] + ": " + err.message;
    showToast(
      translations[currentLang]["label-fatal-error"] + ": " + err.message,
    );
    setTimeout(() => loader.classList.add("hidden"), 5000);
    if (supportedSection) supportedSection.classList.remove("hidden");
  }

  downloadBtn.disabled = false;
  downloadBtn.textContent = translations[currentLang]["btn-analyze"];
});
